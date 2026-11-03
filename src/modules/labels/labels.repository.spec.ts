import { describe, expect, it, vi } from 'vitest';
import { LabelsRepository } from './labels.repository.js';
import type { GoogleSheetsClient } from '../integrations/google-sheets/google-sheets.client.js';

describe('LabelsRepository', () => {
  it('parses valid rows from sheets correctly', async () => {
    const mockSheetsClient = {
      getRows: vi.fn().mockResolvedValue([
        ['BOX-01', 'DHL', 'Express', '450,50', 'TRK123', 'labels/BOX-01_TRK123.pdf', '2026-11-03T00:00:00.000Z'],
      ]),
      appendRows: vi.fn(),
    } as unknown as GoogleSheetsClient;

    const repo = new LabelsRepository(mockSheetsClient);
    const labels = await repo.fetchLabels();

    expect(labels).toHaveLength(1);
    expect(labels[0].boxId).toBe('BOX-01');
    expect(labels[0].carrier).toBe('DHL');
    expect(labels[0].price).toBe(450.5);
    expect(labels[0].trackingNumber).toBe('TRK123');
  });

  it('formats rows and appends when saving labels', async () => {
    const appendRows = vi.fn().mockResolvedValue(undefined);
    const mockSheetsClient = {
      getRows: vi.fn(),
      appendRows,
    } as unknown as GoogleSheetsClient;

    const repo = new LabelsRepository(mockSheetsClient);
    await repo.saveLabels([
      {
        boxId: 'BOX-02',
        carrier: 'FedEx',
        service: 'Standard',
        price: 320.15,
        trackingNumber: 'TRK456',
        pdfFilename: 'labels/BOX-02_TRK456.pdf',
        createdAt: '2026-11-03T00:00:00.000Z',
      },
    ]);

    expect(appendRows).toHaveBeenCalledTimes(1);
    expect(appendRows).toHaveBeenCalledWith('Guías!A:G', [
      ['BOX-02', 'FedEx', 'Standard', '320,15', 'TRK456', 'labels/BOX-02_TRK456.pdf', '2026-11-03T00:00:00.000Z'],
    ]);
  });
});
