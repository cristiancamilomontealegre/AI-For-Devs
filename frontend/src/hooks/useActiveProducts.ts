import { useCallback } from 'react';
import { inventoryService } from '../services/inventory.service';
import { useAsync } from './useAsync';
import type { ProductWithStock } from '../types/product';
import { normalizeProductWithStock } from '../utils/product';

const EMPTY_PRODUCTS: ProductWithStock[] = [];

export function useActiveProducts() {
  const fetcher = useCallback(async () => {
    const data = await inventoryService.getAll({ status: 'active' });
    return data
      .map(normalizeProductWithStock)
      .filter((product): product is ProductWithStock => product !== null);
  }, []);

  const { data, loading, error, refetch } = useAsync(fetcher, {
    initialData: EMPTY_PRODUCTS,
  });

  return { products: data, loading, error, refetch };
}
