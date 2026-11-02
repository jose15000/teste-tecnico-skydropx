/** Parses a spreadsheet cell to number (comma decimals and currency symbols accepted). Returns NaN when empty/invalid. */
export function parseSheetNumber(value: unknown): number {
  let text = String(value ?? '').trim().replace(/\$/g, '').replace(/\s/g, '');
  if (!text) return Number.NaN;

  // Handle thousand separators: "3.200" or "3,200"
  if (/^\d+\.\d{3}$/.test(text)) {
    text = text.replace('.', '');
  } else if (/^\d+,\d{3}$/.test(text)) {
    text = text.replace(',', '');
  } else {
    text = text.replace(',', '.');
  }

  const result = Number(text);
  return Number.isNaN(result) ? Number.NaN : result;
}

/** Parses a spreadsheet cell to boolean, accent-insensitive (si, sí, sim, true, 1, yes). */
export function parseSheetBoolean(value: unknown): boolean {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return ['si', 'sim', 'true', '1', 'yes'].includes(text);
}
