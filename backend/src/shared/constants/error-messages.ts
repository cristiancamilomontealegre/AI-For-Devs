export const ErrorMessages = {
  PRODUCT_NOT_FOUND: (id: number) => `Product with id ${id} not found`,
  SKU_ALREADY_EXISTS: 'SKU already exists',
  PRODUCT_HAS_MOVEMENTS:
    'Cannot delete product because it has associated movements',
  INACTIVE_PRODUCT_MOVEMENT:
    'Movements cannot be registered for an inactive product',
  INSUFFICIENT_STOCK: 'Insufficient stock to complete outbound movement',
  INVALID_DATE_RANGE: 'startDate cannot be after endDate',
  INVALID_REASON_FOR_TYPE: (reason: string, type: string) =>
    `Reason "${reason}" is not valid for movement type "${type}"`,
  INTERNAL_SERVER_ERROR: 'Internal server error',
} as const;
