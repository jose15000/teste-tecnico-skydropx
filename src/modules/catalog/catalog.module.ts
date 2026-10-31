import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogRepository } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [IntegrationsModule],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository],
  exports: [CatalogService, CatalogRepository],
})
export class CatalogModule {}
