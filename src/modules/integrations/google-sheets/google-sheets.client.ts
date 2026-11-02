import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, type sheets_v4 } from 'googleapis';
import type { CellValue, SheetRow } from '../../../interfaces/sheets.interface.js';

@Injectable()
export class GoogleSheetsClient implements OnModuleInit {
  private readonly logger = new Logger(GoogleSheetsClient.name);
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;
  private sheetTitles: string[] = [];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const clientEmail = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    );
    const rawPrivateKey = this.configService.get<string>('GOOGLE_PRIVATE_KEY');
    const spreadsheetId = this.configService.get<string>('GOOGLE_SHEET_ID');

    if (!clientEmail || !rawPrivateKey || !spreadsheetId) {
      this.logger.warn(
        'Credenciais do Google Sheets ausentes no .env (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY ou GOOGLE_SHEET_ID).',
      );
      return;
    }

    let privateKey = rawPrivateKey.trim();
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
    this.spreadsheetId = spreadsheetId.trim();

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    await this.loadSheetTitles();
    this.logger.log('GoogleSheetsClient inicializado com sucesso');
  }

  async loadSheetTitles(): Promise<string[]> {
    if (this.sheetTitles.length > 0) return this.sheetTitles;
    if (!this.sheets || !this.spreadsheetId) return [];

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'sheets.properties.title',
      });
      this.sheetTitles = (response.data.sheets ?? [])
        .map((s) => s.properties?.title?.trim() ?? '')
        .filter(Boolean);
      this.logger.log(`Detected spreadsheet tabs: ${this.sheetTitles.join(', ')}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not load spreadsheet sheet titles: ${message}`);
    }
    return this.sheetTitles;
  }

  /**
   * Translates English or unquoted sheet tab ranges into the actual sheet tab titles found in the spreadsheet.
   * E.g., 'Parameters!A2:B' -> ''Parámetros'!A2:B', 'Products!A2:I' -> ''Productos'!A2:I'
   */
  resolveRange(range: string): string {
    const match = range.match(/^(?:'([^']+)'|([^!]+))!(.+)$/);
    if (!match) return range;

    const rawSheet = (match[1] || match[2]).trim();
    const cells = match[3];

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const targetNorm = normalize(rawSheet);

    if (this.sheetTitles.length > 0) {
      // 1. Exact match in spreadsheet
      const exact = this.sheetTitles.find(
        (t) => t === rawSheet || normalize(t) === targetNorm,
      );
      if (exact) return `'${exact}'!${cells}`;

      // 2. Semantic multilingual alias matching
      const aliases = [
        { patterns: ['product', 'producto'] },
        { patterns: ['param', 'parametro'] },
        { patterns: ['box', 'caja'] },
        { patterns: ['quot', 'cotiz'] },
        { patterns: ['label', 'guia'] },
      ];

      for (const alias of aliases) {
        if (alias.patterns.some((p) => targetNorm.includes(p))) {
          const found = this.sheetTitles.find((t) =>
            alias.patterns.some((p) => normalize(t).includes(p)),
          );
          if (found) return `'${found}'!${cells}`;
        }
      }
    }

    // Default: ensure quotes if sheet name has accents/spaces
    if (/[^\w]/.test(rawSheet) || rawSheet.includes(' ')) {
      return `'${rawSheet}'!${cells}`;
    }
    return range;
  }

  async getRows(range: string): Promise<string[][]> {
    const resolvedRange = this.resolveRange(range);
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: resolvedRange,
    });

    return (response.data.values as string[][] | undefined) ?? [];
  }

  async appendRow(range: string, row: CellValue[]): Promise<void> {
    await this.appendRows(range, [row]);
  }

  async appendRows(range: string, rows: SheetRow[]): Promise<void> {
    const resolvedRange = this.resolveRange(range);
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: resolvedRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });
  }

  async updateRange(range: string, values: SheetRow[]): Promise<void> {
    const resolvedRange = this.resolveRange(range);
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: resolvedRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
  }

  async clearRange(range: string): Promise<void> {
    const resolvedRange = this.resolveRange(range);
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: resolvedRange,
    });
  }
}
