export interface CatalogItem {
  sku: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  company?: string;
  street1: string;
  neighborhood?: string;
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

export interface CatalogData {
  items: CatalogItem[];
  constraints: PackagingConstraints;
  originAddress?: ShippingAddress;
  destinationAddress?: ShippingAddress;
}
