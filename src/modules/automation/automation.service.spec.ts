import { describe, expect, it, vi } from 'vitest';
import { AutomationService } from './automation.service.js';

describe('AutomationService', () => {
  it('should orchestrate catalog, packing, persistence and quotations', async () => {
    const box = (strategy: string) => ({ strategy, totalBoxes: 1, totalBillableWeightKg: 5, boxes: [{ boxId: 'B1' }] });
    const catalog = {
      getValidatedCatalog: vi.fn().mockResolvedValue({
        expandedUnits: [{ unitId: 'U1' }],
        constraints: {},
        originAddress: {},
        destinationAddress: {},
        invalidItems: [{ rowNumber: 3, sku: 'X', reasons: ['bad'] }],
      }),
    };
    const packaging = {
      packCatalog: vi.fn().mockReturnValue({
        minBoxesResult: box('MIN_BOXES'),
        minBillableResult: box('MIN_BILLABLE_WEIGHT'),
      }),
      savePackagingResults: vi.fn().mockResolvedValue(undefined),
    };
    const quotations = {
      quoteBothStrategies: vi.fn().mockResolvedValue({
        allSheetRows: [{ strategy: 'MIN_BOXES' }, { strategy: 'MIN_BOXES' }, { strategy: 'MIN_BILLABLE_WEIGHT' }],
      }),
    };

    const packagingRepo = {
      fetchBoxes: vi.fn().mockResolvedValue([
        { strategy: 'MIN_BOXES', boxId: 'B1', billableWeightKg: 5, containedSkus: 'SKU-1' },
      ]),
    };
    const quotationsRepo = {
      fetchQuotations: vi.fn().mockResolvedValue([
        { strategy: 'MIN_BOXES', boxId: 'B1', carrier: 'FedEx', service: 'Std', totalPriceMxn: 100, estimatedDays: 2 },
      ]),
    };

    const service = new AutomationService(
      catalog as never,
      packaging as never,
      quotations as never,
      packagingRepo as never,
      quotationsRepo as never,
    );
    const result = await service.run();

    expect(packaging.savePackagingResults).toHaveBeenCalledTimes(1);
    expect(result.totalUnits).toBe(1);
    expect(result.invalidItems).toHaveLength(1);
    expect(result.strategies.map((s) => s.quotedRows)).toEqual([2, 1]);

    const report = await service.getReport();
    expect(report.strategies).toHaveLength(1);
    expect(report.recommendation.strategy).toBe('MIN_BOXES');
  });
});
