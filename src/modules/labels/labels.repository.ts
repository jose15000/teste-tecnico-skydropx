import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsClient } from '../integrations/google-sheets/google-sheets.client.js';
import type { GeneratedLabel } from '../../interfaces/labels.interface.js';

@Injectable()
export class LabelsRepository {
  private readonly logger = new Logger(LabelsRepository.name);

  constructor(private readonly sheetsClient: GoogleSheetsClient) {}

  async fetchLabels(range = 'Guías!A2:G'): Promise<GeneratedLabel[]> {
    try {
      const rows = await this.sheetsClient.getRows(range);
      return rows
        .filter((row) => row.length >= 5 && row[0]?.trim())
        .map((row) => ({
          boxId: (row[0] || '').trim(),
          carrier: (row[1] || '').trim(),
          service: (row[2] || '').trim(),
          price: Number.parseFloat((row[3] || '0').replace(',', '.')) || 0,
          trackingNumber: (row[4] || '').trim(),
          pdfFilename: (row[5] || '').trim(),
          createdAt: (row[6] || '').trim(),
        }));
    } catch (error) {
      this.logger.warn(`Could not fetch existing labels: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async saveLabels(labels: GeneratedLabel[], range = 'Guías!A:G'): Promise<void> {
    if (labels.length === 0) return;
    const rows = labels.map((l) => [
      l.boxId,
      l.carrier,
      l.service,
      l.price.toFixed(2).replace('.', ','),
      l.trackingNumber,
      l.pdfFilename,
      l.createdAt,
    ]);
    await this.sheetsClient.appendRows(range, rows);
    this.logger.log(`Saved ${labels.length} label(s) to ${range}.`);
  }
}
