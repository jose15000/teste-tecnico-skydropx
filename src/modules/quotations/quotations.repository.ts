import { Injectable, Logger } from '@nestjs/common';
import type { QuotationSheetRow } from '../../interfaces/sheets.interface.js';
import { GoogleSheetsClient } from '../integrations/google-sheets/google-sheets.client.js';

@Injectable()
export class QuotationsRepository {
  private readonly logger = new Logger(QuotationsRepository.name);

  constructor(private readonly sheetsClient: GoogleSheetsClient) {}

  /**
   * Persists normalized quotation rates to the Google Sheets Quotations tab.
   */
  async saveQuotations(
    quotations: QuotationSheetRow[],
    range = 'Quotations!A2:I',
  ): Promise<void> {
    await this.sheetsClient.clearRange(range);
    if (quotations.length === 0) return;

    const rows = quotations.map((q) => [
      q.strategy,
      q.boxId,
      q.carrier,
      q.service,
      q.totalPriceMxn,
      q.estimatedDays,
      q.rateId,
      q.status,
      q.error ?? '',
    ]);

    await this.sheetsClient.appendRows(range, rows);
    this.logger.log(`Saved ${rows.length} quotation rows to ${range}.`);
  }

  /**
   * Fetches existing quotation rows from Google Sheets.
   */
  async fetchQuotations(range = 'Quotations!A2:I'): Promise<QuotationSheetRow[]> {
    const rawRows = await this.sheetsClient.getRows(range);

    return rawRows.map((row) => ({
      strategy: String(row[0] ?? '').trim(),
      boxId: String(row[1] ?? '').trim(),
      carrier: String(row[2] ?? '').trim(),
      service: String(row[3] ?? '').trim(),
      totalPriceMxn: Number.parseFloat(String(row[4] ?? '0')) || 0,
      estimatedDays: Number.parseInt(String(row[5] ?? '0'), 10) || 0,
      rateId: String(row[6] ?? '').trim(),
      status: String(row[7] ?? '').trim(),
      error: row[8] ? String(row[8]).trim() : undefined,
    }));
  }
}
