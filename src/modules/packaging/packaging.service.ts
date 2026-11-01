import { Injectable, Logger } from '@nestjs/common';
import type { CatalogUnit, PackagingConstraints } from '../../interfaces/catalog.interface.js';
import type { PackagingResult, PackedBox } from '../../interfaces/packaging.interface.js';
import type { BoxSheetRow } from '../../interfaces/sheets.interface.js';
import { packMinBillableWeight, packMinBoxes } from './packer-3d.engine.js';
import { PackagingRepository } from './packaging.repository.js';

@Injectable()
export class PackagingService {
  private readonly logger = new Logger(PackagingService.name);

  constructor(private readonly packagingRepository: PackagingRepository) {}

  /**
   * Runs the 3D Extreme-Points bin packing engine under Strategy 1 (MIN_BOXES).
   */
  packMinBoxes(units: CatalogUnit[], constraints: PackagingConstraints): PackagingResult {
    this.logger.log(`Running MIN_BOXES 3D packing for ${units.length} units...`);
    const result = packMinBoxes(units, constraints);
    this.logger.log(
      `MIN_BOXES complete: ${result.totalBoxes} boxes, ${result.totalActualWeightKg}kg actual, ` +
        `${result.totalVolumetricWeightKg}kg volumetric, ${result.totalBillableWeightKg}kg billable, ` +
        `${result.averageOccupancyPercent}% avg occupancy.`,
    );
    return result;
  }

  /**
   * Runs the 3D Extreme-Points bin packing engine under Strategy 2 (MIN_BILLABLE_WEIGHT).
   */
  packMinBillableWeight(units: CatalogUnit[], constraints: PackagingConstraints): PackagingResult {
    this.logger.log(`Running MIN_BILLABLE_WEIGHT 3D packing for ${units.length} units...`);
    const result = packMinBillableWeight(units, constraints);
    this.logger.log(
      `MIN_BILLABLE_WEIGHT complete: ${result.totalBoxes} boxes, ${result.totalActualWeightKg}kg actual, ` +
        `${result.totalVolumetricWeightKg}kg volumetric, ${result.totalBillableWeightKg}kg billable, ` +
        `${result.averageOccupancyPercent}% avg occupancy.`,
    );
    return result;
  }

  /**
   * Runs both packing heuristics and returns their results.
   */
  packCatalog(
    units: CatalogUnit[],
    constraints: PackagingConstraints,
  ): { minBoxesResult: PackagingResult; minBillableResult: PackagingResult } {
    const minBoxesResult = this.packMinBoxes(units, constraints);
    const minBillableResult = this.packMinBillableWeight(units, constraints);

    return {
      minBoxesResult,
      minBillableResult,
    };
  }

  /**
   * Formats a packed box's SKUs into a clean human-readable string.
   */
  formatContainedSkus(box: PackedBox): string {
    const counts = new Map<string, number>();
    for (const item of box.items) {
      counts.set(item.sku, (counts.get(item.sku) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([sku, count]) => (count > 1 ? `${sku} (x${count})` : sku))
      .join(', ');
  }

  /**
   * Transforms domain packaging results into tabular spreadsheet rows for the Boxes tab.
   */
  toBoxSheetRows(results: PackagingResult[]): BoxSheetRow[] {
    const rows: BoxSheetRow[] = [];

    for (const result of results) {
      for (const box of result.boxes) {
        rows.push({
          strategy: box.strategy,
          boxId: box.boxId,
          externalLengthCm: box.externalDimensions.lengthCm,
          externalWidthCm: box.externalDimensions.widthCm,
          externalHeightCm: box.externalDimensions.heightCm,
          actualWeightKg: box.actualWeightKg,
          volumetricWeightKg: box.volumetricWeightKg,
          billableWeightKg: box.billableWeightKg,
          occupancyPercent: box.occupancyPercent,
          containedSkus: this.formatContainedSkus(box),
        });
      }
    }

    return rows;
  }

  /**
   * Persists packaging strategy outputs into the Google Sheets Boxes tab via PackagingRepository.
   */
  async savePackagingResults(results: PackagingResult[]): Promise<void> {
    const sheetRows = this.toBoxSheetRows(results);
    this.logger.log(`Saving ${sheetRows.length} box rows to Google Sheets (Boxes tab)...`);
    await this.packagingRepository.saveBoxes(sheetRows);
  }
}
