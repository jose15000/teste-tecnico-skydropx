import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { CatalogData } from '../../interfaces/catalog.interface.js';
import { CatalogRepository } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';

describe('CatalogService', () => {
  let service: CatalogService;

  const baseCatalogData: CatalogData = {
    constraints: {
      clearanceCm: 2,
      maxSideCm: 60,
      boxTareWeightKg: 0.3,
      maxBoxWeightKg: 25,
      volumetricFactor: 5000,
    },
    originAddress: {
      name: 'Demo Store Challenge',
      street1: 'Av. Juárez 100, Col. Centro',
      city: 'Guadalajara',
      province: 'Jalisco',
      postalCode: '44100',
      countryCode: 'MX',
      phone: '3312345678',
      email: 'origen@example.com',
    },
    destinationAddress: {
      name: 'Test Customer',
      street1: 'Calle Hamburgo 50, Col. Juárez',
      city: 'Cuauhtémoc',
      province: 'Ciudad de México',
      postalCode: '06600',
      countryCode: 'MX',
      phone: '5512345678',
      email: 'destino@example.com',
    },
    items: [
      {
        rowNumber: 2,
        sku: 'SKU-001',
        name: 'Monitor 24 pulgadas',
        lengthCm: 56,
        widthCm: 34,
        heightCm: 10,
        weightKg: 4.8,
        quantity: 2,
        fragile: true,
        valueMxn: 3200,
      },
      {
        rowNumber: 3,
        sku: 'SKU-002',
        name: 'Monitor 27 pulgadas',
        lengthCm: 58,
        widthCm: 36,
        heightCm: 11,
        weightKg: 6.2,
        quantity: 1,
        fragile: true,
        valueMxn: 4500,
      },
    ],
  };

  const mockCatalogRepository = {
    fetchCatalogData: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: CatalogRepository,
          useValue: mockCatalogRepository,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate valid items and expand quantities into individual units', () => {
    const result = service.validateAndExpandCatalog(baseCatalogData);

    expect(result.validItems).toHaveLength(2);
    expect(result.invalidItems).toHaveLength(0);
    expect(result.expandedUnits).toHaveLength(3);
    expect(result.expandedUnits.map((u) => u.unitId)).toEqual([
      'SKU-001-1',
      'SKU-001-2',
      'SKU-002-1',
    ]);
  });

  it('should report invalid rows without stopping validation of valid rows', () => {
    const dataWithInvalidRows: CatalogData = {
      ...baseCatalogData,
      items: [
        ...baseCatalogData.items,
        {
          rowNumber: 4,
          sku: 'SKU-OVER-DIM',
          name: 'Oversized TV',
          lengthCm: 59, // 59 + 2cm clearance = 61cm > 60cm maxSideCm
          widthCm: 30,
          heightCm: 10,
          weightKg: 5,
          quantity: 1,
          fragile: true,
          valueMxn: 5000,
        },
        {
          rowNumber: 5,
          sku: 'SKU-OVER-WEIGHT',
          name: 'Heavy Anvil',
          lengthCm: 20,
          widthCm: 20,
          heightCm: 20,
          weightKg: 24.8, // 24.8 + 0.3kg tare = 25.1kg > 25kg maxBoxWeightKg
          quantity: 1,
          fragile: false,
          valueMxn: 1000,
        },
        {
          rowNumber: 6,
          sku: 'SKU-BAD-QTY',
          name: 'Broken Row',
          lengthCm: -5,
          widthCm: 10,
          heightCm: 10,
          weightKg: 1,
          quantity: 1.5,
          fragile: false,
          valueMxn: 100,
        },
      ],
    };

    const result = service.validateAndExpandCatalog(dataWithInvalidRows);

    expect(result.validItems).toHaveLength(2);
    expect(result.expandedUnits).toHaveLength(3);
    expect(result.invalidItems).toHaveLength(3);
    expect(result.invalidItems.map((i) => i.rowNumber)).toEqual([4, 5, 6]);
  });

  it('should throw BadRequestException if ZIP codes do not contain 5 digits', () => {
    const badZipData: CatalogData = {
      ...baseCatalogData,
      originAddress: {
        ...baseCatalogData.originAddress,
        postalCode: '4410', // Only 4 digits
      },
    };

    expect(() => service.validateAndExpandCatalog(badZipData)).toThrow(
      BadRequestException,
    );
  });

  describe('getValidatedCatalog', () => {
    it('should delegate to catalogRepository.fetchCatalogData, validate and expand raw data, and return ValidatedCatalog', async () => {
      mockCatalogRepository.fetchCatalogData.mockResolvedValue(baseCatalogData);
      const validateSpy = vi.spyOn(service, 'validateAndExpandCatalog');

      const result = await service.getValidatedCatalog();

      expect(mockCatalogRepository.fetchCatalogData).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledWith(baseCatalogData);
      expect(result.validItems).toHaveLength(2);
      expect(result.invalidItems).toHaveLength(0);
      expect(result.expandedUnits).toHaveLength(3);
      expect(result.expandedUnits.map((u) => u.unitId)).toEqual([
        'SKU-001-1',
        'SKU-001-2',
        'SKU-002-1',
      ]);
      expect(result.constraints).toEqual(baseCatalogData.constraints);
      expect(result.originAddress).toEqual(baseCatalogData.originAddress);
      expect(result.destinationAddress).toEqual(baseCatalogData.destinationAddress);
    });

    it('should propagate errors when repository fails to fetch catalog data', async () => {
      const repoError = new Error('Google Sheets API unavailable');
      mockCatalogRepository.fetchCatalogData.mockRejectedValue(repoError);

      await expect(service.getValidatedCatalog()).rejects.toThrow(
        'Google Sheets API unavailable',
      );
      expect(mockCatalogRepository.fetchCatalogData).toHaveBeenCalledTimes(1);
    });
  });

  it('should fallback to ROW-{rowNumber} when an invalid row has an empty sku', () => {
    const dataWithMissingSku: CatalogData = {
      ...baseCatalogData,
      items: [
        {
          rowNumber: 7,
          sku: '',
          name: 'Missing SKU Item',
          lengthCm: -1,
          widthCm: 10,
          heightCm: 10,
          weightKg: 1,
          quantity: 1,
          fragile: false,
          valueMxn: 100,
        },
      ],
    };

    const result = service.validateAndExpandCatalog(dataWithMissingSku);
    expect(result.invalidItems).toHaveLength(1);
    expect(result.invalidItems[0]?.sku).toBe('ROW-7');
  });
});

