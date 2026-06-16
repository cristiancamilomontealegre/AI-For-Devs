import { SelectQueryBuilder } from 'typeorm';
import { Product } from '../../products/product.entity';
import { ProductStatus } from '../enums/product-status.enum';

export interface ProductFilterParams {
  name?: string;
  sku?: string;
  category?: string;
  status?: ProductStatus;
}

export function applyProductFilters(
  query: SelectQueryBuilder<Product>,
  filters: ProductFilterParams,
  alias = 'product',
): SelectQueryBuilder<Product> {
  if (filters.name) {
    query.andWhere(`${alias}.name ILIKE :name`, {
      name: `%${filters.name}%`,
    });
  }

  if (filters.sku) {
    query.andWhere(`${alias}.sku ILIKE :sku`, {
      sku: `%${filters.sku}%`,
    });
  }

  if (filters.category) {
    query.andWhere(`${alias}.category ILIKE :category`, {
      category: `%${filters.category}%`,
    });
  }

  if (filters.status) {
    query.andWhere(`${alias}.status = :status`, { status: filters.status });
  }

  return query;
}
