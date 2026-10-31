import { Injectable } from '@nestjs/common';
import type { BoxSheetRow } from '../../interfaces/sheets.interface.js';
import { GoogleSheetsClient } from '../integrations/google-sheets/google-sheets.client.js';

@Injectable()
export class PackagingRepository {
  constructor(private readonly client: GoogleSheetsClient) {}

  async saveBoxes(boxes: BoxSheetRow[], range = 'Boxes!A2:J'): Promise<void> {
    await this.client.clearRange(range);
    if (boxes.length === 0) return;

    const rows = boxes.map((b) => [
      b.strategy,
      b.boxId,
      b.externalLengthCm,
      b.externalWidthCm,
      b.externalHeightCm,
      b.actualWeightKg,
      b.volumetricWeightKg,
      b.billableWeightKg,
      b.occupancyPercent,
      b.containedSkus,
    ]);

    await this.client.appendRows(range, rows);
  }
}
