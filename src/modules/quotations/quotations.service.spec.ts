import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ShippingAddress } from '../../interfaces/catalog.interface.js';
import type { PackedBox } from '../../interfaces/packaging.interface.js';
import type { GoogleSheetsClient } from '../integrations/google-sheets/google-sheets.client.js';
import type { SkydropxClient } from '../integrations/skydropx/skydropx.client.js';
import {
  findBestRates,
  normalizeRates,
  toAddressPayload,
  toParcelPayload,
  toSheetRows,
} from './quotation-mappers.js';
import { QuotationsRepository } from './quotations.repository.js';
import { QuotationsService } from './quotations.service.js';

describe('Quotations Module', () => {
  const originAddress: ShippingAddress = {
    name: 'Demo Store',
    street1: 'Av. Juárez 100, Col. Centro',
    city: 'Guadalajara',
    province: 'Jalisco',
    postalCode: '44100',
    countryCode: 'MX',
    phone: '3312345678',
    email: 'origen@example.com',
  };

  const sampleBox: PackedBox = {
    boxId: 'BOX-01',
    strategy: 'MIN_BOXES',
    items: [],
    internalDimensions: { lengthCm: 56, widthCm: 34, heightCm: 10 },
    externalDimensions: { lengthCm: 58.2, widthCm: 36.1, heightCm: 12.0 },
    itemsWeightKg: 10.5,
    tareWeightKg: 0.3,
    actualWeightKg: 10.8,
    volumetricWeightKg: 5.05,
    billableWeightKg: 11,
    occupancyPercent: 88.5,
  };

  describe('quotation-mappers', () => {
    it('should map address extracting colonia or fallback to city', () => {
      const payload = toAddressPayload(originAddress);
      expect(payload).toEqual({
        country_code: 'MX',
        postal_code: '44100',
        area_level1: 'Jalisco',
        area_level2: 'Guadalajara',
        area_level3: 'Centro',
      });
    });

    it('should map box to parcel with rounded values', () => {
      const parcel = toParcelPayload(sampleBox);
      expect(parcel.length).toBe(59);
      expect(parcel.width).toBe(37);
      expect(parcel.height).toBe(12);
      expect(parcel.weight).toBe(10.8);
    });

    it('should normalize rates and select cheapest, fastest, and best balance', () => {
      const rawRates = [
        {
          id: 'rate-fedex',
          success: true,
          provider_display_name: 'FedEx',
          provider_service_name: 'Express',
          total: '280.00',
          days: 1,
        },
        {
          id: 'rate-ampm',
          success: true,
          provider_display_name: 'ampm',
          provider_service_name: 'Standard',
          total: '120.00',
          days: 3,
        },
        {
          id: 'rate-sendex',
          success: true,
          provider_display_name: 'Sendex',
          provider_service_name: 'Económico',
          total: '95.00',
          days: 6,
        },
      ];

      const rates = normalizeRates(rawRates);
      const { cheapest, fastest, bestBalance } = findBestRates(rates);

      expect(cheapest?.rateId).toBe('rate-sendex');
      expect(fastest?.rateId).toBe('rate-fedex');
      expect(bestBalance?.rateId).toBe('rate-ampm');
    });

    it('should map rates to sheet rows with fallback for empty rates', () => {
      const emptyRows = toSheetRows([], 'MIN_BOXES', 'BOX-01');
      expect(emptyRows[0].status).toBe('failed');
      expect(emptyRows[0].carrier).toBe('N/A');

      const normalRows = toSheetRows(
        [
          {
            rateId: 'r-1',
            carrier: 'FedEx',
            service: 'Standard',
            totalPrice: 150,
            currency: 'MXN',
            deliveryDays: 2,
            success: true,
          },
        ],
        'MIN_BOXES',
        'BOX-01',
      );
      expect(normalRows[0].totalPriceMxn).toBe(150);
      expect(normalRows[0].carrier).toBe('FedEx');
    });
  });

  describe('QuotationsRepository', () => {
    it('should clear range and append formatted rows', async () => {
      const mockSheets = {
        clearRange: vi.fn().mockResolvedValue(undefined),
        appendRows: vi.fn().mockResolvedValue(undefined),
        getRows: vi.fn().mockResolvedValue([
          ['MIN_BOXES', 'BOX-01', 'FedEx', 'Express', '150.5', '2', 'rate-1', 'approved', ''],
        ]),
      };

      const repo = new QuotationsRepository(mockSheets as unknown as GoogleSheetsClient);
      await repo.saveQuotations([
        {
          strategy: 'MIN_BOXES',
          boxId: 'BOX-01',
          carrier: 'FedEx',
          service: 'Express',
          totalPriceMxn: 150.5,
          estimatedDays: 2,
          rateId: 'rate-1',
          status: 'approved',
        },
      ]);

      expect(mockSheets.clearRange).toHaveBeenCalledWith('Quotations!A2:I');
      expect(mockSheets.appendRows).toHaveBeenCalled();

      const fetched = await repo.fetchQuotations();
      expect(fetched).toHaveLength(1);
      expect(fetched[0].carrier).toBe('FedEx');
    });
  });

  describe('QuotationsService', () => {
    let service: QuotationsService;
    let mockClient: {
      createQuotation: ReturnType<typeof vi.fn>;
      pollQuotationUntilCompleted: ReturnType<typeof vi.fn>;
    };
    let mockRepo: {
      saveQuotations: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockClient = {
        createQuotation: vi.fn().mockResolvedValue({ id: 'quote-1' }),
        pollQuotationUntilCompleted: vi.fn().mockResolvedValue({
          id: 'quote-1',
          is_completed: true,
          rates: [
            {
              id: 'r-1',
              success: true,
              provider_display_name: 'FedEx',
              provider_service_name: 'Standard',
              total: '130.00',
              days: 2,
            },
          ],
        }),
      };
      mockRepo = { saveQuotations: vi.fn().mockResolvedValue(undefined) };

      service = new QuotationsService(
        mockClient as unknown as SkydropxClient,
        mockRepo as unknown as QuotationsRepository,
      );
    });

    it('should quote a single box and rank rates', async () => {
      const result = await service.quoteBox(sampleBox, originAddress, originAddress);
      expect(result.boxId).toBe('BOX-01');
      expect(result.rates).toHaveLength(1);
      expect(result.cheapestRate?.carrier).toBe('FedEx');
    });

    it('should isolate errors when one box fails without halting others', async () => {
      mockClient.createQuotation
        .mockResolvedValueOnce({ id: 'quote-1' })
        .mockRejectedValueOnce(new Error('Rate limit or network error'));

      const results = await service.quoteBoxes(
        [sampleBox, { ...sampleBox, boxId: 'BOX-02' }],
        originAddress,
        originAddress,
      );

      expect(results).toHaveLength(2);
      expect(results[0].rates).toHaveLength(1);
      expect(results[1].rates).toHaveLength(0); // Failed box handled gracefully
    });

    it('should quote both strategies and persist to Google Sheets', async () => {
      const minBoxes = [sampleBox];
      const minBillable = [{ ...sampleBox, strategy: 'MIN_BILLABLE_WEIGHT' as const, boxId: 'BOX-B1' }];

      const res = await service.quoteBothStrategies(minBoxes, minBillable, originAddress, originAddress);
      expect(res.minBoxesResults).toHaveLength(1);
      expect(res.minBillableResults).toHaveLength(1);
      expect(res.allSheetRows).toHaveLength(2);
      expect(mockRepo.saveQuotations).toHaveBeenCalledTimes(1);
    });
  });
});
