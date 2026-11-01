import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogUnit, PackagingConstraints } from '../../interfaces/catalog.interface.js';
import type { PackagingResult } from '../../interfaces/packaging.interface.js';
import { check3DOverlap, getRotations } from './packer-3d.engine.js';
import { PackagingRepository } from './packaging.repository.js';
import { PackagingService } from './packaging.service.js';

describe('PackagingService', () => {
  let service: PackagingService;
  let mockPackagingRepository: { saveBoxes: ReturnType<typeof vi.fn> };

  const constraints: PackagingConstraints = {
    clearanceCm: 2,
    maxSideCm: 60,
    boxTareWeightKg: 0.3,
    maxBoxWeightKg: 25,
    volumetricFactor: 5000,
  };

  const sampleUnits: CatalogUnit[] = [
    {
      unitId: 'SKU-001-1',
      sku: 'SKU-001',
      name: 'Monitor 24 pulgadas',
      lengthCm: 56,
      widthCm: 34,
      heightCm: 10,
      weightKg: 4.8,
      fragile: true,
      valueMxn: 3200,
    },
    {
      unitId: 'SKU-001-2',
      sku: 'SKU-001',
      name: 'Monitor 24 pulgadas',
      lengthCm: 56,
      widthCm: 34,
      heightCm: 10,
      weightKg: 4.8,
      fragile: true,
      valueMxn: 3200,
    },
    {
      unitId: 'SKU-003-1',
      sku: 'SKU-003',
      name: 'Teclado mecánico',
      lengthCm: 44,
      widthCm: 14,
      heightCm: 4,
      weightKg: 0.9,
      fragile: false,
      valueMxn: 1100,
    },
  ];

  const fullChallengeUnits: CatalogUnit[] = [
    { unitId: 'SKU-001-1', sku: 'SKU-001', name: 'Monitor 24 pulgadas', lengthCm: 56, widthCm: 34, heightCm: 10, weightKg: 4.8, fragile: true, valueMxn: 3200 },
    { unitId: 'SKU-001-2', sku: 'SKU-001', name: 'Monitor 24 pulgadas', lengthCm: 56, widthCm: 34, heightCm: 10, weightKg: 4.8, fragile: true, valueMxn: 3200 },
    { unitId: 'SKU-002-1', sku: 'SKU-002', name: 'Monitor 27 pulgadas', lengthCm: 58, widthCm: 36, heightCm: 11, weightKg: 6.2, fragile: true, valueMxn: 4500 },
    { unitId: 'SKU-003-1', sku: 'SKU-003', name: 'Teclado mecánico', lengthCm: 44, widthCm: 14, heightCm: 4, weightKg: 0.9, fragile: false, valueMxn: 1100 },
    { unitId: 'SKU-003-2', sku: 'SKU-003', name: 'Teclado mecánico', lengthCm: 44, widthCm: 14, heightCm: 4, weightKg: 0.9, fragile: false, valueMxn: 1100 },
    { unitId: 'SKU-004-1', sku: 'SKU-004', name: 'Impresora láser', lengthCm: 42, widthCm: 38, heightCm: 26, weightKg: 9.5, fragile: true, valueMxn: 3800 },
    { unitId: 'SKU-005-1', sku: 'SKU-005', name: 'Bocina torre', lengthCm: 25, widthCm: 25, heightCm: 55, weightKg: 7.5, fragile: true, valueMxn: 2600 },
    { unitId: 'SKU-005-2', sku: 'SKU-005', name: 'Bocina torre', lengthCm: 25, widthCm: 25, heightCm: 55, weightKg: 7.5, fragile: true, valueMxn: 2600 },
    { unitId: 'SKU-006-1', sku: 'SKU-006', name: 'Router WiFi', lengthCm: 25, widthCm: 18, heightCm: 6, weightKg: 0.6, fragile: true, valueMxn: 900 },
    { unitId: 'SKU-006-2', sku: 'SKU-006', name: 'Router WiFi', lengthCm: 25, widthCm: 18, heightCm: 6, weightKg: 0.6, fragile: true, valueMxn: 900 },
    { unitId: 'SKU-007-1', sku: 'SKU-007', name: 'Mini PC', lengthCm: 20, widthCm: 20, heightCm: 6, weightKg: 1.4, fragile: true, valueMxn: 7500 },
    { unitId: 'SKU-008-1', sku: 'SKU-008', name: 'Servidor NAS', lengthCm: 25, widthCm: 22, heightCm: 16, weightKg: 3.2, fragile: true, valueMxn: 5200 },
    { unitId: 'SKU-009-1', sku: 'SKU-009', name: 'Cafetera', lengthCm: 30, widthCm: 24, heightCm: 35, weightKg: 3.8, fragile: true, valueMxn: 1800 },
    { unitId: 'SKU-009-2', sku: 'SKU-009', name: 'Cafetera', lengthCm: 30, widthCm: 24, heightCm: 35, weightKg: 3.8, fragile: true, valueMxn: 1800 },
    { unitId: 'SKU-010-1', sku: 'SKU-010', name: 'Licuadora', lengthCm: 22, widthCm: 22, heightCm: 40, weightKg: 3.1, fragile: true, valueMxn: 1500 },
    { unitId: 'SKU-010-2', sku: 'SKU-010', name: 'Licuadora', lengthCm: 22, widthCm: 22, heightCm: 40, weightKg: 3.1, fragile: true, valueMxn: 1500 },
    { unitId: 'SKU-011-1', sku: 'SKU-011', name: 'Olla de presión', lengthCm: 32, widthCm: 32, heightCm: 24, weightKg: 3.4, fragile: false, valueMxn: 1300 },
    { unitId: 'SKU-012-1', sku: 'SKU-012', name: 'Set de sartenes', lengthCm: 40, widthCm: 30, heightCm: 12, weightKg: 4.2, fragile: false, valueMxn: 1600 },
    { unitId: 'SKU-012-2', sku: 'SKU-012', name: 'Set de sartenes', lengthCm: 40, widthCm: 30, heightCm: 12, weightKg: 4.2, fragile: false, valueMxn: 1600 },
    { unitId: 'SKU-013-1', sku: 'SKU-013', name: 'Caja de libros', lengthCm: 30, widthCm: 22, heightCm: 20, weightKg: 8.0, fragile: false, valueMxn: 900 },
    { unitId: 'SKU-013-2', sku: 'SKU-013', name: 'Caja de libros', lengthCm: 30, widthCm: 22, heightCm: 20, weightKg: 8.0, fragile: false, valueMxn: 900 },
    { unitId: 'SKU-014-1', sku: 'SKU-014', name: 'Mancuernas', lengthCm: 30, widthCm: 15, heightCm: 15, weightKg: 8.0, fragile: false, valueMxn: 1400 },
    { unitId: 'SKU-015-1', sku: 'SKU-015', name: 'Tapete de yoga', lengthCm: 58, widthCm: 12, heightCm: 12, weightKg: 1.2, fragile: false, valueMxn: 450 },
    { unitId: 'SKU-015-2', sku: 'SKU-015', name: 'Tapete de yoga', lengthCm: 58, widthCm: 12, heightCm: 12, weightKg: 1.2, fragile: false, valueMxn: 450 },
    { unitId: 'SKU-016-1', sku: 'SKU-016', name: 'Mochila', lengthCm: 45, widthCm: 30, heightCm: 20, weightKg: 1.1, fragile: false, valueMxn: 800 },
    { unitId: 'SKU-016-2', sku: 'SKU-016', name: 'Mochila', lengthCm: 45, widthCm: 30, heightCm: 20, weightKg: 1.1, fragile: false, valueMxn: 800 },
    { unitId: 'SKU-017-1', sku: 'SKU-017', name: 'Lámpara de piso', lengthCm: 55, widthCm: 20, heightCm: 20, weightKg: 2.5, fragile: true, valueMxn: 1700 },
    { unitId: 'SKU-018-1', sku: 'SKU-018', name: 'Ventilador de mesa', lengthCm: 35, widthCm: 35, heightCm: 45, weightKg: 2.8, fragile: false, valueMxn: 950 },
    { unitId: 'SKU-019-1', sku: 'SKU-019', name: 'Caja de herramientas', lengthCm: 50, widthCm: 25, heightCm: 22, weightKg: 6.0, fragile: false, valueMxn: 1900 },
    { unitId: 'SKU-020-1', sku: 'SKU-020', name: 'Kit de cámaras de seguridad', lengthCm: 28, widthCm: 20, heightCm: 12, weightKg: 2.0, fragile: true, valueMxn: 2100 },
  ];

  beforeEach(async () => {
    mockPackagingRepository = {
      saveBoxes: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagingService,
        {
          provide: PackagingRepository,
          useValue: mockPackagingRepository,
        },
      ],
    }).compile();

    service = module.get<PackagingService>(PackagingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('3D Engine Utilities', () => {
    it('should generate all unique orthogonal rotations', () => {
      const distinct = getRotations(10, 20, 30);
      expect(distinct).toHaveLength(6);

      const symmetric = getRotations(10, 10, 30);
      expect(symmetric).toHaveLength(3);

      const cube = getRotations(10, 10, 10);
      expect(cube).toHaveLength(1);
    });

    it('should correctly detect 3D AABB intersections and non-intersections', () => {
      // Overlapping boxes
      const isOverlapping = check3DOverlap({ x: 0, y: 0, z: 0 }, [10, 10, 10], { x: 5, y: 5, z: 5 }, [10, 10, 10]);
      expect(isOverlapping).toBe(true);

      // Adjacent boxes (sharing a boundary, not overlapping volume)
      const isAdjacentX = check3DOverlap({ x: 0, y: 0, z: 0 }, [10, 10, 10], { x: 10, y: 0, z: 0 }, [10, 10, 10]);
      expect(isAdjacentX).toBe(false);

      // Separated boxes
      const isSeparated = check3DOverlap({ x: 0, y: 0, z: 0 }, [10, 10, 10], { x: 20, y: 20, z: 20 }, [10, 10, 10]);
      expect(isSeparated).toBe(false);
    });
  });

  describe('packMinBoxes (Strategy 1)', () => {
    it('should pack sample items within constraints and generate valid box metrics', () => {
      const result = service.packMinBoxes(sampleUnits, constraints);

      expect(result.strategy).toBe('MIN_BOXES');
      expect(result.totalUnits).toBe(3);
      expect(result.totalBoxes).toBeGreaterThanOrEqual(1);

      for (const box of result.boxes) {
        expect(box.externalDimensions.lengthCm).toBeLessThanOrEqual(constraints.maxSideCm);
        expect(box.externalDimensions.widthCm).toBeLessThanOrEqual(constraints.maxSideCm);
        expect(box.externalDimensions.heightCm).toBeLessThanOrEqual(constraints.maxSideCm);
        expect(box.actualWeightKg).toBeLessThanOrEqual(constraints.maxBoxWeightKg);
        expect(box.billableWeightKg).toBeGreaterThanOrEqual(box.actualWeightKg);
        expect(box.occupancyPercent).toBeGreaterThan(0);
      }
    });

    it('should pack the complete 30-unit challenge order into exactly 5 boxes without collisions', () => {
      const result = service.packMinBoxes(fullChallengeUnits, constraints);

      expect(result.totalUnits).toBe(30);
      expect(result.totalBoxes).toBe(5);
      expect(result.totalActualWeightKg).toBe(116.9);

      // Verify no overlaps in any box
      for (const box of result.boxes) {
        expect(box.externalDimensions.lengthCm).toBeLessThanOrEqual(60);
        expect(box.externalDimensions.widthCm).toBeLessThanOrEqual(60);
        expect(box.externalDimensions.heightCm).toBeLessThanOrEqual(60);
        expect(box.actualWeightKg).toBeLessThanOrEqual(25);

        for (let i = 0; i < box.items.length; i++) {
          for (let j = i + 1; j < box.items.length; j++) {
            const a = box.items[i];
            const b = box.items[j];
            const overlap = check3DOverlap(
              a.position,
              [a.placedDimensions.lengthCm, a.placedDimensions.widthCm, a.placedDimensions.heightCm],
              b.position,
              [b.placedDimensions.lengthCm, b.placedDimensions.widthCm, b.placedDimensions.heightCm],
            );
            expect(overlap).toBe(false);
          }
        }
      }
    });
  });

  describe('packMinBillableWeight (Strategy 2)', () => {
    it('should pack units into valid non-overlapping boxes minimizing billable weight jumps', () => {
      const result = service.packMinBillableWeight(fullChallengeUnits, constraints);

      expect(result.strategy).toBe('MIN_BILLABLE_WEIGHT');
      expect(result.totalUnits).toBe(30);
      expect(result.totalBoxes).toBeGreaterThanOrEqual(5);

      for (const box of result.boxes) {
        expect(box.externalDimensions.lengthCm).toBeLessThanOrEqual(60);
        expect(box.externalDimensions.widthCm).toBeLessThanOrEqual(60);
        expect(box.externalDimensions.heightCm).toBeLessThanOrEqual(60);
        expect(box.actualWeightKg).toBeLessThanOrEqual(25);

        for (let i = 0; i < box.items.length; i++) {
          for (let j = i + 1; j < box.items.length; j++) {
            const a = box.items[i];
            const b = box.items[j];
            const overlap = check3DOverlap(
              a.position,
              [a.placedDimensions.lengthCm, a.placedDimensions.widthCm, a.placedDimensions.heightCm],
              b.position,
              [b.placedDimensions.lengthCm, b.placedDimensions.widthCm, b.placedDimensions.heightCm],
            );
            expect(overlap).toBe(false);
          }
        }
      }
    });
  });

  describe('packCatalog & Spreadsheet Transformation', () => {
    it('should run both strategies via packCatalog and transform into BoxSheetRow', () => {
      const { minBoxesResult, minBillableResult } = service.packCatalog(sampleUnits, constraints);

      expect(minBoxesResult.strategy).toBe('MIN_BOXES');
      expect(minBillableResult.strategy).toBe('MIN_BILLABLE_WEIGHT');

      const rows = service.toBoxSheetRows([minBoxesResult, minBillableResult]);
      expect(rows.length).toBe(minBoxesResult.totalBoxes + minBillableResult.totalBoxes);

      const firstRow = rows[0];
      expect(firstRow.strategy).toBe('MIN_BOXES');
      expect(firstRow.boxId).toMatch(/^BOX-\d{2}$/);
      expect(firstRow.externalLengthCm).toBeGreaterThan(0);
      expect(firstRow.actualWeightKg).toBeGreaterThan(0);
      expect(firstRow.containedSkus).toContain('SKU-');
    });

    it('should format contained SKUs with quantities', () => {
      const mockBox = {
        boxId: 'BOX-01',
        strategy: 'MIN_BOXES' as const,
        items: [
          { sku: 'SKU-001' } as any,
          { sku: 'SKU-001' } as any,
          { sku: 'SKU-002' } as any,
        ],
      } as any;

      const formatted = service.formatContainedSkus(mockBox);
      expect(formatted).toBe('SKU-001 (x2), SKU-002');
    });

    it('should delegate saving boxes to PackagingRepository.saveBoxes', async () => {
      const mockResult: PackagingResult = {
        strategy: 'MIN_BOXES',
        boxes: [
          {
            boxId: 'BOX-01',
            strategy: 'MIN_BOXES',
            items: [],
            internalDimensions: { lengthCm: 20, widthCm: 20, heightCm: 20 },
            externalDimensions: { lengthCm: 22, widthCm: 22, heightCm: 22 },
            itemsWeightKg: 5,
            tareWeightKg: 0.3,
            actualWeightKg: 5.3,
            volumetricWeightKg: 2.13,
            billableWeightKg: 6,
            occupancyPercent: 85,
          },
        ],
        totalBoxes: 1,
        totalUnits: 0,
        totalActualWeightKg: 5.3,
        totalVolumetricWeightKg: 2.13,
        totalBillableWeightKg: 6,
        averageOccupancyPercent: 85,
      };

      await service.savePackagingResults([mockResult]);
      expect(mockPackagingRepository.saveBoxes).toHaveBeenCalledTimes(1);
      expect(mockPackagingRepository.saveBoxes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            boxId: 'BOX-01',
            strategy: 'MIN_BOXES',
            actualWeightKg: 5.3,
          }),
        ]),
      );
    });
  });
});
