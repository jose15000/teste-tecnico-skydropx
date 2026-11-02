import type { PackagingStrategyName } from './packaging.interface.js';
import type { QuotationSheetRow } from './sheets.interface.js';

export interface QuotationRate {
  rateId: string;
  carrier: string;
  service: string;
  totalPrice: number;
  currency: string;
  deliveryDays: number;
  success: boolean;
  status?: string;
  balanceScore?: number;
}

export interface BoxQuotationResult {
  boxId: string;
  strategy: PackagingStrategyName;
  quotationId: string;
  rates: QuotationRate[];
  cheapestRate?: QuotationRate;
  fastestRate?: QuotationRate;
  bestBalanceRate?: QuotationRate;
}

export interface LabelRecord {
  boxId: string;
  strategy: PackagingStrategyName;
  shipmentId: string;
  rateId: string;
  carrier: string;
  service: string;
  trackingNumber: string;
  labelUrl: string;
  localPdfPath: string;
  status: 'created' | 'skipped_existing' | 'failed';
  createdAt: string;
  errorMessage?: string;
}

export interface MultiStrategyQuotationResult {
  minBoxesResults: BoxQuotationResult[];
  minBillableResults: BoxQuotationResult[];
  allSheetRows: QuotationSheetRow[];
}
