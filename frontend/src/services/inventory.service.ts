import { api } from './api';
import type { InventoryFilters, ProductWithStock } from '../types/product';

export const inventoryService = {
  async getAll(filters?: InventoryFilters): Promise<ProductWithStock[]> {
    const { data } = await api.get<ProductWithStock[]>('/inventory', {
      params: filters,
    });
    return data;
  },

  async getById(productId: number): Promise<ProductWithStock> {
    const { data } = await api.get<ProductWithStock>(
      `/inventory/products/${productId}`,
    );
    return data;
  },
};
