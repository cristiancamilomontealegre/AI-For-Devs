import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Movement } from './movement.entity';
import { Product } from '../products/product.entity';
import { CreateMovementDto } from './dto/create-movement.dto';
import { FilterMovementsDto } from './dto/filter-movements.dto';
import { MovementType } from '../shared/enums/movement-type.enum';
import { MovementReason } from '../shared/enums/movement-reason.enum';
import { ProductStatus } from '../shared/enums/product-status.enum';
import { ErrorMessages } from '../shared/constants/error-messages';
import { getValidReasonsForType } from '../shared/constants/movement-reasons';
import { StockCalculatorService } from '../shared/stock/stock-calculator.service';
import { assertValidDateRange } from '../shared/utils/validate-date-range';

@Injectable()
export class MovementsService {
  constructor(
    @InjectRepository(Movement)
    private readonly movementRepository: Repository<Movement>,
    private readonly dataSource: DataSource,
    private readonly stockCalculator: StockCalculatorService,
  ) {}

  async create(dto: CreateMovementDto): Promise<Movement> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: dto.productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        throw new NotFoundException(
          ErrorMessages.PRODUCT_NOT_FOUND(dto.productId),
        );
      }

      if (product.status === ProductStatus.INACTIVE) {
        throw new BadRequestException(ErrorMessages.INACTIVE_PRODUCT_MOVEMENT);
      }

      this.validateReasonForType(dto.type, dto.reason);

      if (dto.type === MovementType.OUTBOUND) {
        const currentStock = await this.stockCalculator.calculateStock(
          dto.productId,
          manager,
        );

        if (currentStock < dto.quantity) {
          throw new BadRequestException(ErrorMessages.INSUFFICIENT_STOCK);
        }
      }

      const movement = manager.create(Movement, {
        productId: dto.productId,
        type: dto.type,
        quantity: dto.quantity,
        reason: dto.reason,
      });

      return manager.save(movement);
    });
  }

  async findAll(filters: FilterMovementsDto): Promise<Movement[]> {
    assertValidDateRange(filters.startDate, filters.endDate);

    const query = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product');

    if (filters.productId) {
      query.andWhere('movement.productId = :productId', {
        productId: filters.productId,
      });
    }

    if (filters.type) {
      query.andWhere('movement.type = :type', { type: filters.type });
    }

    if (filters.startDate) {
      query.andWhere('movement.occurredAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere('movement.occurredAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    return query.orderBy('movement.occurredAt', 'DESC').getMany();
  }

  private validateReasonForType(
    type: MovementType,
    reason: MovementReason,
  ): void {
    const validReasons = getValidReasonsForType(type);

    if (!validReasons.includes(reason)) {
      throw new BadRequestException(
        ErrorMessages.INVALID_REASON_FOR_TYPE(reason, type),
      );
    }
  }
}
