import { useCallback } from 'react';
import { inventoryService } from '../services/inventory.service';
import { useAsync } from './useAsync';

export function useStock(productId: number | null) {
  const fetcher = useCallback(async () => {
    if (productId === null) {
      return null;
    }

    const product = await inventoryService.getById(productId);
    return product.currentStock;
  }, [productId]);

  const { data, loading, error, refetch } = useAsync(fetcher, {
    initialData: null as number | null,
    enabled: productId !== null,
    deps: [productId],
  });

  return { currentStock: data, loading, error, refetch };
}
