import { describe, expect, it } from 'vitest';
import {
  buildCreateProductPayload,
  validateProductForm,
} from './product-validation';

describe('validateProductForm', () => {
  it('accepts a valid product form', () => {
    const result = validateProductForm({
      sku: 'SKU-001',
      name: 'Widget',
      description: 'A useful widget',
      category: 'Electronics',
      unitOfMeasure: 'units',
      priceInput: '19.99',
      minimumStockInput: '5',
    });

    expect(result.isValid).toBe(true);
    expect(result.fieldErrors).toEqual({
      sku: null,
      name: null,
      category: null,
      price: null,
      minimumStock: null,
    });
  });

  it('rejects empty SKU and name', () => {
    const result = validateProductForm({
      sku: '   ',
      name: '',
      description: '',
      category: '',
      unitOfMeasure: 'units',
      priceInput: '10',
      minimumStockInput: '0',
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.sku).toBe('SKU is required');
    expect(result.fieldErrors.name).toBe('Name is required');
    expect(result.fieldErrors.category).toBe('Category is required');
  });

  it('rejects invalid price and minimum stock', () => {
    const result = validateProductForm({
      sku: 'SKU-002',
      name: 'Widget',
      description: '',
      category: 'General',
      unitOfMeasure: 'units',
      priceInput: '0',
      minimumStockInput: '1.5',
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.price).toBe('Price must be at least 0.01');
    expect(result.fieldErrors.minimumStock).toBe(
      'Minimum stock must be a non-negative integer up to 2,147,483,647',
    );
  });

  it('rejects minimum stock above the allowed maximum', () => {
    const result = validateProductForm({
      sku: 'SKU-006',
      name: 'Widget',
      description: '',
      category: 'General',
      unitOfMeasure: 'units',
      priceInput: '10',
      minimumStockInput: '30000000000000000000000',
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.minimumStock).toBe(
      'Minimum stock must be a non-negative integer up to 2,147,483,647',
    );
  });

  it('rejects prices with more than two decimal places', () => {
    const result = validateProductForm({
      sku: 'SKU-003',
      name: 'Widget',
      description: '',
      category: 'General',
      unitOfMeasure: 'units',
      priceInput: '10.999',
      minimumStockInput: '0',
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.price).toBe(
      'Price must be a positive number with up to 2 decimal places',
    );
  });
});

describe('buildCreateProductPayload', () => {
  it('builds the API payload without empty description', () => {
    const payload = buildCreateProductPayload({
      sku: ' SKU-004 ',
      name: ' Widget ',
      description: '   ',
      category: ' Office ',
      unitOfMeasure: 'units',
      priceInput: '12.5',
      minimumStockInput: '',
    });

    expect(payload).toEqual({
      sku: 'SKU-004',
      name: 'Widget',
      category: 'Office',
      unitOfMeasure: 'units',
      price: 12.5,
      minimumStock: 0,
    });
  });

  it('includes description when provided', () => {
    const payload = buildCreateProductPayload({
      sku: 'SKU-005',
      name: 'Widget',
      description: 'Optional details',
      category: 'Hardware',
      unitOfMeasure: 'kg',
      priceInput: '8',
      minimumStockInput: '2',
    });

    expect(payload).toEqual({
      sku: 'SKU-005',
      name: 'Widget',
      description: 'Optional details',
      category: 'Hardware',
      unitOfMeasure: 'kg',
      price: 8,
      minimumStock: 2,
    });
  });
});
