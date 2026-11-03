import * as fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LabelsService } from './labels.service.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { LabelsRepository } from './labels.repository.js';
import type { PackagingRepository } from '../packaging/packaging.repository.js';
import type { QuotationsRepository } from '../quotations/quotations.repository.js';
import type { SkydropxClient } from '../integrations/skydropx/skydropx.client.js';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

vi.mock('./label-downloader.util.js', () => ({
  savePdfFromUrl: vi.fn().mockResolvedValue('labels/BOX-01_TRK123.pdf'),
  extractAndSaveLabel: vi.fn().mockResolvedValue({
    trackingNumber: 'TRK123',
    pdfFilename: 'labels/BOX-01_TRK123.pdf',
  }),
}));

describe('LabelsService', () => {
  let labelsRepo: LabelsRepository;
  let packagingRepo: PackagingRepository;
  let quotationsRepo: QuotationsRepository;
  let skydropx: SkydropxClient;
  let service: LabelsService;

  beforeEach(() => {
    labelsRepo = {
      fetchLabels: vi.fn().mockResolvedValue([]),
      saveLabels: vi.fn().mockResolvedValue(undefined),
    } as unknown as LabelsRepository;

    packagingRepo = {
      fetchBoxes: vi.fn().mockResolvedValue([
        {
          strategy: 'MIN_BOXES',
          boxId: 'BOX-01',
          externalLengthCm: 30,
          externalWidthCm: 20,
          externalHeightCm: 15,
          actualWeightKg: 5,
          volumetricWeightKg: 1.8,
          billableWeightKg: 5,
          occupancyPercent: 80,
          containedSkus: 'SKU-1',
        },
      ]),
    } as unknown as PackagingRepository;

    quotationsRepo = {
      fetchQuotations: vi.fn().mockResolvedValue([
        {
          strategy: 'MIN_BOXES',
          boxId: 'BOX-01',
          carrier: 'Paquetexpress',
          service: 'Nacional',
          totalPriceMxn: 350,
          estimatedDays: 2,
          rateId: 'rate-uuid-1',
        },
      ]),
    } as unknown as QuotationsRepository;

    skydropx = {
      createShipment: vi.fn().mockResolvedValue({
        data: { id: 'ship-1', type: 'shipments', attributes: { carrier_name: 'Paquetexpress' } },
        included: [
          {
            type: 'packages',
            attributes: { tracking_number: 'TRK123', label_url: 'https://cdn.example.com/label.pdf' },
          },
        ],
      }),
      pollShipmentUntilReady: vi.fn(),
    } as unknown as SkydropxClient;

    const catalogRepo = {
      fetchCatalogData: vi.fn().mockResolvedValue({
        items: [{ sku: 'SKU-1', name: 'Product 1', valueMxn: 150, weightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10, quantity: 1, fragile: false, rowNumber: 2 }],
        constraints: { maxSideCm: 60, maxBoxWeightKg: 25, clearanceCm: 2, boxTareWeightKg: 0.4, volumetricFactor: 5000 },
        originAddress: { name: 'Demo Store', street1: 'Av. Juarez 100', city: 'Guadalajara', province: 'Jalisco', postalCode: '44100', countryCode: 'MX', phone: '3312345678', email: 'origen@example.com' },
        destinationAddress: { name: 'Customer', street1: 'Calle Hamburgo 50', city: 'CDMX', province: 'CDMX', postalCode: '06600', countryCode: 'MX', phone: '5512345678', email: 'destino@example.com' },
      }),
    } as unknown as CatalogRepository;

    service = new LabelsService(labelsRepo, packagingRepo, quotationsRepo, catalogRepo, skydropx);
  });

  it('generates new labels and saves them to repository', async () => {
    const result = await service.generateLabels();

    expect(result.generated).toHaveLength(1);
    expect(result.generated[0].boxId).toBe('BOX-01');
    expect(result.generated[0].trackingNumber).toBe('TRK123');
    expect(labelsRepo.saveLabels).toHaveBeenCalledTimes(1);
  });

  it('enforces idempotency and skips boxes already created with file present', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(labelsRepo.fetchLabels).mockResolvedValue([
      {
        boxId: 'BOX-01',
        carrier: 'Paquetexpress',
        service: 'Nacional',
        price: 350,
        trackingNumber: 'TRK123',
        pdfFilename: 'labels/BOX-01_TRK123.pdf',
        createdAt: '2026-11-03T00:00:00.000Z',
      },
    ]);

    const result = await service.generateLabels();

    expect(result.skipped).toHaveLength(1);
    expect(result.generated).toHaveLength(0);
    expect(skydropx.createShipment).not.toHaveBeenCalled();
    expect(labelsRepo.saveLabels).not.toHaveBeenCalled();
  });

  it('handles carrier API failures gracefully without throwing', async () => {
    vi.mocked(skydropx.createShipment).mockRejectedValue(new Error('Carrier out of credits'));

    const result = await service.generateLabels();

    expect(result.generated).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].boxId).toBe('BOX-01');
    expect(result.errors[0].error).toContain('Carrier out of credits');
  });
});
