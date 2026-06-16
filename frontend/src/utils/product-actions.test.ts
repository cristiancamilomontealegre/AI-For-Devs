import { describe, expect, it } from 'vitest';
import {
  getActivateConfirmMessage,
  getDeactivateConfirmMessage,
  getDeleteBlockedMessage,
  getDeleteConfirmMessage,
} from './product-actions';
import type { ProductWithStock } from '../types/product';

const baseProduct: ProductWithStock = {
  id: 1,
  sku: 'SKU-001',
  name: 'Widget',
  description: null,
  price: 10,
  minimumStock: 5,
  status: 'active',
  currentStock: 0,
  lowStockAlert: false,
  hasMovements: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('product action confirmations', () => {
  it('warns when deactivating a product with stock', () => {
    const message = getDeactivateConfirmMessage({
      ...baseProduct,
      currentStock: 12,
    });

    expect(message).toContain('12 units in stock');
    expect(message).toContain('Stock will remain visible');
  });

  it('explains deactivate instead of delete when product has movements', () => {
    const message = getDeactivateConfirmMessage({
      ...baseProduct,
      hasMovements: true,
      currentStock: 4,
    });

    expect(message).toContain('movement history');
    expect(message).toContain('Use Deactivate instead of Delete');
  });

  it('describes permanent delete constraints', () => {
    const message = getDeleteConfirmMessage(baseProduct);

    expect(message).toContain('Permanently delete');
    expect(message).toContain('without movement history');
    expect(message).toContain('use Deactivate instead');
  });

  it('explains why delete is blocked for products with movements', () => {
    const message = getDeleteBlockedMessage({
      ...baseProduct,
      hasMovements: true,
      currentStock: 7,
    });

    expect(message).toContain('registered movements');
    expect(message).toContain('Use Deactivate');
    expect(message).toContain('7 units');
  });

  it('describes activation availability', () => {
    expect(getActivateConfirmMessage(baseProduct)).toContain(
      'available again for new inbound and outbound movements',
    );
  });
});
