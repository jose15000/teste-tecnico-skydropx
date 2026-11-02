import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, type sheets_v4 } from 'googleapis';
import type { CellValue, SheetRow } from '../../../interfaces/sheets.interface.js';

@Injectable()
export class GoogleSheetsClient implements OnModuleInit {
  private readonly logger = new Logger(GoogleSheetsClient.name);
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
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
    this.logger.log('GoogleSheetsClient inicializado com sucesso');
  }

  async getRows(range: string): Promise<string[][]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range,
    });

    return (response.data.values as string[][] | undefined) ?? [];
  }


  async appendRow(range: string, row: CellValue[]): Promise<void> {
    await this.appendRows(range, [row]);
  }


  async appendRows(range: string, rows: SheetRow[]): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });
  }


  async updateRange(range: string, values: SheetRow[]): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
  }


  async clearRange(range: string): Promise<void> {
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range,
    });
  }
}
