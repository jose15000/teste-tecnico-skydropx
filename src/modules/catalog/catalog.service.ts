import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type {
  CatalogData,
  CatalogItem,
  CatalogUnit,
  CatalogValidationError,
  ValidatedCatalog,
} from '../../interfaces/catalog.interface.js';
import {
  catalogParametersSchema,
  createCatalogItemSchema,
} from '../../schemas/catalog.schema.js';
import { CatalogRepository } from './catalog.repository.js';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(private readonly catalogRepository: CatalogRepository) {}

  async getValidatedCatalog(): Promise<ValidatedCatalog> {
    const rawCatalog = await this.catalogRepository.fetchCatalogData();
    return this.validateAndExpandCatalog(rawCatalog);
  }

  validateAndExpandCatalog(data: CatalogData): ValidatedCatalog {
    this.validateParameters(data);

    const itemSchema = createCatalogItemSchema(data.constraints);
    const validItems: CatalogItem[] = [];
    const invalidItems: CatalogValidationError[] = [];

    for (const item of data.items) {
      const parsed = itemSchema.safeParse(item);

      if (!parsed.success) {
        const reasons = parsed.error.issues.map((issue) => issue.message);
        this.logger.warn(
          `Row ${item.rowNumber} (SKU: ${item.sku || 'N/A'}) is invalid: ${reasons.join('; ')}`,
        );
        invalidItems.push({
          rowNumber: item.rowNumber,
          sku: item.sku || `ROW-${item.rowNumber}`,
          reasons,
        });
      } else {
        validItems.push(parsed.data);
      }
    }

    return {
      validItems,
      invalidItems,
      expandedUnits: this.expandUnits(validItems),
      constraints: data.constraints,
      originAddress: data.originAddress,
      destinationAddress: data.destinationAddress,
    };
  }

  private validateParameters(data: CatalogData): void {
    const parsed = catalogParametersSchema.safeParse(data);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid spreadsheet parameters in Parameters tab',
        errors: parsed.error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`,
        ),
      });
    }
  }

  expandUnits(validItems: CatalogItem[]): CatalogUnit[] {
    const units: CatalogUnit[] = [];

    for (const item of validItems) {
      for (let i = 1; i <= item.quantity; i++) {
        units.push({
          unitId: `${item.sku}-${i}`,
          sku: item.sku,
          name: item.name,
          lengthCm: item.lengthCm,
          widthCm: item.widthCm,
          heightCm: item.heightCm,
          weightKg: item.weightKg,
          fragile: item.fragile,
          valueMxn: item.valueMxn,
        });
      }
    }

    return units;
  }
}
