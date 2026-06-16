import { useCallback } from 'react';
import { inventoryService } from '../services/inventory.service';
import { useAsync } from './useAsync';
import type { ProductStatus, ProductWithStock } from '../types/product';
import { normalizeProductWithStock } from '../utils/product';

const EMPTY_PRODUCTS: ProductWithStock[] = [];

export type StatusFilter = ProductStatus | 'all';

interface UseProductsOptions {
  statusFilter?: StatusFilter;
}

export function useProducts(options: UseProductsOptions = {}) {
  const { statusFilter = 'all' } = options;

  const fetcher = useCallback(async () => {
    const filters =
      statusFilter === 'all' ? undefined : { status: statusFilter };
    const data = await inventoryService.getAll(filters);
    return data
      .map(normalizeProductWithStock)
      .filter((product): product is ProductWithStock => product !== null);
  }, [statusFilter]);

  const { data, loading, error, refetch } = useAsync(fetcher, {
    initialData: EMPTY_PRODUCTS,
    deps: [statusFilter],
  });

  return { products: data, loading, error, refetch };
}
