import type { CatalogUnit, PackagingConstraints } from '../../interfaces/catalog.interface.js';
import type {
  Dimensions3D,
  PackagingResult,
  PackagingStrategyName,
  PackedBox,
  PackedUnit,
} from '../../interfaces/packaging.interface.js';

interface InternalPoint {
  x: number;
  y: number;
  z: number;
}

interface InternalPlacedUnit {
  unit: CatalogUnit;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
}

interface WorkingBox {
  items: InternalPlacedUnit[];
  extremePoints: InternalPoint[];
}

/**
 * Generates all unique orthogonal 3D rotations for a given dimension tuple [l, w, h].
 */
export function getRotations(length: number, width: number, height: number): [number, number, number][] {
  const permutations: [number, number, number][] = [
    [length, width, height],
    [length, height, width],
    [width, length, height],
    [width, height, length],
    [height, length, width],
    [height, width, length],
  ];

  const unique = new Set<string>();
  const results: [number, number, number][] = [];

  for (const [l, w, h] of permutations) {
    const key = `${l},${w},${h}`;
    if (!unique.has(key)) {
      unique.add(key);
      results.push([l, w, h]);
    }
  }

  return results;
}

/**
 * Checks whether two 3D Axis-Aligned Bounding Boxes (AABB) overlap in internal volume.
 */
export function check3DOverlap(
  posA: InternalPoint,
  dimA: [number, number, number],
  posB: InternalPoint,
  dimB: [number, number, number],
): boolean {
  const [dxA, dyA, dzA] = dimA;
  const [dxB, dyB, dzB] = dimB;

  return (
    posA.x < posB.x + dxB &&
    posA.x + dxA > posB.x &&
    posA.y < posB.y + dyB &&
    posA.y + dyA > posB.y &&
    posA.z < posB.z + dzB &&
    posA.z + dzA > posB.z
  );
}

/**
 * Validates if an item can be placed at a candidate point in a working box.
 */
