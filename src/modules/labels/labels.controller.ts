import { Controller, Get, Post } from '@nestjs/common';
import { LabelsService } from './labels.service.js';
import type { GeneratedLabel, GenerateLabelsResult } from '../../interfaces/labels.interface.js';

@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  async getLabels(): Promise<GeneratedLabel[]> {
    return this.labelsService.getLabels();
  }

  @Post('generate')
  async generateLabels(): Promise<GenerateLabelsResult> {
    return this.labelsService.generateLabels();
  }
}
