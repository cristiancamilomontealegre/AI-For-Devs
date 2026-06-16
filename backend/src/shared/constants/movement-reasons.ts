import { MovementReason } from '../enums/movement-reason.enum';
import { MovementType } from '../enums/movement-type.enum';

export const INBOUND_REASONS: MovementReason[] = [
  MovementReason.PURCHASE,
  MovementReason.ADJUSTMENT,
  MovementReason.RETURN,
];

export const OUTBOUND_REASONS: MovementReason[] = [
  MovementReason.SALE,
  MovementReason.ADJUSTMENT,
  MovementReason.LOSS,
];

export function getValidReasonsForType(type: MovementType): MovementReason[] {
  return type === MovementType.INBOUND ? INBOUND_REASONS : OUTBOUND_REASONS;
}
