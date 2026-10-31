import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { LabelsModule } from '../labels/labels.module.js';
import { PackagingModule } from '../packaging/packaging.module.js';
import { QuotationsModule } from '../quotations/quotations.module.js';
import { AutomationController } from './automation.controller.js';
import { AutomationService } from './automation.service.js';

@Module({
  imports: [
    IntegrationsModule,
    CatalogModule,
    PackagingModule,
    QuotationsModule,
    LabelsModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
