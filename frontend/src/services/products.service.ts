import { api } from './api';
import type { ProductStatus, ProductWithStock, UnitOfMeasure } from '../types/product';

export interface CreateProductPayload {
  sku: string;
  name: string;
  description?: string;
  category: string;
  unitOfMeasure?: UnitOfMeasure;
  price: number;
  minimumStock?: number;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  category?: string;
  unitOfMeasure?: UnitOfMeasure;
  price?: number;
  minimumStock?: number;
}

export const productsService = {
  async update(
    productId: number,
    payload: UpdateProductPayload,
  ): Promise<ProductWithStock> {
    const { data } = await api.patch(`/products/${productId}`, payload);
    return data;
  },

  async updateState(
    productId: number,
    status: ProductStatus,
  ): Promise<ProductWithStock> {
    const { data } = await api.patch(`/products/${productId}/state`, { status });
    return data;
  },

  async remove(productId: number): Promise<void> {
    await api.delete(`/products/${productId}`);
  },

  async create(payload: CreateProductPayload): Promise<ProductWithStock> {
    const { data } = await api.post('/products', payload);
    return data;
  },
};
