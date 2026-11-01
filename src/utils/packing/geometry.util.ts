import type { InternalPoint } from './types.js';

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
