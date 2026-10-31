import { z } from 'zod';
import type { PackagingConstraints } from '../interfaces/catalog.interface.js';

export const shippingAddressSchema = z.object({
  name: z.string().min(1, 'Address name is required'),
  street1: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province/state is required'),
  postalCode: z
    .string()
    .trim()
    .length(5, 'ZIP code must contain exactly 5 digits')
    .refine(
      (val) => val.split('').every((ch) => ch >= '0' && ch <= '9'),
      'ZIP code must contain only digits',
    ),
  countryCode: z.string().min(2),
  phone: z.string().min(1, 'Phone is required'),
  email: z.email('Invalid email format'),
});

export const packagingConstraintsSchema = z
  .object({
    maxSideCm: z.number().positive('lado_maximo_cm must be > 0'),
    maxBoxWeightKg: z.number().positive('peso_maximo_kg must be > 0'),
    clearanceCm: z.number().nonnegative('holgura_cm must be >= 0'),
    boxTareWeightKg: z.number().nonnegative('tara_kg must be >= 0'),
    volumetricFactor: z.number().positive('divisor_volumetrico must be > 0'),
  })
  .refine((c) => c.boxTareWeightKg < c.maxBoxWeightKg, {
    message: 'tara_kg must be less than peso_maximo_kg',
    path: ['boxTareWeightKg'],
  });

export const catalogParametersSchema = z.object({
  constraints: packagingConstraintsSchema,
  originAddress: shippingAddressSchema,
  destinationAddress: shippingAddressSchema,
});

export function createCatalogItemSchema(constraints: PackagingConstraints) {
  return z
    .object({
      rowNumber: z.number().int().positive(),
      sku: z.string().min(1, 'SKU is required'),
      name: z.string().min(1, 'Product name is required'),
      lengthCm: z.number().positive('lengthCm must be > 0'),
      widthCm: z.number().positive('widthCm must be > 0'),
      heightCm: z.number().positive('heightCm must be > 0'),
      weightKg: z.number().positive('weightKg must be > 0'),
      quantity: z
        .number()
        .int('Quantity must be an integer')
        .positive('Quantity must be > 0'),
      fragile: z.boolean(),
      valueMxn: z.number().nonnegative('Value (MXN) must be >= 0'),
    })
    .superRefine((item, ctx) => {
      const maxProductSide = Math.max(
        item.lengthCm,
        item.widthCm,
        item.heightCm,
      );
      if (maxProductSide + constraints.clearanceCm > constraints.maxSideCm) {
        ctx.addIssue({
          code: 'custom',
          path: ['lengthCm'],
          message: `Product (${item.lengthCm}x${item.widthCm}x${item.heightCm} cm) plus clearance (${constraints.clearanceCm} cm) exceeds max box side (${constraints.maxSideCm} cm)`,
        });
      }

      if (
        item.weightKg + constraints.boxTareWeightKg >
        constraints.maxBoxWeightKg
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['weightKg'],
          message: `Product weight (${item.weightKg} kg) plus box tare (${constraints.boxTareWeightKg} kg) exceeds max box weight (${constraints.maxBoxWeightKg} kg)`,
        });
      }
    });
}
