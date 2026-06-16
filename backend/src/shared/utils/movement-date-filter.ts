export interface DatedMovement {
  occurredAt: Date;
}

/**
 * Mirrors MovementsService.findAll date filtering (occurredAt >= start, occurredAt <= end).
 */
export function filterMovementsByDateRange<T extends DatedMovement>(
  movements: T[],
  startDate?: Date,
  endDate?: Date,
): T[] {
  return movements.filter((movement) => {
    if (startDate && movement.occurredAt < startDate) {
      return false;
    }

    if (endDate && movement.occurredAt > endDate) {
      return false;
    }

    return true;
  });
}

export function assertMovementsWithinDateRange(
  movements: DatedMovement[],
  startDate: Date,
  endDate: Date,
): void {
  for (const movement of movements) {
    if (movement.occurredAt < startDate || movement.occurredAt > endDate) {
      throw new Error('Movement outside requested date range');
    }
  }
}
