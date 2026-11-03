import { describe, expect, it } from 'vitest';
import { buildShipmentPayload, parseContainedSkus } from './label-payload.util.js';
import type { CatalogItem, CatalogParameters } from '../../interfaces/catalog.interface.js';

describe('label-payload.util', () => {
  it('parses formatted containedSkus correctly', () => {
    const raw = 'SKU-001 (x3), SKU-002, SKU-005 (x2)';
    const parsed = parseContainedSkus(raw);

    expect(parsed).toEqual([
      { sku: 'SKU-001', quantity: 3 },
      { sku: 'SKU-002', quantity: 1 },
      { sku: 'SKU-005', quantity: 2 },
    ]);
  });

  it('builds dynamic shipment payload with products and declared value', () => {
    const params: CatalogParameters = {
      constraints: { maxSideCm: 60, maxBoxWeightKg: 25, clearanceCm: 2, boxTareWeightKg: 0.4, volumetricFactor: 5000 },
      originAddress: { name: 'Demo Store', street1: 'Av. Juarez 100', city: 'Guadalajara', province: 'Jalisco', postalCode: '44100', countryCode: 'MX', phone: '3312345678', email: 'origen@example.com' },
      destinationAddress: { name: 'Customer', street1: 'Calle Hamburgo 50', city: 'CDMX', province: 'CDMX', postalCode: '06600', countryCode: 'MX', phone: '5512345678', email: 'destino@example.com' },
    };

    const items: CatalogItem[] = [
      { sku: 'SKU-001', name: 'Teclado Mecanico', valueMxn: 800, weightKg: 1, lengthCm: 30, widthCm: 15, heightCm: 5, quantity: 5, fragile: false, rowNumber: 2 },
      { sku: 'SKU-002', name: 'Mouse Gamer', valueMxn: 350, weightKg: 0.2, lengthCm: 12, widthCm: 6, heightCm: 4, quantity: 5, fragile: false, rowNumber: 3 },
    ];

    const payload = buildShipmentPayload('rate-123', params, 'SKU-001 (x2), SKU-002 (x1)', items);

    expect(payload.shipment.rate_id).toBe('rate-123');
    expect(payload.shipment.packages?.[0].package_type).toBe('4G');
    expect(payload.shipment.packages?.[0].declared_value).toBe(1950); // 2*800 + 1*350 = 1950
    expect(payload.shipment.packages?.[0].products).toHaveLength(2);
    expect(payload.shipment.packages?.[0].products?.[0].sku).toBe('SKU-001');
    expect(payload.shipment.packages?.[0].products?.[0].quantity).toBe(2);
    expect(payload.shipment.packages?.[0].products?.[1].sku).toBe('SKU-002');
  });
});
