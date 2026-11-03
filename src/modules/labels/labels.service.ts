import * as fs from 'node:fs';
import { Injectable, Logger } from '@nestjs/common';
import { CatalogRepository } from '../catalog/catalog.repository.js';
import { SkydropxClient } from '../integrations/skydropx/skydropx.client.js';
import { LabelsRepository } from './labels.repository.js';
import { PackagingRepository } from '../packaging/packaging.repository.js';
import { QuotationsRepository } from '../quotations/quotations.repository.js';
import { buildAutomationReport } from '../automation/report-analyzer.js';
import { extractAndSaveLabel } from './label-downloader.util.js';
import { buildShipmentPayload } from './label-payload.util.js';
import type { GeneratedLabel, GenerateLabelsResult, LabelGenerationError } from '../../interfaces/labels.interface.js';

@Injectable()
export class LabelsService {
  private readonly logger = new Logger(LabelsService.name);

  constructor(
    private readonly labelsRepo: LabelsRepository,
    private readonly packagingRepo: PackagingRepository,
    private readonly quotationsRepo: QuotationsRepository,
    private readonly catalogRepo: CatalogRepository,
    private readonly skydropx: SkydropxClient,
  ) {}

  async getLabels(): Promise<GeneratedLabel[]> {
    return this.labelsRepo.fetchLabels();
  }

  async generateLabels(): Promise<GenerateLabelsResult> {
    const [boxes, quotes, existing, catalogData] = await Promise.all([
      this.packagingRepo.fetchBoxes(),
      this.quotationsRepo.fetchQuotations(),
      this.labelsRepo.fetchLabels(),
      this.catalogRepo.fetchCatalogData(),
    ]);

    const report = buildAutomationReport(boxes, quotes);
    const recStrategy = report.recommendation.strategy;
    const strategyBoxes = report.strategies.find((s) => s.strategy === recStrategy)?.boxes ?? [];

    const existingByBox = new Map(existing.map((l) => [l.boxId, l]));
    const generated: GeneratedLabel[] = [];
    const skipped: GeneratedLabel[] = [];
    const errors: LabelGenerationError[] = [];

    for (const box of strategyBoxes) {
      const option = box.bestBalance || box.cheapest;
      if (!option?.rateId) {
        errors.push({ boxId: box.boxId, error: 'No quotation rate found for box.' });
        continue;
      }

      const existingLabel = existingByBox.get(box.boxId);
      if (existingLabel && fs.existsSync(existingLabel.pdfFilename)) {
        this.logger.log(`Idempotency: skipping ${box.boxId}, label already exists (${existingLabel.trackingNumber}).`);
        skipped.push(existingLabel);
        continue;
      }

      try {
        const payload = buildShipmentPayload(
          option.rateId,
          catalogData,
          box.containedSkus,
          catalogData.items,
        );
        const shipment = await this.skydropx.createShipment(payload);

        const labelData = await extractAndSaveLabel(
          shipment,
          box.boxId,
          (id) => this.skydropx.pollShipmentUntilReady(id),
        );

        generated.push({
          boxId: box.boxId,
          carrier: option.carrier,
          service: option.service,
          price: option.totalPriceMxn,
          trackingNumber: labelData.trackingNumber,
          pdfFilename: labelData.pdfFilename,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to generate label for ${box.boxId}: ${errorMsg}`);
        errors.push({ boxId: box.boxId, carrier: option.carrier, service: option.service, error: errorMsg });
      }
    }

    if (generated.length > 0) {
      await this.labelsRepo.saveLabels(generated);
    }

    const totalCostMxn = Number(
      [...generated, ...skipped].reduce((sum, l) => sum + l.price, 0).toFixed(2),
    );

    return { generated, skipped, errors, totalCostMxn };
  }
}
