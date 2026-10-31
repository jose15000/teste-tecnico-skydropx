import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { QuotationsController } from './quotations.controller.js';
import { QuotationsRepository } from './quotations.repository.js';
import { QuotationsService } from './quotations.service.js';

@Module({
  imports: [IntegrationsModule],
  controllers: [QuotationsController],
  providers: [QuotationsService, QuotationsRepository],
  exports: [QuotationsService, QuotationsRepository],
})
export class QuotationsModule {}
