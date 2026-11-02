import type { CatalogItem, CatalogUnit } from '../interfaces/catalog.interface.js';

/** Expands each SKU row into one unit per quantity (unitId = `${sku}-${n}`). */
export function expandUnits(items: CatalogItem[]): CatalogUnit[] {
  return items.flatMap(({ rowNumber: _row, quantity, ...rest }) =>
    Array.from({ length: quantity }, (_, i) => ({ ...rest, unitId: `${rest.sku}-${i + 1}` })),
  );
}
