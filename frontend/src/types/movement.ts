export type MovementType = 'inbound' | 'outbound';

export type MovementReason =
  | 'purchase'
  | 'sale'
  | 'adjustment'
  | 'return'
  | 'loss';

export interface CreateMovementPayload {
  productId: number;
  type: MovementType;
  quantity: number;
  reason: MovementReason;
}

export interface Movement {
  id: number;
  productId: number;
  type: MovementType;
  quantity: number;
  reason: MovementReason;
  occurredAt: string;
}

export interface MovementProductSummary {
  id: number;
  sku: string;
  name: string;
  unitOfMeasure?: 'units' | 'kg' | 'liters';
}

export interface MovementWithProduct extends Movement {
  product?: MovementProductSummary;
}

export interface MovementFilters {
  productId?: number;
  type?: MovementType;
  startDate?: string;
  endDate?: string;
}

export interface ReasonOption {
  value: MovementReason;
  label: string;
}

export const INBOUND_REASONS: ReasonOption[] = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Return' },
];

export const OUTBOUND_REASONS: ReasonOption[] = [
  { value: 'sale', label: 'Sale' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'loss', label: 'Loss' },
];

export function getReasonsForType(type: MovementType): ReasonOption[] {
  return type === 'inbound' ? INBOUND_REASONS : OUTBOUND_REASONS;
}

const REASON_LABELS: Record<MovementReason, string> = {
  purchase: 'Purchase',
  sale: 'Sale',
  adjustment: 'Adjustment',
  return: 'Return',
  loss: 'Loss (shrinkage)',
};

export function formatMovementReason(reason: MovementReason): string {
  return REASON_LABELS[reason] ?? reason;
}

export function formatMovementType(type: MovementType): string {
  return type === 'inbound' ? 'Inbound' : 'Outbound';
}
