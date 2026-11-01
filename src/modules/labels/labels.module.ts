import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { LabelsRepository } from './labels.repository.js';
import { LabelsService } from './labels.service.js';

@Module({
  imports: [IntegrationsModule],
  providers: [LabelsService, LabelsRepository],
  exports: [LabelsService, LabelsRepository],
})
export class LabelsModule {}
