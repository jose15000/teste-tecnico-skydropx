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

    const service = new AutomationService(catalog as never, packaging as never, quotations as never);
    const result = await service.run();

    expect(packaging.savePackagingResults).toHaveBeenCalledTimes(1);
    expect(result.totalUnits).toBe(1);
    expect(result.invalidItems).toHaveLength(1);
    expect(result.strategies.map((s) => s.quotedRows)).toEqual([2, 1]);
  });
});
