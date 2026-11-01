import type { CatalogUnit } from '../../interfaces/catalog.interface.js';

export interface InternalPoint {
  x: number;
  y: number;
  z: number;
}

export interface InternalPlacedUnit {
  unit: CatalogUnit;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
}

export interface WorkingBox {
  items: InternalPlacedUnit[];
  extremePoints: InternalPoint[];
}
