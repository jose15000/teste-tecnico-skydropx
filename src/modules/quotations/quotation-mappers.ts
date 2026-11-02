import type { ShippingAddress } from '../../interfaces/catalog.interface.js';
import type { PackedBox } from '../../interfaces/packaging.interface.js';
import type { QuotationSheetRow } from '../../interfaces/sheets.interface.js';
import type { QuotationRate } from '../../interfaces/shipping.interface.js';
import type {
  SkydropxAddressPayload,
  SkydropxParcelPayload,
  SkydropxRateResponse,
} from '../../interfaces/skydropx.interface.js';

/**
 * Maps a ShippingAddress into a Skydropx Mexican national address payload.
 */
export function toAddressPayload(address: ShippingAddress): SkydropxAddressPayload {
  const coloniaMatch = address.street1?.match(/(?:colonia|col\.?)\s+([^,]+)/i);
  const area_level3 = coloniaMatch?.[1]?.trim() || address.city;

  return {
    country_code: address.countryCode || 'MX',
    postal_code: address.postalCode,
    area_level1: address.province,
    area_level2: address.city,
    area_level3,
  };
}

/**
 * Maps a PackedBox into a Skydropx parcel payload.
 */
export function toParcelPayload(box: PackedBox): SkydropxParcelPayload {
  return {
    length: Math.max(1, Math.ceil(box.externalDimensions.lengthCm)),
    width: Math.max(1, Math.ceil(box.externalDimensions.widthCm)),
    height: Math.max(1, Math.ceil(box.externalDimensions.heightCm)),
    weight: Math.max(1, Number(box.actualWeightKg.toFixed(2))),
  };
}

/**
 * Normalizes raw Skydropx carrier rates and scores price-delivery balance.
 */
export function normalizeRates(rawRates: SkydropxRateResponse[] = []): QuotationRate[] {
  const valueOfDayMxn = 35; // Valuation of 1 business day saved

  return rawRates.map((raw) => {
    const totalPrice = Number.parseFloat(String(raw.total || raw.amount || '0')) || 0;
    const deliveryDays = typeof raw.days === 'number' && !Number.isNaN(raw.days) ? raw.days : 0;
    const isSuccess = Boolean(raw.success && totalPrice > 0);

    const balanceScore = isSuccess
      ? Number((totalPrice + (deliveryDays || 5) * valueOfDayMxn).toFixed(2))
      : Number.POSITIVE_INFINITY;

    return {
      rateId: raw.id,
      carrier: raw.provider_display_name || raw.provider_name || 'Desconocido',
      service: raw.provider_service_name || raw.provider_service_code || 'Estándar',
      totalPrice: Number(totalPrice.toFixed(2)),
      currency: raw.currency_code || 'MXN',
      deliveryDays,
      success: isSuccess,
      status: raw.status || (isSuccess ? 'approved' : 'failed'),
      balanceScore,
    };
  });
}

/**
 * Selects the cheapest, fastest, and best balance rates among valid options.
 */
export function findBestRates(rates: QuotationRate[]): {
  cheapest?: QuotationRate;
  fastest?: QuotationRate;
  bestBalance?: QuotationRate;
} {
  const valid = rates.filter((r) => r.success && r.totalPrice > 0);
  if (valid.length === 0) return {};

  const cheapest = valid.reduce((prev, curr) => (curr.totalPrice < prev.totalPrice ? curr : prev));

  const validWithDays = valid.filter((r) => r.deliveryDays > 0);
  const fastest = validWithDays.length > 0
    ? validWithDays.reduce((prev, curr) => {
        if (curr.deliveryDays < prev.deliveryDays) return curr;
        if (curr.deliveryDays === prev.deliveryDays && curr.totalPrice < prev.totalPrice) return curr;
        return prev;
      })
    : undefined;

  const validWithScore = valid.filter((r) => Number.isFinite(r.balanceScore));
  const bestBalance = validWithScore.length > 0
    ? validWithScore.reduce((prev, curr) => (curr.balanceScore! < prev.balanceScore! ? curr : prev))
    : undefined;

  return { cheapest, fastest, bestBalance };
}

/**
 * Maps rates or fallback errors to Google Sheet row interfaces.
 */
export function toSheetRows(
  rates: QuotationRate[],
  strategy: string,
  boxId: string,
): QuotationSheetRow[] {
  const validRates = rates.filter((r) => r.success && r.totalPrice > 0);
  const quotedAt = new Date().toISOString();

  if (validRates.length === 0) {
    return [
      {
        strategy,
        boxId,
        carrier: 'N/A',
        service: 'N/A',
        totalPriceMxn: 0,
        estimatedDays: 0,
        rateId: '',
        quotedAt,
        status: 'failed',
        error: 'No valid rates returned or quotation failed',
      },
    ];
  }

  return validRates.map((r) => ({
    strategy,
    boxId,
    carrier: r.carrier,
    service: r.service,
    totalPriceMxn: r.totalPrice,
    estimatedDays: r.deliveryDays,
    rateId: r.rateId,
    quotedAt,
    status: r.status || (r.success ? 'approved' : 'failed'),
  }));
}
