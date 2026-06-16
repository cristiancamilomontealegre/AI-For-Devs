import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { MovementsService } from './movements.service';
import { Movement } from './movement.entity';
import { Product } from '../products/product.entity';
import { MovementType } from '../shared/enums/movement-type.enum';
import { MovementReason } from '../shared/enums/movement-reason.enum';
import { ProductStatus } from '../shared/enums/product-status.enum';
import { ErrorMessages } from '../shared/constants/error-messages';
import { StockCalculatorService } from '../shared/stock/stock-calculator.service';
import {
  createQueryBuilderMock,
  createRepositoryMock,
} from '../test-utils/typeorm-mocks';
import { assertMovementsWithinDateRange } from '../shared/utils/movement-date-filter';

describe('MovementsService', () => {
  let service: MovementsService;
  let movementRepository: ReturnType<typeof createRepositoryMock<Movement>>;
  let stockCalculator: jest.Mocked<Pick<StockCalculatorService, 'calculateStock'>>;
  let manager: jest.Mocked<
    Pick<EntityManager, 'findOne' | 'create' | 'save' | 'getRepository'>
  >;
  let dataSource: { transaction: jest.Mock };

  const activeProduct: Product = {
    id: 1,
    sku: 'SKU-001',
    name: 'Widget',
    description: null,
    price: 10,
    minimumStock: 0,
    status: ProductStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    movements: [],
  };

  beforeEach(async () => {
    movementRepository = createRepositoryMock<Movement>();
    stockCalculator = { calculateStock: jest.fn() };

    manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity, data) => data),
      save: jest.fn(async (entity) => ({ id: 1, occurredAt: new Date(), ...entity })),
      getRepository: jest.fn(),
    };

    dataSource = {
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

  describe('create', () => {
  const inboundDto = {
    productId: 1,
    type: MovementType.INBOUND,
    quantity: 10,
    reason: MovementReason.PURCHASE,
  };

    it('registers inbound movement for an active product', async () => {
      manager.findOne.mockResolvedValue(activeProduct);

      const result = await service.create(inboundDto);

      expect(manager.findOne).toHaveBeenCalledWith(Product, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(stockCalculator.calculateStock).not.toHaveBeenCalled();
      expect(result.quantity).toBe(10);
      expect(result.type).toBe(MovementType.INBOUND);
    });

    it('throws BadRequestException when outbound quantity exceeds current stock', async () => {
      manager.findOne.mockResolvedValue(activeProduct);
      stockCalculator.calculateStock.mockResolvedValue(3);

      await expect(
        service.create({
          productId: 1,
          type: MovementType.OUTBOUND,
          quantity: 5,
          reason: MovementReason.SALE,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({
          productId: 1,
          type: MovementType.OUTBOUND,
          quantity: 5,
          reason: MovementReason.SALE,
        }),
      ).rejects.toThrow(ErrorMessages.INSUFFICIENT_STOCK);

      expect(manager.save).not.toHaveBeenCalled();
    });

    it('allows outbound when quantity equals current stock leaving stock at zero', async () => {
      manager.findOne.mockResolvedValue(activeProduct);
      stockCalculator.calculateStock.mockResolvedValue(7);

      const result = await service.create({
        productId: 1,
        type: MovementType.OUTBOUND,
        quantity: 7,
        reason: MovementReason.SALE,
      });

      expect(stockCalculator.calculateStock).toHaveBeenCalledWith(1, manager);
      expect(result.quantity).toBe(7);
      expect(manager.save).toHaveBeenCalled();
    });

    it('allows outbound when stock is greater than requested quantity (M3 boundary)', async () => {
      manager.findOne.mockResolvedValue(activeProduct);
      stockCalculator.calculateStock.mockResolvedValue(15);

      const result = await service.create({
        productId: 1,
        type: MovementType.OUTBOUND,
        quantity: 4,
        reason: MovementReason.SALE,
      });

      expect(result.quantity).toBe(4);
      expect(manager.save).toHaveBeenCalledTimes(1);
    });

    it('rejects outbound when quantity is exactly one unit above available stock (M3)', async () => {
      manager.findOne.mockResolvedValue(activeProduct);
      stockCalculator.calculateStock.mockResolvedValue(5);

      await expect(
        service.create({
          productId: 1,
          type: MovementType.OUTBOUND,
          quantity: 6,
          reason: MovementReason.SALE,
        }),
      ).rejects.toThrow(ErrorMessages.INSUFFICIENT_STOCK);

      expect(manager.save).not.toHaveBeenCalled();
    });

    it('rejects movement registration for inactive products', async () => {
      manager.findOne.mockResolvedValue({
        ...activeProduct,
        status: ProductStatus.INACTIVE,
      });

      await expect(service.create(inboundDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(inboundDto)).rejects.toThrow(
        ErrorMessages.INACTIVE_PRODUCT_MOVEMENT,
      );
    });

    it('throws NotFoundException when product does not exist', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(service.create(inboundDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects invalid reason for the movement type (M6)', async () => {
      manager.findOne.mockResolvedValue(activeProduct);

      await expect(
        service.create({
          productId: 1,
          type: MovementType.INBOUND,
          quantity: 5,
          reason: MovementReason.SALE,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('does not apply optional filters when they are omitted', async () => {
      const qb = createQueryBuilderMock<Movement>();
      qb.getMany.mockResolvedValue([]);

      movementRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({});

      expect(movementRepository.createQueryBuilder).toHaveBeenCalledWith(
        'movement',
      );
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'movement.product',
        'product',
      );
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('movement.occurredAt', 'DESC');
    });

    it('applies productId and type filters when provided', async () => {
      const qb = createQueryBuilderMock<Movement>();
      qb.getMany.mockResolvedValue([]);

      movementRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({
        productId: 3,
        type: MovementType.INBOUND,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'movement.productId = :productId',
        { productId: 3 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('movement.type = :type', {
        type: MovementType.INBOUND,
      });
    });

    it('returns movements when startDate equals endDate for the same day', async () => {
      const sameDay = new Date('2026-06-15T00:00:00.000Z');
      const qb = createQueryBuilderMock<Movement>();
      const expectedMovements = [{ id: 1 }] as Movement[];

      qb.getMany.mockResolvedValue(expectedMovements);
      movementRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({
        startDate: sameDay,
        endDate: sameDay,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'movement.occurredAt >= :startDate',
        { startDate: sameDay },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'movement.occurredAt <= :endDate',
        { endDate: sameDay },
      );
      expect(result).toEqual(expectedMovements);
    });

    it('throws BadRequestException when startDate is after endDate', async () => {
      await expect(
        service.findAll({
          startDate: new Date('2026-06-20'),
          endDate: new Date('2026-06-10'),
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.findAll({
          startDate: new Date('2026-06-20'),
          endDate: new Date('2026-06-10'),
        }),
      ).rejects.toThrow(ErrorMessages.INVALID_DATE_RANGE);
    });

    it('returns only movements within the requested date range including boundaries (P8)', async () => {
      const startDate = new Date('2026-06-10T00:00:00.000Z');
      const endDate = new Date('2026-06-15T23:59:59.999Z');
      const qb = createQueryBuilderMock<Movement>();
      const inRangeMovements = [
        { id: 1, occurredAt: new Date('2026-06-10T00:00:00.000Z') },
        { id: 2, occurredAt: new Date('2026-06-12T12:00:00.000Z') },
        { id: 3, occurredAt: new Date('2026-06-15T23:59:59.999Z') },
      ] as Movement[];

      qb.getMany.mockResolvedValue(inRangeMovements);
      movementRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ startDate, endDate });

      expect(() =>
        assertMovementsWithinDateRange(result, startDate, endDate),
      ).not.toThrow();
    });
  });
});
