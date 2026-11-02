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

  async fetchBoxes(range = 'Boxes!A2:J'): Promise<BoxSheetRow[]> {
    const rawRows = await this.client.getRows(range);
    return rawRows.map((row) => ({
      strategy: String(row[0] ?? '').trim(),
      boxId: String(row[1] ?? '').trim(),
      externalLengthCm: Number.parseFloat(String(row[2] ?? '0')) || 0,
      externalWidthCm: Number.parseFloat(String(row[3] ?? '0')) || 0,
      externalHeightCm: Number.parseFloat(String(row[4] ?? '0')) || 0,
      actualWeightKg: Number.parseFloat(String(row[5] ?? '0').replace(',', '.')) || 0,
      volumetricWeightKg: Number.parseFloat(String(row[6] ?? '0').replace(',', '.')) || 0,
      billableWeightKg: Number.parseFloat(String(row[7] ?? '0').replace(',', '.')) || 0,
      occupancyPercent: Number.parseFloat(String(row[8] ?? '0').replace(',', '.')) || 0,
      containedSkus: String(row[9] ?? '').trim(),
    }));
  }
}
