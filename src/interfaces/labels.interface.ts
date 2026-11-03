export interface GeneratedLabel {
  boxId: string;
  carrier: string;
  service: string;
  price: number;
  trackingNumber: string;
  pdfFilename: string;
  createdAt: string;
}

export interface LabelGenerationError {
  boxId: string;
  carrier?: string;
  service?: string;
  error: string;
}

export interface GenerateLabelsResult {
  generated: GeneratedLabel[];
  skipped: GeneratedLabel[];
  errors: LabelGenerationError[];
  totalCostMxn: number;
}
