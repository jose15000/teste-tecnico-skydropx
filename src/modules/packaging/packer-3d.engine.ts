import type { CatalogUnit, PackagingConstraints } from '../../interfaces/catalog.interface.js';
import type { PackagingResult } from '../../interfaces/packaging.interface.js';
import {
  buildPackagingResult,
  canPlaceInBox,
  finalizeBox,
  getRotations,
  type InternalPoint,
  placeItemInBox,
  type WorkingBox,
} from '../../utils/packing/index.js';

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
