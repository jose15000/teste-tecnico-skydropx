import type {
  AutomationReport,
  BoxAnalysis,
  BoxReportOption,
  Recommendation,
  StrategyAnalysis,
} from '../../interfaces/report.interface.js';
import type { BoxSheetRow, QuotationSheetRow } from '../../interfaces/sheets.interface.js';

const VALUE_OF_DAY_MXN = 35;

function toOption(q: QuotationSheetRow): BoxReportOption {
  const days = q.estimatedDays > 0 ? q.estimatedDays : 5;
  return {
    carrier: q.carrier,
    service: q.service,
    totalPriceMxn: q.totalPriceMxn,
    estimatedDays: q.estimatedDays,
    rateId: q.rateId,
    score: Number((q.totalPriceMxn + days * VALUE_OF_DAY_MXN).toFixed(2)),
  };
}

function analyzeBox(box: BoxSheetRow, quotes: QuotationSheetRow[]): BoxAnalysis {
  const valid = quotes.filter((q) => q.totalPriceMxn > 0).map(toOption);
  if (!valid.length) {
    return {
      boxId: box.boxId,
      strategy: box.strategy,
      containedSkus: box.containedSkus,
      billableWeightKg: box.billableWeightKg,
    };
  }

  const cheapest = valid.reduce((p, c) => (c.totalPriceMxn < p.totalPriceMxn ? c : p));
  const validDays = valid.filter((v) => v.estimatedDays > 0);
  const fastest = validDays.length
    ? validDays.reduce((p, c) => (c.estimatedDays < p.estimatedDays ? c : p))
    : cheapest;
  const bestBalance = valid.reduce((p, c) => ((c.score ?? 0) < (p.score ?? 0) ? c : p));

  return {
    boxId: box.boxId,
    strategy: box.strategy,
    containedSkus: box.containedSkus,
    billableWeightKg: box.billableWeightKg,
    cheapest,
    fastest,
    bestBalance,
  };
}

function buildStrategyAnalysis(strategy: string, boxes: BoxSheetRow[], quotes: QuotationSheetRow[]): StrategyAnalysis {
  const stratBoxes = boxes.filter((b) => b.strategy === strategy);
  const stratQuotes = quotes.filter((q) => q.strategy === strategy);

  const analyzed = stratBoxes.map((b) =>
    analyzeBox(b, stratQuotes.filter((q) => q.boxId === b.boxId)),
  );

  const cheapestCost = analyzed.reduce((sum, b) => sum + (b.cheapest?.totalPriceMxn || 0), 0);
  const bestBalanceCost = analyzed.reduce((sum, b) => sum + (b.bestBalance?.totalPriceMxn || 0), 0);

  const carriers = new Set(
    analyzed.map((b) => b.bestBalance?.carrier || b.cheapest?.carrier).filter(Boolean),
  );

  return {
    strategy,
    totalBoxes: stratBoxes.length,
    totalCostCheapestMxn: Number(cheapestCost.toFixed(2)),
    totalCostBestBalanceMxn: Number(bestBalanceCost.toFixed(2)),
    maxDeliveryDaysCheapest: Math.max(...analyzed.map((b) => b.cheapest?.estimatedDays || 0), 0),
    maxDeliveryDaysBestBalance: Math.max(...analyzed.map((b) => b.bestBalance?.estimatedDays || 0), 0),
    carrierCount: carriers.size,
    boxes: analyzed,
  };
}

function chooseRecommendation(strategies: StrategyAnalysis[]): Recommendation {
  const minBoxes = strategies.find((s) => s.strategy === 'MIN_BOXES');
  const minBillable = strategies.find((s) => s.strategy === 'MIN_BILLABLE_WEIGHT');

  if (!minBoxes && !minBillable) {
    return {
      strategy: 'N/A',
      preferredCriterion: 'best_balance',
      totalCostMxn: 0,
      maxDeliveryDays: 0,
      carrierCount: 0,
      reason: 'No strategies available.',
    };
  }

  const primary = minBoxes || minBillable!;
  return {
    strategy: primary.strategy,
    preferredCriterion: 'best_balance',
    totalCostMxn: primary.totalCostBestBalanceMxn,
    maxDeliveryDays: primary.maxDeliveryDaysBestBalance,
    carrierCount: primary.carrierCount,
    reason: `Strategy ${primary.strategy} groups items into only ${primary.totalBoxes} boxes with optimal delivery balance, minimizing logistical handling fees.`,
  };
}

export function buildAutomationReport(boxes: BoxSheetRow[], quotations: QuotationSheetRow[]): AutomationReport {
  const strategyNames = Array.from(new Set(boxes.map((b) => b.strategy)));
  const strategies = strategyNames.map((name) => buildStrategyAnalysis(name, boxes, quotations));

  return {
    generatedAt: new Date().toISOString(),
    strategies,
    recommendation: chooseRecommendation(strategies),
  };
}
