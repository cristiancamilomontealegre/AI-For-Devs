import { useCallback } from 'react';
import { movementsService } from '../services/movements.service';
import { useAsync } from './useAsync';
import type { MovementFilters, MovementWithProduct } from '../types/movement';

const EMPTY_MOVEMENTS: MovementWithProduct[] = [];

export function useMovements(filters: MovementFilters) {
  const { productId, type, startDate, endDate } = filters;

  const fetcher = useCallback(async () => {
    return movementsService.getAll({
      productId,
      type,
      startDate,
      endDate,
    });
  }, [productId, type, startDate, endDate]);

  const { data, loading, error, refetch } = useAsync(fetcher, {
    initialData: EMPTY_MOVEMENTS,
    deps: [productId, type, startDate, endDate],
  });

  return { movements: data, loading, error, refetch };
}
