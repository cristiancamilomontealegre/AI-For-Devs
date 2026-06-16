import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { Movement } from '../../movements/movement.entity';
import { MovementType } from '../enums/movement-type.enum';
import { ProductStatus } from '../enums/product-status.enum';

export interface StockTotalsRow {
  inboundTotal: string;
  outboundTotal: string;
}

@Injectable()
export class StockCalculatorService {
  constructor(
    @InjectRepository(Movement)
    private readonly movementRepository: Repository<Movement>,
  ) {}

  async calculateStock(
    productId: number,
    manager?: EntityManager,
  ): Promise<number> {
    const repository = manager
      ? manager.getRepository(Movement)
      : this.movementRepository;

    const result = await repository
      .createQueryBuilder('movement')
      .select(
        `COALESCE(SUM(CASE WHEN movement.type = :inbound THEN movement.quantity ELSE 0 END), 0)`,
        'inboundTotal',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN movement.type = :outbound THEN movement.quantity ELSE 0 END), 0)`,
        'outboundTotal',
      )
      .where('movement.product_id = :productId', { productId })
      .setParameters({
        inbound: MovementType.INBOUND,
        outbound: MovementType.OUTBOUND,
        productId,
      })
      .getRawOne<StockTotalsRow>();

    return this.toCurrentStock(result);
  }

  /**
   * Pre-aggregates movements per product in a subquery.
   * Avoids N+1 and reduces row multiplication vs JOIN + GROUP BY on movements.
   */
  createStockSubQuery(
    manager?: EntityManager,
  ): SelectQueryBuilder<Movement> {
    const repository = manager
      ? manager.getRepository(Movement)
      : this.movementRepository;

    return repository
      .createQueryBuilder('movement')
      .select('movement.product_id', 'product_id')
      .addSelect(this.getCurrentStockExpression('movement'), 'current_stock')
      .groupBy('movement.product_id');
  }

  getStockJoinParameters(): Record<string, MovementType> {
    return {
      inbound: MovementType.INBOUND,
      outbound: MovementType.OUTBOUND,
    };
  }

  computeLowStockAlert(
    status: ProductStatus,
    currentStock: number,
    minimumStock: number,
  ): boolean {
    return status === ProductStatus.ACTIVE && currentStock < minimumStock;
  }

  toCurrentStock(totals?: StockTotalsRow | null): number {
    const inboundTotal = Number(totals?.inboundTotal ?? 0);
    const outboundTotal = Number(totals?.outboundTotal ?? 0);
    return inboundTotal - outboundTotal;
  }

  private getCurrentStockExpression(alias: string): string {
    return `COALESCE(SUM(CASE WHEN ${alias}.type = :inbound THEN ${alias}.quantity ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN ${alias}.type = :outbound THEN ${alias}.quantity ELSE 0 END), 0)`;
  }
}
