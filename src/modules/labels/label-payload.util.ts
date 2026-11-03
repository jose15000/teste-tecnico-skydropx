import type { CatalogItem, CatalogParameters } from '../../interfaces/catalog.interface.js';
import type { SkydropxCreateShipmentPayload } from '../../interfaces/skydropx.interface.js';

export function parseContainedSkus(raw?: string): { sku: string; quantity: number }[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^([^(]+)(?:\s*\(x(\d+)\))?$/);
      if (!match) return { sku: part, quantity: 1 };
      return {
        sku: match[1].trim(),
        quantity: match[2] ? Number.parseInt(match[2], 10) : 1,
      };
    });
}

export function buildShipmentPayload(
  rateId: string,
  params: CatalogParameters,
  containedSkus?: string,
  catalogItems: CatalogItem[] = [],
): SkydropxCreateShipmentPayload {
  const { originAddress: org, destinationAddress: dst } = params;
  const itemsMap = new Map(catalogItems.map((item) => [item.sku, item]));
  const parsed = parseContainedSkus(containedSkus);

  const products = parsed.map(({ sku, quantity }) => {
    const item = itemsMap.get(sku);
    return {
      name: item?.name || sku,
      sku,
      quantity,
      price: item?.valueMxn || 100,
      product_type_code: 'P',
      product_type_name: 'Producto',
      country_code: 'MX',
    };
  });

  const declaredValue = Number(
    products.reduce((sum, p) => sum + p.price * p.quantity, 0).toFixed(2),
  );

  return {
    shipment: {
      rate_id: rateId,
      unique_shipment: true,
      address_from: {
        name: org.name?.slice(0, 30) || 'Demo Store',
        company: 'Demo Store Challenge',
        street1: org.street1?.slice(0, 45) || 'Av. Juarez 100',
        phone: org.phone || '3312345678',
        email: org.email || 'origen@example.com',
        reference: 'Bodega Central',
        postal_code: org.postalCode,
        country_code: org.countryCode || 'MX',
        area_level1: org.province || 'Jalisco',
        area_level2: org.city || 'Guadalajara',
        area_level3: 'Centro',
      },
      address_to: {
        name: dst.name?.slice(0, 30) || 'Test Customer',
        company: 'Customer Inc',
        street1: dst.street1?.slice(0, 45) || 'Calle Hamburgo 50',
        phone: dst.phone || '5512345678',
        email: dst.email || 'destino@example.com',
        reference: 'Frente al parque',
        postal_code: dst.postalCode,
        country_code: dst.countryCode || 'MX',
        area_level1: dst.province || 'Ciudad de Mexico',
        area_level2: dst.city || 'Cuauhtemoc',
        area_level3: 'Juarez',
      },
      packages: [
        {
          package_number: '1',
          package_type: '4G',
          consignment_note: '53102400',
          package_protected: false,
          declared_value: declaredValue > 0 ? declaredValue : 100,
          products: products.length > 0 ? products : undefined,
        },
      ],
    },
  };
}
