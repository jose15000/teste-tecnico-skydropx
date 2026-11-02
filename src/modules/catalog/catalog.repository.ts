import { Injectable } from '@nestjs/common';
import type {
  CatalogData,
  CatalogItem,
  CatalogParameters,
} from '../../interfaces/catalog.interface.js';
import { parseSheetBoolean, parseSheetNumber } from '../../utils/sheet-parser.util.js';
import { GoogleSheetsClient } from '../integrations/google-sheets/google-sheets.client.js';

@Injectable()
export class CatalogRepository {
  constructor(private readonly client: GoogleSheetsClient) {}

  /**
   * Fetches product items from the spreadsheet.
   * Resilient to column order (via header matching), language (ES/EN), and presence of 'Categoría' or summary rows.
   */
  async fetchRawProducts(range = 'Productos!A1:Z'): Promise<CatalogItem[]> {
    const rows = await this.client.getRows(range);
    if (!rows.length) return [];

    const norm = (s: unknown) =>
      String(s ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const isHeaderRow = (row: string[]): boolean => {
      const line = row.map(norm).join(' ');
      return (
        line.includes('sku') ||
        line.includes('producto') ||
        line.includes('largo') ||
        line.includes('peso')
      );
    };

    if (isHeaderRow(rows[0])) {
      const headers = rows[0].map(norm);
      const findCol = (patterns: string[], fallback: number): number => {
        const idx = headers.findIndex((h) => patterns.some((p) => h.includes(p)));
        return idx !== -1 ? idx : fallback;
      };

      const colSku = findCol(['sku'], 0);
      const colName = findCol(['producto', 'name', 'articulo', 'descripcion'], 1);
      const colLength = findCol(['largo', 'length'], 3);
      const colWidth = findCol(['ancho', 'width'], 4);
      const colHeight = findCol(['alto', 'height'], 5);
      const colWeight = findCol(['peso', 'weight'], 6);
      const colQty = findCol(['cantidad', 'qty', 'quantity'], 7);
      const colFragile = findCol(['fragil', 'fragile'], 8);
      const colValue = findCol(['valor', 'precio', 'value', 'price'], 9);

      const items: CatalogItem[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const sku = String(row[colSku] ?? '').trim();
        if (!sku || sku.toUpperCase() === 'TOTAL') continue;

        items.push({
          rowNumber: i + 1,
          sku,
          name: String(row[colName] ?? '').trim(),
          lengthCm: parseSheetNumber(row[colLength]),
          widthCm: parseSheetNumber(row[colWidth]),
          heightCm: parseSheetNumber(row[colHeight]),
          weightKg: parseSheetNumber(row[colWeight]),
          quantity: parseSheetNumber(row[colQty]),
          fragile: parseSheetBoolean(row[colFragile]),
          valueMxn: parseSheetNumber(row[colValue]),
        });
      }
      return items;
    }

    // Rows without headers (e.g. range = 'Productos!A2:I')
    const hasCategory = rows[0].length >= 10;
    const items: CatalogItem[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sku = String(row[0] ?? '').trim();
      if (!sku || sku.toUpperCase() === 'TOTAL') continue;

      items.push({
        rowNumber: i + 2,
        sku,
        name: String(row[1] ?? '').trim(),
        lengthCm: parseSheetNumber(hasCategory ? row[3] : row[2]),
        widthCm: parseSheetNumber(hasCategory ? row[4] : row[3]),
        heightCm: parseSheetNumber(hasCategory ? row[5] : row[4]),
        weightKg: parseSheetNumber(hasCategory ? row[6] : row[5]),
        quantity: parseSheetNumber(hasCategory ? row[7] : row[6]),
        fragile: parseSheetBoolean(hasCategory ? row[8] : row[7]),
        valueMxn: parseSheetNumber(hasCategory ? row[9] : row[8]),
      });
    }
    return items;
  }

  /**
   * Fetches packaging parameters and shipping addresses.
   * Handles natural Spanish parameter names (from original Skydropx sheet) as well as snake_case / English keys.
   * Defaults test sender and recipient addresses according to the challenge requirements when not explicitly specified in the sheet.
   */
  async fetchParameters(range = 'Parámetros!A1:C30'): Promise<CatalogParameters> {
    const rows = await this.client.getRows(range);
    const norm = (s: unknown) =>
      String(s ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const paramMap = new Map<string, string>();
    for (const [k, v] of rows) {
      if (k) paramMap.set(norm(k), String(v ?? '').trim());
    }

    const getParam = (...patterns: string[]): string => {
      for (const [key, val] of paramMap.entries()) {
        if (patterns.some((p) => key.includes(p) || key === p)) return val;
      }
      return '';
    };

    const maxSideCm =
      parseSheetNumber(getParam('lado maximo', 'lado_maximo', 'max_side')) || 60;
    const maxBoxWeightKg =
      parseSheetNumber(getParam('peso maximo', 'peso_maximo', 'max_weight')) || 25;
    const clearanceCm =
      parseSheetNumber(getParam('holgura', 'clearance')) ?? 2;
    const boxTareWeightKg =
      parseSheetNumber(getParam('tara', 'tare')) ?? 0.4;
    const volumetricFactor =
      parseSheetNumber(getParam('divisor', 'volumetric_factor')) || 5000;

    const cleanZip = (raw: string, fallback: string): string => {
      const cleaned = (raw || fallback).split('.')[0].replace(/\D/g, '');
      return cleaned.padStart(5, '0');
    };

    const cpOrigen = cleanZip(
      getParam('cp origen', 'origen_cp', 'origen cp', 'codigo postal origen'),
      '44100',
    );
    const cpDestino = cleanZip(
      getParam('cp destino', 'destino_cp', 'destino cp', 'codigo postal destino'),
      '06600',
    );

    return {
      constraints: {
        maxSideCm,
        maxBoxWeightKg,
        clearanceCm: Number.isNaN(clearanceCm) ? 2 : clearanceCm,
        boxTareWeightKg: Number.isNaN(boxTareWeightKg) ? 0.4 : boxTareWeightKg,
        volumetricFactor,
      },
      originAddress: {
        name: getParam('origen_nombre', 'nombre origen') || 'Demo Store Challenge',
        street1: getParam('origen_direccion', 'direccion origen') || 'Av. Juárez 100, Col. Centro',
        city: getParam('origen_ciudad', 'ciudad origen') || 'Guadalajara',
        province: getParam('origen_estado', 'estado origen') || 'Jalisco',
        postalCode: cpOrigen,
        countryCode: 'MX',
        phone: getParam('origen_telefono', 'telefono origen') || '3312345678',
        email: getParam('origen_email', 'email origen') || 'origen@example.com',
      },
      destinationAddress: {
        name: getParam('destino_nombre', 'nombre destino') || 'Test Customer',
        street1: getParam('destino_direccion', 'direccion destino') || 'Calle Hamburgo 50, Col. Juárez',
        city: getParam('destino_ciudad', 'ciudad destino') || 'Cuauhtémoc',
        province: getParam('destino_estado', 'estado destino') || 'Ciudad de México',
        postalCode: cpDestino,
        countryCode: 'MX',
        phone: getParam('destino_telefono', 'telefono destino') || '5512345678',
        email: getParam('destino_email', 'email destino') || 'destino@example.com',
      },
    };
  }

  async fetchCatalogData(): Promise<CatalogData> {
    const [items, parameters] = await Promise.all([
      this.fetchRawProducts(),
      this.fetchParameters(),
    ]);
    return { items, ...parameters };
  }
}
