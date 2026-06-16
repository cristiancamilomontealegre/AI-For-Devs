import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StockCalculatorService } from './stock-calculator.service';
import { Movement } from '../../movements/movement.entity';
import { MovementType } from '../enums/movement-type.enum';
import { ProductStatus } from '../enums/product-status.enum';
import {
  createQueryBuilderMock,
  createRepositoryMock,
} from '../../test-utils/typeorm-mocks';

describe('StockCalculatorService', () => {
  let service: StockCalculatorService;
  let movementRepository: ReturnType<typeof createRepositoryMock<Movement>>;

  beforeEach(async () => {
    movementRepository = createRepositoryMock<Movement>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockCalculatorService,
        { provide: getRepositoryToken(Movement), useValue: movementRepository },
      ],
    }).compile();

    service = module.get<StockCalculatorService>(StockCalculatorService);
  });

  describe('toCurrentStock', () => {
    it('calculates stock as sum of inbound minus sum of outbound', () => {
      expect(
        service.toCurrentStock({ inboundTotal: '100', outboundTotal: '35' }),
      ).toBe(65);
    });

    it('adds inbound quantities without subtracting when there are no outbounds (M5)', () => {
      expect(
        service.toCurrentStock({ inboundTotal: '80', outboundTotal: '0' }),
      ).toBe(80);
    });

    it('returns precise arithmetic for mixed movements (M5)', () => {
      expect(
        service.toCurrentStock({ inboundTotal: '120', outboundTotal: '45' }),
      ).toBe(75);
    });

    it('returns zero when totals are missing', () => {
      expect(service.toCurrentStock(null)).toBe(0);
      expect(service.toCurrentStock(undefined)).toBe(0);
    });

    it('handles exact outbound depletion (stock reaches zero)', () => {
      expect(
        service.toCurrentStock({ inboundTotal: '50', outboundTotal: '50' }),
      ).toBe(0);
    });
  });

  describe('calculateStock', () => {
    it('delegates to query builder and converts raw totals', async () => {
      const qb = createQueryBuilderMock<Movement>();
      qb.getRawOne.mockResolvedValue({
        inboundTotal: '120',
        outboundTotal: '45',
      });
      movementRepository.createQueryBuilder.mockReturnValue(qb);

      const stock = await service.calculateStock(1);

      expect(stock).toBe(75);
      expect(qb.where).toHaveBeenCalledWith(
        'movement.product_id = :productId',
        { productId: 1 },
      );
    });
  });

  describe('computeLowStockAlert', () => {
    it('returns true when active product stock is below minimum', () => {
      expect(
        service.computeLowStockAlert(ProductStatus.ACTIVE, 4, 5),
      ).toBe(true);
      expect(
        service.computeLowStockAlert(ProductStatus.ACTIVE, 3, 5),
      ).toBe(true);
    });

    it('returns false when stock equals minimum (M8 boundary)', () => {
      expect(
        service.computeLowStockAlert(ProductStatus.ACTIVE, 5, 5),
      ).toBe(false);
    });

    it('returns false when stock is exactly one unit above minimum (M8 boundary)', () => {
      expect(
        service.computeLowStockAlert(ProductStatus.ACTIVE, 6, 5),
      ).toBe(false);
    });

    it('returns false for inactive products regardless of stock level', () => {
      expect(
        service.computeLowStockAlert(ProductStatus.INACTIVE, 0, 10),
      ).toBe(false);
    });
  });

  describe('getStockJoinParameters', () => {
    it('exposes movement type parameters for stock joins', () => {
      expect(service.getStockJoinParameters()).toEqual({
        inbound: MovementType.INBOUND,
        outbound: MovementType.OUTBOUND,
      });
    });
  });
});
