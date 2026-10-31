import { Controller, Get } from '@nestjs/common';
import type { ValidatedCatalog } from '../../interfaces/catalog.interface.js';
import { CatalogService } from './catalog.service.js';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async getCatalog(): Promise<ValidatedCatalog> {
    return this.catalogService.getValidatedCatalog();
  }
}
