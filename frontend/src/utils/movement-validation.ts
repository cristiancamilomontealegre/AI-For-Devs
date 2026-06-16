import { MAX_QUANTITY, parseBoundedInteger } from './quantity-limits';

export interface MovementValidationInput {
  quantity: number | null;
  type: 'inbound' | 'outbound';
  currentStock: number | null;
  stockLoading: boolean;
  hasProduct: boolean;
  hasReason: boolean;
}

export interface MovementValidationResult {
  quantityError: string | null;
  isValid: boolean;
}

export function parseQuantity(value: string): number | null {
  return parseBoundedInteger(value, { min: 1, max: MAX_QUANTITY });
}

export function validateMovementForm(
  input: MovementValidationInput,
): MovementValidationResult {
  const {
    quantity,
    type,
    currentStock,
    stockLoading,
    hasProduct,
    hasReason,
  } = input;

  let quantityError: string | null = null;

  if (quantity === null) {
    quantityError = 'Quantity must be a whole number between 1 and 2,147,483,647';
  } else if (quantity <= 0) {
    quantityError = 'Quantity must be greater than 0';
  } else if (quantity > MAX_QUANTITY) {
    quantityError = `Quantity must be at most ${MAX_QUANTITY.toLocaleString('en-US')}`;
  } else if (
    type === 'outbound' &&
    currentStock !== null &&
    quantity > currentStock
  ) {
    quantityError = 'Insufficient stock for this outbound movement';
  }

  const isValid =
    hasProduct &&
    hasReason &&
    quantityError === null &&
    quantity !== null &&
    !(type === 'outbound' && stockLoading);

  return { quantityError, isValid };
}

export function computeProjectedStock(
  currentStock: number | null,
  quantity: number | null,
  type: 'inbound' | 'outbound',
): number | null {
  if (currentStock === null || quantity === null || quantity <= 0) {
    return null;
  }

  return type === 'inbound'
    ? currentStock + quantity
    : currentStock - quantity;
}
