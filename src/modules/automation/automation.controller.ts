import { Controller, Get, Post } from '@nestjs/common';
import type { AutomationRunResult } from '../../interfaces/automation.interface.js';
import type { AutomationReport } from '../../interfaces/report.interface.js';
import { AutomationService } from './automation.service.js';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automation: AutomationService) {}

  @Post('run')
  run(): Promise<AutomationRunResult> {
    return this.automation.run();
  }

  @Get('report')
  getReport(): Promise<AutomationReport> {
    return this.automation.getReport();
  }
}
