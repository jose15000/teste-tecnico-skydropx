import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { PackagingModule } from '../packaging/packaging.module.js';
import { QuotationsModule } from '../quotations/quotations.module.js';
import { LabelsController } from './labels.controller.js';
import { LabelsRepository } from './labels.repository.js';
import { LabelsService } from './labels.service.js';

@Module({
  imports: [IntegrationsModule, CatalogModule, PackagingModule, QuotationsModule],
  controllers: [LabelsController],
  providers: [LabelsService, LabelsRepository],
  exports: [LabelsService, LabelsRepository],
})
export class LabelsModule {}