function canPlaceInBox(
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
 * Updates a working box with a new placed item and generates next candidate Extreme Points.
 */
function placeItemInBox(
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

/**
 * Calculates domain metrics for a working box.
 */
function finalizeBox(
  box: WorkingBox,
  boxIndex: number,
  strategy: PackagingStrategyName,
  constraints: PackagingConstraints,
): PackedBox {
  let maxX = 0;
  let maxY = 0;
  let maxZ = 0;
  let itemsWeight = 0;
  let itemsVolume = 0;

  const packedUnits: PackedUnit[] = box.items.map((item) => {
    maxX = Math.max(maxX, item.x + item.dx);
    maxY = Math.max(maxY, item.y + item.dy);
    maxZ = Math.max(maxZ, item.z + item.dz);
    itemsWeight += item.unit.weightKg;
    itemsVolume += item.dx * item.dy * item.dz;

    return {
      unitId: item.unit.unitId,
      sku: item.unit.sku,
      name: item.unit.name,
      weightKg: item.unit.weightKg,
      originalDimensions: {
        lengthCm: item.unit.lengthCm,
        widthCm: item.unit.widthCm,
        heightCm: item.unit.heightCm,
      },
      placedDimensions: {
        lengthCm: item.dx,
        widthCm: item.dy,
        heightCm: item.dz,
      },
      position: {
        x: item.x,
        y: item.y,
        z: item.z,
      },
    };
  });

  const internalDimensions: Dimensions3D = {
    lengthCm: maxX,
    widthCm: maxY,
    heightCm: maxZ,
  };

  const externalDimensions: Dimensions3D = {
    lengthCm: maxX > 0 ? maxX + constraints.clearanceCm : 0,
    widthCm: maxY > 0 ? maxY + constraints.clearanceCm : 0,
    heightCm: maxZ > 0 ? maxZ + constraints.clearanceCm : 0,
  };

  const tareWeightKg = constraints.boxTareWeightKg;
  const actualWeightKg = Math.round((itemsWeight + tareWeightKg) * 100) / 100;
  const volumetricWeightKg =
    Math.round(
      ((externalDimensions.lengthCm * externalDimensions.widthCm * externalDimensions.heightCm) /
        constraints.volumetricFactor) *
        100,
    ) / 100;
  const billableWeightKg = Math.ceil(Math.max(actualWeightKg, volumetricWeightKg));

  const internalVolume = maxX * maxY * maxZ;
  const occupancyPercent = internalVolume > 0 ? Math.round((itemsVolume / internalVolume) * 1000) / 10 : 0;

  const boxNumberStr = String(boxIndex + 1).padStart(2, '0');
  const boxId = `BOX-${boxNumberStr}`;

  return {
    boxId,
    strategy,
    items: packedUnits,
    internalDimensions,
    externalDimensions,
    itemsWeightKg: Math.round(itemsWeight * 100) / 100,
    tareWeightKg,
    actualWeightKg,
    volumetricWeightKg,
    billableWeightKg,
    occupancyPercent,
  };
}

/**
 * Builds the aggregated PackagingResult summary from a list of finalized PackedBoxes.
 */
function buildPackagingResult(strategy: PackagingStrategyName, boxes: PackedBox[]): PackagingResult {
  const totalBoxes = boxes.length;
  const totalUnits = boxes.reduce((acc, box) => acc + box.items.length, 0);
  const totalActualWeightKg =
    Math.round(boxes.reduce((acc, box) => acc + box.actualWeightKg, 0) * 100) / 100;
  const totalVolumetricWeightKg =
    Math.round(boxes.reduce((acc, box) => acc + box.volumetricWeightKg, 0) * 100) / 100;
  const totalBillableWeightKg = boxes.reduce((acc, box) => acc + box.billableWeightKg, 0);
  const averageOccupancyPercent =
    totalBoxes > 0
      ? Math.round((boxes.reduce((acc, box) => acc + box.occupancyPercent, 0) / totalBoxes) * 10) / 10
      : 0;

  return {
    strategy,
    boxes,
    totalBoxes,
    totalUnits,
    totalActualWeightKg,
    totalVolumetricWeightKg,
    totalBillableWeightKg,
    averageOccupancyPercent,
  };
}

/**
 * Strategy 1: MIN_BOXES (3D Extreme-Points First-Fit Decreasing)
 * Sorts units by volume descending and places each into the box that minimizes bounding-box volume growth.
 */
export function packMinBoxes(units: CatalogUnit[], constraints: PackagingConstraints): PackagingResult {
  const sortedUnits = [...units].sort((a, b) => {
    const volA = a.lengthCm * a.widthCm * a.heightCm;
    const volB = b.lengthCm * b.widthCm * b.heightCm;
    return volB - volA || b.weightKg - a.weightKg;
  });

  const boxes: WorkingBox[] = [];

  for (const unit of sortedUnits) {
    const rotations = getRotations(unit.lengthCm, unit.widthCm, unit.heightCm);

    let bestBoxIndex = -1;
    let bestPoint: InternalPoint | null = null;
    let bestRotation: [number, number, number] | null = null;
    let minVolumeExpansion = Infinity;

    for (let bi = 0; bi < boxes.length; bi++) {
      const box = boxes[bi];
      let curMaxX = 0;
      let curMaxY = 0;
      let curMaxZ = 0;
      for (const it of box.items) {
        curMaxX = Math.max(curMaxX, it.x + it.dx);
        curMaxY = Math.max(curMaxY, it.y + it.dy);
        curMaxZ = Math.max(curMaxZ, it.z + it.dz);
      }
      const curBoxVolume = curMaxX * curMaxY * curMaxZ;

      for (const pt of box.extremePoints) {
        for (const rot of rotations) {
          if (canPlaceInBox(box, pt, rot, unit.weightKg, constraints)) {
            const nextMaxX = Math.max(curMaxX, pt.x + rot[0]);
            const nextMaxY = Math.max(curMaxY, pt.y + rot[1]);
            const nextMaxZ = Math.max(curMaxZ, pt.z + rot[2]);
            const nextBoxVolume = nextMaxX * nextMaxY * nextMaxZ;
            const expansion = nextBoxVolume - curBoxVolume;

            if (expansion < minVolumeExpansion) {
              minVolumeExpansion = expansion;
              bestBoxIndex = bi;
              bestPoint = pt;
              bestRotation = rot;
            }
          }
        }
      }
    }

    if (bestBoxIndex !== -1 && bestPoint && bestRotation) {
      placeItemInBox(boxes[bestBoxIndex], unit, bestPoint, bestRotation, constraints);
    } else {
      const newBox: WorkingBox = { items: [], extremePoints: [{ x: 0, y: 0, z: 0 }] };
      const initialRotation = rotations[0];
      placeItemInBox(newBox, unit, { x: 0, y: 0, z: 0 }, initialRotation, constraints);
      boxes.push(newBox);
    }
  }

  const packedBoxes = boxes.map((box, idx) => finalizeBox(box, idx, 'MIN_BOXES', constraints));
  return buildPackagingResult('MIN_BOXES', packedBoxes);
}

/**
 * Strategy 2: MIN_BILLABLE_WEIGHT (Density-Balanced Marginal Billable Minimization)
 * Evaluates placements across open boxes to minimize marginal billable weight jumps, opening compact boxes
 * when adding an item would bloat the 3D bounding box with dead air.
 */
export function packMinBillableWeight(units: CatalogUnit[], constraints: PackagingConstraints): PackagingResult {
  const sortedUnits = [...units].sort((a, b) => {
    const densA = a.weightKg / (a.lengthCm * a.widthCm * a.heightCm);
    const densB = b.weightKg / (b.lengthCm * b.widthCm * b.heightCm);
    return densB - densA;
  });

  const boxes: WorkingBox[] = [];

  for (const unit of sortedUnits) {
    const rotations = getRotations(unit.lengthCm, unit.widthCm, unit.heightCm);

    let bestBoxIndex = -1;
    let bestPoint: InternalPoint | null = null;
    let bestRotation: [number, number, number] | null = null;
    let minBillableDelta = Infinity;
    let minVolumetricDelta = Infinity;

    for (let bi = 0; bi < boxes.length; bi++) {
      const box = boxes[bi];

      let curMaxX = 0;
      let curMaxY = 0;
      let curMaxZ = 0;
      let curItemsWeight = 0;
      for (const it of box.items) {
        curMaxX = Math.max(curMaxX, it.x + it.dx);
        curMaxY = Math.max(curMaxY, it.y + it.dy);
        curMaxZ = Math.max(curMaxZ, it.z + it.dz);
        curItemsWeight += it.unit.weightKg;
      }

      const curActual = Math.round((curItemsWeight + constraints.boxTareWeightKg) * 100) / 100;
      const curExtL = curMaxX > 0 ? curMaxX + constraints.clearanceCm : 0;
      const curExtW = curMaxY > 0 ? curMaxY + constraints.clearanceCm : 0;
      const curExtH = curMaxZ > 0 ? curMaxZ + constraints.clearanceCm : 0;
      const curVol = Math.round(((curExtL * curExtW * curExtH) / constraints.volumetricFactor) * 100) / 100;
      const curBillable = Math.ceil(Math.max(curActual, curVol));

      for (const pt of box.extremePoints) {
        for (const rot of rotations) {
          if (canPlaceInBox(box, pt, rot, unit.weightKg, constraints)) {
            const nextMaxX = Math.max(curMaxX, pt.x + rot[0]);
            const nextMaxY = Math.max(curMaxY, pt.y + rot[1]);
            const nextMaxZ = Math.max(curMaxZ, pt.z + rot[2]);
            const nextExtL = nextMaxX + constraints.clearanceCm;
            const nextExtW = nextMaxY + constraints.clearanceCm;
            const nextExtH = nextMaxZ + constraints.clearanceCm;
            const nextActual =
              Math.round((curItemsWeight + unit.weightKg + constraints.boxTareWeightKg) * 100) / 100;
            const nextVol =
              Math.round(((nextExtL * nextExtW * nextExtH) / constraints.volumetricFactor) * 100) / 100;
            const nextBillable = Math.ceil(Math.max(nextActual, nextVol));

            const deltaB = nextBillable - curBillable;
            const deltaV = nextVol - curVol;

            if (deltaB < minBillableDelta || (deltaB === minBillableDelta && deltaV < minVolumetricDelta)) {
              minBillableDelta = deltaB;
              minVolumetricDelta = deltaV;
              bestBoxIndex = bi;
              bestPoint = pt;
              bestRotation = rot;
            }
          }
        }
      }
    }

    // Billable weight cost if item is placed in a new fresh box
    const freshExtL = unit.lengthCm + constraints.clearanceCm;
    const freshExtW = unit.widthCm + constraints.clearanceCm;
    const freshExtH = unit.heightCm + constraints.clearanceCm;
    const freshActual = Math.round((unit.weightKg + constraints.boxTareWeightKg) * 100) / 100;
    const freshVol =
      Math.round(((freshExtL * freshExtW * freshExtH) / constraints.volumetricFactor) * 100) / 100;
    const freshBillable = Math.ceil(Math.max(freshActual, freshVol));

    // If packing into an existing box has delta <= starting a fresh box, pack it; otherwise open a new compact box
    if (bestBoxIndex !== -1 && bestPoint && bestRotation && minBillableDelta <= freshBillable) {
      placeItemInBox(boxes[bestBoxIndex], unit, bestPoint, bestRotation, constraints);
    } else {
      const newBox: WorkingBox = { items: [], extremePoints: [{ x: 0, y: 0, z: 0 }] };
      const initialRotation = rotations[0];
      placeItemInBox(newBox, unit, { x: 0, y: 0, z: 0 }, initialRotation, constraints);
      boxes.push(newBox);
    }
  }

  const packedBoxes = boxes.map((box, idx) => finalizeBox(box, idx, 'MIN_BILLABLE_WEIGHT', constraints));
  return buildPackagingResult('MIN_BILLABLE_WEIGHT', packedBoxes);
}
