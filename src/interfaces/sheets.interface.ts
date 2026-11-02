export type CellValue = string | number | boolean | null;

export type SheetRow = CellValue[];

/**
 * Aba "Products" (A1:I)
 * Colunas: SKU | Producto | Largo (cm) | Ancho (cm) | Alto (cm) | Peso (kg) | Cantidad | Frágil | Valor (MXN)
 */
export interface ProductSheetRow {
  sku: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  quantity: number;
  fragile: boolean;
  valueMxn: number;
}

/**
 * Aba "Parameters" (A1:B)
 * Colunas: Parámetro | Valor
 */
export interface ParameterSheetRow {
  key: string;
  value: string;
}

/**
 * Aba "Boxes" (A1:J)
 * Colunas: Estrategia | Caja ID | Largo ext. (cm) | Ancho ext. (cm) | Alto ext. (cm) | Peso real (kg) | Peso volumétrico (kg) | Peso facturable (kg) | Ocupación (%) | SKUs contenidos
 */
export interface BoxSheetRow {
  strategy: string;
  boxId: string;
  externalLengthCm: number;
  externalWidthCm: number;
  externalHeightCm: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  billableWeightKg: number;
  occupancyPercent: number;
  containedSkus: string;
}

/**
 * Aba "Quotations" (A1:I)
 * Colunas: Estrategia | Caja ID | Paquetería | Servicio | Precio total (MXN) | Días estimados | Rate ID | Cotizado en | Estado
 */
export interface QuotationSheetRow {
  strategy: string;
  boxId: string;
  carrier: string;
  service: string;
  totalPriceMxn: number;
  estimatedDays: number;
  rateId: string;
  quotedAt?: string;
  status: string;
  error?: string;
}

/**
 * Aba "Labels" (A1:G)
 * Colunas: Caja ID | Paquetería | Servicio | Precio (MXN) | Número de guía | Archivo PDF | Creada en
 */
export interface LabelSheetRow {
  boxId: string;
  carrier: string;
  service: string;
  priceMxn: number;
  trackingNumber: string;
  pdfFile: string;
  createdAt: string;
}
