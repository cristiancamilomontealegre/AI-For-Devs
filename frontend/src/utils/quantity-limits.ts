/** PostgreSQL signed 32-bit integer upper bound. */
export const MAX_QUANTITY = 2_147_483_647;

const MAX_QUANTITY_DIGITS = String(MAX_QUANTITY).length;

export function parseBoundedInteger(
  value: string,
  options: { min: number; max?: number },
): number | null {
  const max = options.max ?? MAX_QUANTITY;
  const trimmed = value.trim();

  if (trimmed === '') {
    return null;
  }

  if (!/^\d+$/.test(trimmed) || trimmed.length > MAX_QUANTITY_DIGITS) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || parsed < options.min || parsed > max) {
    return null;
  }

  return parsed;
}
