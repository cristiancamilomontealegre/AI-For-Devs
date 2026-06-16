import { api } from './api';
import type {
  CreateMovementPayload,
  MovementFilters,
  MovementWithProduct,
} from '../types/movement';

export type { MovementFilters };

export const movementsService = {
  async create(payload: CreateMovementPayload): Promise<MovementWithProduct> {
    const { data } = await api.post<MovementWithProduct>('/movements', payload);
    return data;
  },

  async getAll(filters: MovementFilters = {}): Promise<MovementWithProduct[]> {
    const { data } = await api.get<MovementWithProduct[]>('/movements', {
      params: filters,
    });
    return data;
  },
};
