import { Injectable } from '@nestjs/common';
import type {
  CatalogData,
  CatalogItem,
  CatalogParameters,
  ShippingAddress,
} from '../../interfaces/catalog.interface.js';
import {
  parseSheetBoolean,
  parseSheetNumber,
} from '../../utils/sheet-parser.util.js';
import { GoogleSheetsClient } from '../integrations/google-sheets/google-sheets.client.js';

@Injectable()
export class CatalogRepository {
  constructor(private readonly client: GoogleSheetsClient) {}

  async fetchRawProducts(range = 'Products!A2:I'): Promise<CatalogItem[]> {
    const rows = await this.client.getRows(range);

    return rows.map((row, index) => ({
      rowNumber: index + 2,
      sku: String(row[0] ?? '').trim(),
      name: String(row[1] ?? '').trim(),
      lengthCm: parseSheetNumber(row[2]),
      widthCm: parseSheetNumber(row[3]),
      heightCm: parseSheetNumber(row[4]),
      weightKg: parseSheetNumber(row[5]),
      quantity: parseSheetNumber(row[6]),
      fragile: parseSheetBoolean(row[7]),
      valueMxn: parseSheetNumber(row[8]),
    }));
  }

  async fetchParameters(range = 'Parameters!A2:B'): Promise<CatalogParameters> {
    const rows = await this.client.getRows(range);
    const get = (key: string) =>
      rows.find(([k]) => k?.trim().toLowerCase() === key)?.[1]?.trim() ?? '';

    return {
      constraints: {
        maxSideCm: parseSheetNumber(get('lado_maximo_cm')),
        maxBoxWeightKg: parseSheetNumber(get('peso_maximo_kg')),
        clearanceCm: parseSheetNumber(get('holgura_cm')),
        boxTareWeightKg: parseSheetNumber(get('tara_kg')),
        volumetricFactor: parseSheetNumber(get('divisor_volumetrico')),
      },
      originAddress: this.mapAddress(get, 'origen'),
      destinationAddress: this.mapAddress(get, 'destino'),
    };
  }

  async fetchCatalogData(): Promise<CatalogData> {
    const [items, parameters] = await Promise.all([
      this.fetchRawProducts(),
      this.fetchParameters(),
    ]);

    return { items, ...parameters };
  }

  private mapAddress(
    get: (k: string) => string,
    prefix: 'origen' | 'destino',
  ): ShippingAddress {
    return {
      name: get(`${prefix}_nombre`),
      street1: get(`${prefix}_direccion`),
      city: get(`${prefix}_ciudad`),
      province: get(`${prefix}_estado`),
      postalCode: get(`${prefix}_cp`),
      countryCode: 'MX',
      phone: get(`${prefix}_telefono`),
      email: get(`${prefix}_email`),
    };
  }
}
