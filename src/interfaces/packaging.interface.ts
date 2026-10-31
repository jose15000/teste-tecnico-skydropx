export type PackagingStrategyName = 'MIN_BOXES' | 'MIN_BILLABLE_WEIGHT';

export interface Dimensions3D {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface Coordinates3D {
  x: number;
  y: number;
  z: number;
}

export interface PackedUnit {
  unitId: string;
  sku: string;
  name: string;
  weightKg: number;
  originalDimensions: Dimensions3D;
  placedDimensions: Dimensions3D;
  position: Coordinates3D;
}

export interface PackedBox {
  boxId: string;
  strategy: PackagingStrategyName;
  items: PackedUnit[];
  internalDimensions: Dimensions3D;
  externalDimensions: Dimensions3D;
  itemsWeightKg: number;
  tareWeightKg: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  billableWeightKg: number;
  occupancyPercent: number;
}

export interface PackagingResult {
  strategy: PackagingStrategyName;
  boxes: PackedBox[];
  totalBoxes: number;
  totalUnits: number;
  totalActualWeightKg: number;
  totalVolumetricWeightKg: number;
  totalBillableWeightKg: number;
  averageOccupancyPercent: number;
}
