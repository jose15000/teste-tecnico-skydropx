import type { CellValue } from '../interfaces/sheets.interface.js';

export function parseSheetNumber(value: CellValue | undefined): number {
  if (value === undefined || value === null || String(value).trim() === '') {
    return Number.NaN;
  }
  const normalized = String(value).replace(',', '.').trim();
  return Number(normalized);
}

export function parseSheetBoolean(value: CellValue | undefined): boolean {
  if (!value) return false;
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return ['si', 'sim', 'true', '1', 'yes'].includes(normalized);
}
