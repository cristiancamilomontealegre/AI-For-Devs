import type { CreateProductPayload } from '../services/products.service';
import type { UnitOfMeasure } from '../types/product';
import { UNIT_OF_MEASURE_OPTIONS } from '../types/product';
import { MAX_QUANTITY, parseBoundedInteger } from './quantity-limits';

export const MAX_SKU_LENGTH = 50;
export const MAX_NAME_LENGTH = 255;
export const MAX_CATEGORY_LENGTH = 100;

export interface ProductFormInput {
  sku: string;
  name: string;
  description: string;
  category: string;
  unitOfMeasure: UnitOfMeasure;
  priceInput: string;
  minimumStockInput: string;
}

export interface ProductFieldErrors {
  sku: string | null;
  name: string | null;
  category: string | null;
  price: string | null;
  minimumStock: string | null;
}

export interface ProductValidationResult {
  fieldErrors: ProductFieldErrors;
  isValid: boolean;
}

export function parsePrice(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseMinimumStock(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return 0;
  }

  return parseBoundedInteger(trimmed, { min: 0, max: MAX_QUANTITY });
}

export function isValidUnitOfMeasure(value: string): value is UnitOfMeasure {
  return UNIT_OF_MEASURE_OPTIONS.some((option) => option.value === value);
}

export function validateProductForm(
  input: ProductFormInput,
): ProductValidationResult {
  const fieldErrors: ProductFieldErrors = {
    sku: null,
    name: null,
    category: null,
    price: null,
    minimumStock: null,
  };

  const sku = input.sku.trim();
  if (!sku) {
    fieldErrors.sku = 'SKU is required';
  } else if (sku.length > MAX_SKU_LENGTH) {
    fieldErrors.sku = `SKU must be at most ${MAX_SKU_LENGTH} characters`;
  }

  const name = input.name.trim();
  if (!name) {
    fieldErrors.name = 'Name is required';
  } else if (name.length > MAX_NAME_LENGTH) {
    fieldErrors.name = `Name must be at most ${MAX_NAME_LENGTH} characters`;
  }

  const category = input.category.trim();
  if (!category) {
    fieldErrors.category = 'Category is required';
  } else if (category.length > MAX_CATEGORY_LENGTH) {
    fieldErrors.category = `Category must be at most ${MAX_CATEGORY_LENGTH} characters`;
  }

  const price = parsePrice(input.priceInput);
  if (price === null) {
    fieldErrors.price =
      'Price must be a positive number with up to 2 decimal places';
  } else if (price < 0.01) {
    fieldErrors.price = 'Price must be at least 0.01';
  }

  const minimumStock = parseMinimumStock(input.minimumStockInput);
  if (minimumStock === null) {
    fieldErrors.minimumStock =
      'Minimum stock must be a non-negative integer up to 2,147,483,647';
  } else if (minimumStock < 0) {
    fieldErrors.minimumStock = 'Minimum stock must be a non-negative integer';
  } else if (minimumStock > MAX_QUANTITY) {
    fieldErrors.minimumStock = `Minimum stock must be at most ${MAX_QUANTITY.toLocaleString('en-US')}`;
  }

  const isValid = Object.values(fieldErrors).every((error) => error === null);

  return { fieldErrors, isValid };
}

export function buildCreateProductPayload(
  input: ProductFormInput,
): CreateProductPayload | null {
  const validation = validateProductForm(input);
  if (!validation.isValid || !isValidUnitOfMeasure(input.unitOfMeasure)) {
    return null;
  }

  const price = parsePrice(input.priceInput);
  const minimumStock = parseMinimumStock(input.minimumStockInput);

  if (price === null || minimumStock === null) {
    return null;
  }

  const payload: CreateProductPayload = {
    sku: input.sku.trim(),
    name: input.name.trim(),
    category: input.category.trim(),
    unitOfMeasure: input.unitOfMeasure,
    price,
    minimumStock,
  };

  const description = input.description.trim();
  if (description) {
    payload.description = description;
  }

  return payload;
}
