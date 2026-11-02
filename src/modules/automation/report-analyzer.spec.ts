import { describe, expect, it } from 'vitest';
import type { BoxSheetRow, QuotationSheetRow } from '../../interfaces/sheets.interface.js';
import { buildAutomationReport } from './report-analyzer.js';

describe('Report Analyzer', () => {
  const mockBoxes: BoxSheetRow[] = [
    {
      strategy: 'MIN_BOXES',
      boxId: 'BOX-01',
      externalLengthCm: 50,
      externalWidthCm: 40,
      externalHeightCm: 30,
      actualWeightKg: 10,
      volumetricWeightKg: 12,
      billableWeightKg: 12,
      occupancyPercent: 85,
      containedSkus: 'SKU-001',
    },
    {
      strategy: 'MIN_BILLABLE_WEIGHT',
      boxId: 'BOX-B1',
      externalLengthCm: 30,
      externalWidthCm: 20,
      externalHeightCm: 20,
      actualWeightKg: 4,
      volumetricWeightKg: 2.4,
      billableWeightKg: 4,
      occupancyPercent: 90,
      containedSkus: 'SKU-001',
    },
  ];

  const mockQuotes: QuotationSheetRow[] = [
    {
      strategy: 'MIN_BOXES',
      boxId: 'BOX-01',
      carrier: 'Estafeta',
      service: 'Terrestre',
      totalPriceMxn: 250,
      estimatedDays: 3,
      rateId: 'r-1',
      status: 'approved',
    },
    {
      strategy: 'MIN_BOXES',
      boxId: 'BOX-01',
      carrier: 'DHL',
      service: 'Express',
      totalPriceMxn: 400,
      estimatedDays: 1,
      rateId: 'r-2',
      status: 'approved',
    },
    {
      strategy: 'MIN_BILLABLE_WEIGHT',
      boxId: 'BOX-B1',
      carrier: 'FedEx',
      service: 'Standard',
      totalPriceMxn: 180,
      estimatedDays: 2,
      rateId: 'r-3',
      status: 'approved',
    },
  ];

  it('correctly calculates cheapest, fastest, and best balance per box', () => {
    const report = buildAutomationReport(mockBoxes, mockQuotes);

    const minBoxes = report.strategies.find((s) => s.strategy === 'MIN_BOXES');
    expect(minBoxes).toBeDefined();
    expect(minBoxes!.boxes[0].cheapest?.carrier).toBe('Estafeta');
    expect(minBoxes!.boxes[0].fastest?.carrier).toBe('DHL');
    expect(minBoxes!.boxes[0].bestBalance?.carrier).toBe('Estafeta');
  });

  it('selects valid recommendation strategy', () => {
    const report = buildAutomationReport(mockBoxes, mockQuotes);
    expect(report.recommendation.strategy).toBe('MIN_BOXES');
    expect(report.recommendation.totalCostMxn).toBeGreaterThan(0);
  });
});
