import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Product } from '../products/product.entity';
import { Movement } from '../movements/movement.entity';
import { StockCalculatorService } from '../shared/stock/stock-calculator.service';
import { ProductStatus } from '../shared/enums/product-status.enum';
import { UnitOfMeasure } from '../shared/enums/unit-of-measure.enum';
import { ErrorMessages } from '../shared/constants/error-messages';
import {
  createQueryBuilderMock,
  createRepositoryMock,
} from '../test-utils/typeorm-mocks';

function buildRawRow(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    product_id: 1,
    product_sku: 'SKU',
    product_name: 'Product',
    product_description: null,
    product_price: '10',
    product_minimum_stock: 5,
    product_category: 'General',
    product_unit_of_measure: UnitOfMeasure.UNITS,
    product_status: ProductStatus.ACTIVE,
    product_created_at: new Date(),
    product_updated_at: new Date(),
    currentStock: '5',
    movement_count: '0',
    ...overrides,
  };
}

describe('InventoryService', () => {
  let service: InventoryService;
  let productRepository: ReturnType<typeof createRepositoryMock<Product>>;
  let stockCalculator: StockCalculatorService;
  const stockSubQuery = createQueryBuilderMock();

  beforeEach(async () => {
    productRepository = createRepositoryMock<Product>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        StockCalculatorService,
        { provide: getRepositoryToken(Product), useValue: productRepository },
        {
          provide: getRepositoryToken(Movement),
          useValue: createRepositoryMock<Movement>(),
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    stockCalculator = module.get<StockCalculatorService>(StockCalculatorService);
    jest
      .spyOn(stockCalculator, 'createStockSubQuery')
      .mockReturnValue(stockSubQuery as never);
  });

  describe('findAll / lowStockAlert mapping', () => {
    it('sets lowStockAlert true only when currentStock is below minimumStock for active products', async () => {
      const qb = createQueryBuilderMock<Product>();
      qb.getRawMany.mockResolvedValue([
        buildRawRow({
          product_id: 1,
          product_sku: 'A',
          currentStock: '4',
        }),
        buildRawRow({
          product_id: 2,
          product_sku: 'B',
          currentStock: '5',
        }),
        buildRawRow({
          product_id: 3,
          product_sku: 'C',
          product_status: ProductStatus.INACTIVE,
          product_minimum_stock: 10,
          currentStock: '0',
        }),
      ]);

      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll();

      expect(result[0].lowStockAlert).toBe(true);
      expect(result[1].lowStockAlert).toBe(false);
      expect(result[2].lowStockAlert).toBe(false);
    });

    it('does not alert at exact minimum; alerts one unit below (M8)', async () => {
      const qb = createQueryBuilderMock<Product>();
      qb.getRawMany.mockResolvedValue([
        buildRawRow({
          product_id: 10,
          product_minimum_stock: 10,
          currentStock: '10',
        }),
        buildRawRow({
          product_id: 11,
          product_minimum_stock: 10,
          currentStock: '9',
        }),
      ]);

      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll();

      expect(result[0].lowStockAlert).toBe(false);
      expect(result[1].lowStockAlert).toBe(true);
    });

    it('maps hasMovements from movement_count', async () => {
      const qb = createQueryBuilderMock<Product>();
      qb.getRawMany.mockResolvedValue([
        buildRawRow({ movement_count: '3' }),
        buildRawRow({ product_id: 2, movement_count: '0' }),
      ]);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll();

      expect(result[0].hasMovements).toBe(true);
      expect(result[1].hasMovements).toBe(false);
    });
  });

  describe('findOne', () => {
    it('returns a product with stock when found', async () => {
      const qb = createQueryBuilderMock<Product>();
      qb.getRawOne.mockResolvedValue(
        buildRawRow({ product_id: 7, product_sku: 'FOUND' }),
      );
      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne(7);

      expect(result.id).toBe(7);
      expect(result.sku).toBe('FOUND');
      expect(qb.andWhere).toHaveBeenCalledWith('product.id = :productId', {
        productId: 7,
      });
    });

    it('throws NotFoundException when product does not exist', async () => {
      const qb = createQueryBuilderMock<Product>();
      qb.getRawOne.mockResolvedValue(null);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        ErrorMessages.PRODUCT_NOT_FOUND(999),
      );
    });
  });

  describe('findLowStockAlerts', () => {
    it('queries active products strictly below minimum stock (M8)', async () => {
      const qb = createQueryBuilderMock<Product>();
      qb.getRawMany.mockResolvedValue([]);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findLowStockAlerts();

      expect(qb.andWhere).toHaveBeenCalledWith(
        'COALESCE(stock.current_stock, 0) < product.minimum_stock',
      );
    });
  });
});
