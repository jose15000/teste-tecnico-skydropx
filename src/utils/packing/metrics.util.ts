import type { PackagingConstraints } from '../../interfaces/catalog.interface.js';
import type {
  Dimensions3D,
  PackagingResult,
  PackagingStrategyName,
  PackedBox,
  PackedUnit,
} from '../../interfaces/packaging.interface.js';
import type { WorkingBox } from './types.js';

/**
 * Calculates domain metrics for a working box and returns a finalized PackedBox.
 */
export function finalizeBox(
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
export function buildPackagingResult(strategy: PackagingStrategyName, boxes: PackedBox[]): PackagingResult {
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
