import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type {
  CatalogData,
  CatalogItem,
  CatalogValidationError,
  ValidatedCatalog,
} from '../../interfaces/catalog.interface.js';
import {
  CatalogParametersSchema,
  createCatalogItemSchema,
} from '../../schemas/catalog.schema.js';
import { expandUnits } from '../../utils/catalog-units.util.js';
import { CatalogRepository } from './catalog.repository.js';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(private readonly catalogRepository: CatalogRepository) {}

  async getValidatedCatalog(): Promise<ValidatedCatalog> {
    return this.validateAndExpandCatalog(await this.catalogRepository.fetchCatalogData());
  }

  validateAndExpandCatalog(data: CatalogData): ValidatedCatalog {
    const params = CatalogParametersSchema.safeParse(data);
    if (!params.success) {
      throw new BadRequestException({
        message: 'Invalid spreadsheet parameters in Parameters tab',
        errors: params.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
    }

    const itemSchema = createCatalogItemSchema(data.constraints);
    const validItems: CatalogItem[] = [];
    const invalidItems: CatalogValidationError[] = [];

    for (const item of data.items) {
      const parsed = itemSchema.safeParse(item);
      if (parsed.success) {
        validItems.push(parsed.data);
        continue;
      }
      const reasons = parsed.error.issues.map((i) => i.message);
      this.logger.warn(`Row ${item.rowNumber} (SKU: ${item.sku || 'N/A'}) invalid: ${reasons.join('; ')}`);
      invalidItems.push({ rowNumber: item.rowNumber, sku: item.sku || `ROW-${item.rowNumber}`, reasons });
    }

    return {
      validItems,
      invalidItems,
      expandedUnits: expandUnits(validItems),
      constraints: data.constraints,
      originAddress: data.originAddress,
      destinationAddress: data.destinationAddress,
    };
  }
}
