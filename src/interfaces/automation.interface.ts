import type { CatalogValidationError } from './catalog.interface.js';
import type { PackagingStrategyName } from './packaging.interface.js';

export interface StrategySummary {
  strategy: PackagingStrategyName;
  totalBoxes: number;
  totalBillableWeightKg: number;
  quotedRows: number;
}

export interface AutomationRunResult {
  totalUnits: number;
  invalidItems: CatalogValidationError[];
  strategies: StrategySummary[];
}
