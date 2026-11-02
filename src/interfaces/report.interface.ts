export interface BoxReportOption {
  carrier: string;
  service: string;
  totalPriceMxn: number;
  estimatedDays: number;
  rateId: string;
  score?: number;
}

export interface BoxAnalysis {
  boxId: string;
  strategy: string;
  containedSkus?: string;
  billableWeightKg?: number;
  cheapest?: BoxReportOption;
  fastest?: BoxReportOption;
  bestBalance?: BoxReportOption;
}

export interface StrategyAnalysis {
  strategy: string;
  totalBoxes: number;
  totalCostCheapestMxn: number;
  totalCostBestBalanceMxn: number;
  maxDeliveryDaysCheapest: number;
  maxDeliveryDaysBestBalance: number;
  carrierCount: number;
  boxes: BoxAnalysis[];
}

export interface Recommendation {
  strategy: string;
  preferredCriterion: 'best_balance' | 'cheapest';
  totalCostMxn: number;
  maxDeliveryDays: number;
  carrierCount: number;
  reason: string;
}

export interface AutomationReport {
  generatedAt: string;
  strategies: StrategyAnalysis[];
  recommendation: Recommendation;
}
