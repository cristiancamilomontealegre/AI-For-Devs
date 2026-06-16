import { describe, expect, it } from 'vitest';
import { validateMovementForm } from './movement-validation';

describe('validateMovementForm', () => {
  it('rejects outbound quantity greater than available stock', () => {
    const result = validateMovementForm({
      quantity: 6,
      type: 'outbound',
      currentStock: 5,
      stockLoading: false,
      hasProduct: true,
      hasReason: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.quantityError).toBe(
      'Insufficient stock for this outbound movement',
    );
  });

  it('allows outbound when quantity equals current stock', () => {
    const result = validateMovementForm({
      quantity: 5,
      type: 'outbound',
      currentStock: 5,
      stockLoading: false,
      hasProduct: true,
      hasReason: true,
    });

    expect(result.isValid).toBe(true);
    expect(result.quantityError).toBeNull();
  });

  it('rejects non-positive quantities', () => {
    const result = validateMovementForm({
      quantity: 0,
      type: 'inbound',
      currentStock: 10,
      stockLoading: false,
      hasProduct: true,
      hasReason: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.quantityError).toBe('Quantity must be greater than 0');
  });

  it('rejects quantities above the allowed maximum', () => {
    const result = validateMovementForm({
      quantity: 2_147_483_648,
      type: 'inbound',
      currentStock: 10,
      stockLoading: false,
      hasProduct: true,
      hasReason: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.quantityError).toBe('Quantity must be at most 2,147,483,647');
  });

  it('disables submit while stock is loading for outbound movements', () => {
    const result = validateMovementForm({
      quantity: 2,
      type: 'outbound',
      currentStock: 10,
      stockLoading: true,
      hasProduct: true,
      hasReason: true,
    });

    expect(result.isValid).toBe(false);
  });
});
