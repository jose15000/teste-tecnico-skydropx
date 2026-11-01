import type { CatalogUnit, PackagingConstraints } from '../../interfaces/catalog.interface.js';
import { check3DOverlap } from './geometry.util.js';
import type { InternalPlacedUnit, InternalPoint, WorkingBox } from './types.js';

/**
 * Validates if an item can be placed at a candidate point in a working box without
 * exceeding internal side bounds, weight limits, or colliding with existing units.
 */
export function canPlaceInBox(
  box: WorkingBox,
  point: InternalPoint,
  rotation: [number, number, number],
  weightKg: number,
  constraints: PackagingConstraints,
): boolean {
  const [dx, dy, dz] = rotation;
  const maxInternalSide = constraints.maxSideCm - constraints.clearanceCm;
  const maxNetWeight = constraints.maxBoxWeightKg - constraints.boxTareWeightKg;

  // Boundary check
  if (point.x + dx > maxInternalSide || point.y + dy > maxInternalSide || point.z + dz > maxInternalSide) {
    return false;
  }

  // Weight check
  const currentWeight = box.items.reduce((acc, item) => acc + item.unit.weightKg, 0);
  if (currentWeight + weightKg > maxNetWeight) {
    return false;
  }

  // Collision check against placed units
  for (const placed of box.items) {
    if (check3DOverlap(point, rotation, { x: placed.x, y: placed.y, z: placed.z }, [placed.dx, placed.dy, placed.dz])) {
      return false;
    }
  }

  return true;
}

/**
 * Updates a working box with a new placed item and generates the next set of candidate Extreme Points.
 */
export function placeItemInBox(
  box: WorkingBox,
  unit: CatalogUnit,
  point: InternalPoint,
  rotation: [number, number, number],
  constraints: PackagingConstraints,
): void {
  const [dx, dy, dz] = rotation;
  const placed: InternalPlacedUnit = {
    unit,
    x: point.x,
    y: point.y,
    z: point.z,
    dx,
    dy,
    dz,
  };
  box.items.push(placed);

  const maxInternalSide = constraints.maxSideCm - constraints.clearanceCm;

  // Remove extreme points engulfed by the new item
  const validPoints = box.extremePoints.filter((p) => {
    return !(
      p.x >= placed.x &&
      p.x < placed.x + placed.dx &&
      p.y >= placed.y &&
      p.y < placed.y + placed.dy &&
      p.z >= placed.z &&
      p.z < placed.z + placed.dz
    );
  });

  // Candidate generation
  const candidatePoints: InternalPoint[] = [
    { x: placed.x + placed.dx, y: placed.y, z: placed.z },
    { x: placed.x, y: placed.y + placed.dy, z: placed.z },
    { x: placed.x, y: placed.y, z: placed.z + placed.dz },
    { x: placed.x + placed.dx, y: placed.y + placed.dy, z: placed.z },
    { x: placed.x + placed.dx, y: placed.y, z: placed.z + placed.dz },
    { x: placed.x, y: placed.y + placed.dy, z: placed.z + placed.dz },
    { x: placed.x + placed.dx, y: 0, z: 0 },
    { x: 0, y: placed.y + placed.dy, z: 0 },
    { x: 0, y: 0, z: placed.z + placed.dz },
  ];

  // Axis projections with already existing items to find snug fits
  for (const other of box.items) {
    candidatePoints.push(
      { x: placed.x + placed.dx, y: other.y + other.dy, z: 0 },
      { x: placed.x + placed.dx, y: 0, z: other.z + other.dz },
      { x: other.x + other.dx, y: placed.y + placed.dy, z: 0 },
      { x: 0, y: placed.y + placed.dy, z: other.z + other.dz },
      { x: other.x + other.dx, y: 0, z: placed.z + placed.dz },
      { x: 0, y: other.y + other.dy, z: placed.z + placed.dz },
    );
  }

  for (const cp of candidatePoints) {
    if (cp.x <= maxInternalSide && cp.y <= maxInternalSide && cp.z <= maxInternalSide) {
      if (!validPoints.some((p) => p.x === cp.x && p.y === cp.y && p.z === cp.z)) {
        validPoints.push(cp);
      }
    }
  }

  // Sort candidate points: bottom-to-top (z), back-to-front (y), left-to-right (x)
  validPoints.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  box.extremePoints = validPoints;
}
