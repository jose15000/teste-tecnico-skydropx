import { Injectable, Logger } from '@nestjs/common';
import type { AutomationRunResult } from '../../interfaces/automation.interface.js';
import type { PackagingResult } from '../../interfaces/packaging.interface.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { PackagingService } from '../packaging/packaging.service.js';
import { QuotationsService } from '../quotations/quotations.service.js';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly catalog: CatalogService,
    private readonly packaging: PackagingService,
    private readonly quotations: QuotationsService,
  ) {}

  /** Catalog -> packing (both strategies) -> Boxes tab -> quotations -> Quotations tab. */
  async run(): Promise<AutomationRunResult> {
    const { expandedUnits, constraints, originAddress, destinationAddress, invalidItems } =
      await this.catalog.getValidatedCatalog();

    const { minBoxesResult, minBillableResult } = this.packaging.packCatalog(expandedUnits, constraints);
    await this.packaging.savePackagingResults([minBoxesResult, minBillableResult]);

    const quoted = await this.quotations.quoteBothStrategies(
      minBoxesResult.boxes,
      minBillableResult.boxes,
      originAddress,
      destinationAddress,
    );
    this.logger.log(`Run finished: ${quoted.allSheetRows.length} quotation rows saved.`);

    const summarize = (r: PackagingResult) => ({
      strategy: r.strategy,
      totalBoxes: r.totalBoxes,
      totalBillableWeightKg: r.totalBillableWeightKg,
      quotedRows: quoted.allSheetRows.filter((row) => row.strategy === r.strategy).length,
    });

    return {
      totalUnits: expandedUnits.length,
      invalidItems,
      strategies: [summarize(minBoxesResult), summarize(minBillableResult)],
    };
  }
}
