import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AutomationModule } from './modules/automation/automation.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { IntegrationsModule } from './modules/integrations/integrations.module.js';
import { LabelsModule } from './modules/labels/labels.module.js';
import { PackagingModule } from './modules/packaging/packaging.module.js';
import { QuotationsModule } from './modules/quotations/quotations.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    IntegrationsModule,
    CatalogModule,
    PackagingModule,
    QuotationsModule,
    LabelsModule,
    AutomationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
