import { describe, expect, it } from 'vitest';
import { MAX_QUANTITY, parseBoundedInteger } from './quantity-limits';

describe('parseBoundedInteger', () => {
  it('accepts values within the configured range', () => {
    expect(parseBoundedInteger('1', { min: 1 })).toBe(1);
    expect(parseBoundedInteger('0', { min: 0 })).toBe(0);
    expect(parseBoundedInteger(String(MAX_QUANTITY), { min: 0 })).toBe(
      MAX_QUANTITY,
    );
  });

  it('rejects absurdly large numeric strings', () => {
    expect(parseBoundedInteger('20000000000000000000000', { min: 1 })).toBeNull();
    expect(parseBoundedInteger('999999999999999999999', { min: 0 })).toBeNull();
  });

  it('rejects values above the maximum', () => {
    expect(
      parseBoundedInteger(String(MAX_QUANTITY + 1), { min: 1 }),
    ).toBeNull();
  });

  it('rejects non-integer input', () => {
    expect(parseBoundedInteger('12.5', { min: 0 })).toBeNull();
    expect(parseBoundedInteger('abc', { min: 0 })).toBeNull();
  });
});
