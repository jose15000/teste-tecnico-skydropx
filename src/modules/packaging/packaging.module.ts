import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { PackagingRepository } from './packaging.repository.js';
import { PackagingService } from './packaging.service.js';

@Module({
  imports: [IntegrationsModule],
  providers: [PackagingService, PackagingRepository],
  exports: [PackagingService, PackagingRepository],
})
export class PackagingModule {}
