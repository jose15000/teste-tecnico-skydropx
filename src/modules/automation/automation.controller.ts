import { Controller, Post } from '@nestjs/common';
import type { AutomationRunResult } from '../../interfaces/automation.interface.js';
import { AutomationService } from './automation.service.js';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automation: AutomationService) {}

  @Post('run')
  run(): Promise<AutomationRunResult> {
    return this.automation.run();
  }
}
