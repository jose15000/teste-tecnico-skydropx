export type CellValue = string | number | boolean | null;

export type SheetRow = CellValue[];

export interface ProductSheetRow {
  sku: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  quantity: number;
}

export interface ParameterSheetRow {
  key: string;
  value: string | number;
  description?: string;
}

export interface BoxSheetRow {
  strategy: string;
  boxId: string;
  itemsSummary: string;
  unitsCount: number;
  internalLengthCm: number;
  internalWidthCm: number;
  internalHeightCm: number;
  externalLengthCm: number;
  externalWidthCm: number;
  externalHeightCm: number;
  itemsWeightKg: number;
  tareWeightKg: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  billableWeightKg: number;
  occupancyPercent: number;
}

export interface QuotationSheetRow {
  strategy: string;
  boxId: string;
  quotationId: string;
  rateId: string;
  carrier: string;
  service: string;
  totalPrice: number;
  currency: string;
  deliveryDays: number;
  balanceScore: number;
  recommendationType?: 'CHEAPEST' | 'FASTEST' | 'BEST_BALANCE' | 'NONE';
}

export interface LabelSheetRow {
  strategy: string;
  boxId: string;
  shipmentId: string;
  rateId: string;
  carrier: string;
  service: string;
  trackingNumber: string;
  labelUrl: string;
  localPdfPath: string;
  status: 'created' | 'skipped_existing' | 'failed';
  createdAt: string;
}
