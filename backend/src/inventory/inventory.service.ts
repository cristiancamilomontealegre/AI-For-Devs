import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from '../products/product.entity';
import { ProductStatus } from '../shared/enums/product-status.enum';
import { UnitOfMeasure } from '../shared/enums/unit-of-measure.enum';
import { ErrorMessages } from '../shared/constants/error-messages';
import { StockCalculatorService } from '../shared/stock/stock-calculator.service';
import { applyProductFilters } from '../shared/utils/apply-product-filters';
import { ProductWithStockDto } from './dto/product-with-stock.dto';
import { FilterInventoryDto } from './dto/filter-inventory.dto';

interface StockRawRow {
  product_id: number;
  product_sku: string;
  product_name: string;
  product_description: string | null;
  product_price: string;
  product_minimum_stock: number;
  product_category: string;
  product_unit_of_measure: UnitOfMeasure;
  product_status: ProductStatus;
  product_created_at: Date;
  product_updated_at: Date;
  currentStock: string;
  movement_count: string;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly stockCalculator: StockCalculatorService,
  ) {}

  async findAll(filters: FilterInventoryDto = {}): Promise<ProductWithStockDto[]> {
    const query = applyProductFilters(this.buildStockQuery(), filters);
    const rows = await query.orderBy('product.name', 'ASC').getRawMany<StockRawRow>();
    return rows.map((row) => this.mapToDto(row));
  }

  async findOne(productId: number): Promise<ProductWithStockDto> {
    const row = await this.buildStockQuery()
      .andWhere('product.id = :productId', { productId })
      .getRawOne<StockRawRow>();

    if (!row) {
      throw new NotFoundException(ErrorMessages.PRODUCT_NOT_FOUND(productId));
    }

    return this.mapToDto(row);
  }

  async findLowStockAlerts(): Promise<ProductWithStockDto[]> {
    const rows = await this.buildStockQuery()
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere(
        'COALESCE(stock.current_stock, 0) < product.minimum_stock',
      )
      .orderBy('product.name', 'ASC')
      .getRawMany<StockRawRow>();

    return rows.map((row) => this.mapToDto(row));
  }

  private buildStockQuery(): SelectQueryBuilder<Product> {
    const stockSubQuery = this.stockCalculator.createStockSubQuery();

    return this.productRepository
      .createQueryBuilder('product')
      .leftJoin(
        `(${stockSubQuery.getQuery()})`,
        'stock',
        'stock.product_id = product.id',
      )
      .setParameters(this.stockCalculator.getStockJoinParameters())
      .select('product.id', 'product_id')
      .addSelect('product.sku', 'product_sku')
      .addSelect('product.name', 'product_name')
      .addSelect('product.description', 'product_description')
      .addSelect('product.price', 'product_price')
      .addSelect('product.minimum_stock', 'product_minimum_stock')
      .addSelect('product.category', 'product_category')
      .addSelect('product.unit_of_measure', 'product_unit_of_measure')
      .addSelect('product.status', 'product_status')
      .addSelect('product.created_at', 'product_created_at')
      .addSelect('product.updated_at', 'product_updated_at')
      .addSelect('COALESCE(stock.current_stock, 0)', 'currentStock')
      .addSelect(
        `(SELECT COUNT(*)::int FROM movements m WHERE m.product_id = product.id)`,
        'movement_count',
      );
  }

  private mapToDto(row: StockRawRow): ProductWithStockDto {
    const currentStock = Number(row.currentStock);
    const minimumStock = Number(row.product_minimum_stock);
    const status = row.product_status;

    return {
      id: row.product_id,
      sku: row.product_sku,
      name: row.product_name,
      description: row.product_description,
      price: Number(row.product_price),
      minimumStock,
      category: row.product_category,
      unitOfMeasure: row.product_unit_of_measure,
      status,
      currentStock,
      lowStockAlert: this.stockCalculator.computeLowStockAlert(
        status,
        currentStock,
        minimumStock,
      ),
      hasMovements: Number(row.movement_count ?? 0) > 0,
      createdAt: row.product_created_at,
      updatedAt: row.product_updated_at,
    };
  }
}
