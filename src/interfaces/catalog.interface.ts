export interface CatalogItem {
  rowNumber: number;
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

export interface CatalogUnit {
  unitId: string;
  sku: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  fragile: boolean;
  valueMxn: number;
}

export interface CatalogValidationError {
  rowNumber: number;
  sku: string;
  reasons: string[];
}

export interface ShippingAddress {
  name: string;
  street1: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phone: string;
  email: string;
}

export interface PackagingConstraints {
  clearanceCm: number;
  maxSideCm: number;
  boxTareWeightKg: number;
  maxBoxWeightKg: number;
  volumetricFactor: number;
}

export interface CatalogParameters {
  constraints: PackagingConstraints;
  originAddress: ShippingAddress;
  destinationAddress: ShippingAddress;
}

export interface CatalogData {
  items: CatalogItem[];
  constraints: PackagingConstraints;
  originAddress: ShippingAddress;
  destinationAddress: ShippingAddress;
}

export interface ValidatedCatalog {
  validItems: CatalogItem[];
  invalidItems: CatalogValidationError[];
  expandedUnits: CatalogUnit[];
  constraints: PackagingConstraints;
  originAddress: ShippingAddress;
  destinationAddress: ShippingAddress;
}
