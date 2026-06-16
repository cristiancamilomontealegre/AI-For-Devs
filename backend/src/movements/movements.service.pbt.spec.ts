import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fc from 'fast-check';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { MovementsService } from './movements.service';
import { Movement } from './movement.entity';
import { Product } from '../products/product.entity';
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementType } from '../shared/enums/movement-type.enum';
import { MovementReason } from '../shared/enums/movement-reason.enum';
import { ProductStatus } from '../shared/enums/product-status.enum';
import { ErrorMessages } from '../shared/constants/error-messages';
import { StockCalculatorService } from '../shared/stock/stock-calculator.service';
import { getValidReasonsForType } from '../shared/constants/movement-reasons';
import { assertValidDateRange } from '../shared/utils/validate-date-range';
import {
  assertMovementsWithinDateRange,
  filterMovementsByDateRange,
} from '../shared/utils/movement-date-filter';
import { createRepositoryMock } from '../test-utils/typeorm-mocks';

describe('MovementsService properties (PBT)', () => {
  let service: MovementsService;
  let manager: jest.Mocked<
    Pick<EntityManager, 'findOne' | 'create' | 'save' | 'getRepository'>
  >;
  let stockCalculator: jest.Mocked<Pick<StockCalculatorService, 'calculateStock'>>;

  const inactiveProduct: Product = {
    id: 42,
    sku: 'SKU-INACTIVE',
    name: 'Inactive',
    description: null,
    price: 1,
    minimumStock: 0,
    status: ProductStatus.INACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    movements: [],
  };

  const activeProduct: Product = {
    id: 1,
    sku: 'SKU-ACTIVE',
    name: 'Active',
    description: null,
    price: 10,
    minimumStock: 0,
    status: ProductStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    movements: [],
  };

  beforeEach(async () => {
    const movementRepository = createRepositoryMock<Movement>();
    stockCalculator = { calculateStock: jest.fn() };

    manager = {
      findOne: jest.fn().mockResolvedValue(inactiveProduct),
      create: jest.fn((_entity, data) => data),
      save: jest.fn(),
      getRepository: jest.fn(),
    };

    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementsService,
        { provide: getRepositoryToken(Movement), useValue: movementRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: StockCalculatorService, useValue: stockCalculator },
      ],
    }).compile();

    service = module.get<MovementsService>(MovementsService);
  });

  describe('P1 — stock never negative (service outbound boundary)', () => {
    it('allows outbound when quantity exactly equals current stock', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 500 }), async (stock) => {
          manager.findOne.mockResolvedValue(activeProduct);
          stockCalculator.calculateStock.mockResolvedValue(stock);
          manager.save.mockResolvedValue({
            id: 1,
            productId: 1,
            type: MovementType.OUTBOUND,
            quantity: stock,
            reason: MovementReason.SALE,
            occurredAt: new Date(),
          });

          const result = await service.create({
            productId: 1,
            type: MovementType.OUTBOUND,
            quantity: stock,
            reason: MovementReason.SALE,
          });

          expect(result.quantity).toBe(stock);
          expect(manager.save).toHaveBeenCalled();
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('P2 — movement quantity must be a positive integer', () => {
    it('rejects non-positive quantities via class-validator', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.double({ min: 0.01, max: 10, noNaN: true }).filter(
              (n) => !Number.isInteger(n),
            ),
          ),
          async (invalidQuantity) => {
            const dto = plainToInstance(CreateMovementDto, {
              productId: 1,
              type: MovementType.INBOUND,
              quantity: invalidQuantity,
              reason: MovementReason.PURCHASE,
            });

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('accepts positive integer quantities', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 1000 }), async (quantity) => {
          const dto = plainToInstance(CreateMovementDto, {
            productId: 1,
            type: MovementType.INBOUND,
            quantity,
            reason: MovementReason.PURCHASE,
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('P5 — inactive products reject any movement attempt', () => {
    it('throws for any generated type, quantity and valid reason', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(MovementType.INBOUND, MovementType.OUTBOUND),
          fc.integer({ min: 1, max: 500 }),
          async (type, quantity) => {
            const [reason] = getValidReasonsForType(type);

            await expect(
              service.create({
                productId: inactiveProduct.id,
                type,
                quantity,
                reason,
              }),
            ).rejects.toThrow(ErrorMessages.INACTIVE_PRODUCT_MOVEMENT);
          },
        ),
        { numRuns: 100 },
      );

      expect(manager.save).not.toHaveBeenCalled();
      expect(stockCalculator.calculateStock).not.toHaveBeenCalled();
    });
  });

  describe('P6 — movement type must be inbound or outbound only', () => {
    it('rejects any string that is not a valid movement type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter(
              (value) =>
                value !== MovementType.INBOUND && value !== MovementType.OUTBOUND,
            ),
          async (invalidType) => {
            const dto = plainToInstance(CreateMovementDto, {
              productId: 1,
              type: invalidType,
              quantity: 1,
              reason: MovementReason.PURCHASE,
            });

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('P7 — date range must be coherent', () => {
    it('allows equal start and end dates for any timestamp', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 2_000_000_000_000 }), (timestamp) => {
          const sameDay = new Date(timestamp);
          expect(() => assertValidDateRange(sameDay, sameDay)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('rejects ranges where startDate is after endDate', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2_000_000_000_000 }),
          fc.integer({ min: 0, max: 2_000_000_000_000 }),
          (later, earlier) => {
            if (later <= earlier) {
              return true;
            }

            const startDate = new Date(later);
            const endDate = new Date(earlier);

            expect(() => assertValidDateRange(startDate, endDate)).toThrow(
              BadRequestException,
            );
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('P8 — filtered movements stay within the requested date range', () => {
    it('keeps only movements where startDate <= occurredAt <= endDate', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 2_000_000_000_000 }), {
            minLength: 0,
            maxLength: 30,
          }),
          fc.integer({ min: 0, max: 2_000_000_000_000 }),
          fc.integer({ min: 0, max: 2_000_000_000_000 }),
          (timestamps, rawStart, rawEnd) => {
            const startDate = new Date(Math.min(rawStart, rawEnd));
            const endDate = new Date(Math.max(rawStart, rawEnd));
            const movements = timestamps.map((timestamp) => ({
              occurredAt: new Date(timestamp),
            }));

            const filtered = filterMovementsByDateRange(
              movements,
              startDate,
              endDate,
            );

            assertMovementsWithinDateRange(filtered, startDate, endDate);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
