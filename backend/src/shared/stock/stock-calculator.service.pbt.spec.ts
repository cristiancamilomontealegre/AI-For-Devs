import * as fc from 'fast-check';
import { MovementType } from '../enums/movement-type.enum';
import { ProductStatus } from '../enums/product-status.enum';
import { StockCalculatorService } from './stock-calculator.service';

interface SimulatedMovement {
  type: MovementType;
  quantity: number;
}

function simulateLedger(movements: SimulatedMovement[]): number {
  let stock = 0;

  for (const movement of movements) {
    if (movement.type === MovementType.INBOUND) {
      stock += movement.quantity;
      continue;
    }

    if (movement.quantity > stock) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    stock -= movement.quantity;
  }

  return stock;
}

function sumStockMathematically(movements: SimulatedMovement[]): number {
  return movements.reduce(
    (total, movement) =>
      movement.type === MovementType.INBOUND
        ? total + movement.quantity
        : total - movement.quantity,
    0,
  );
}

const movementArb = fc.record({
  type: fc.constantFrom(MovementType.INBOUND, MovementType.OUTBOUND),
  quantity: fc.integer({ min: 1, max: 500 }),
});

const validMovementSequenceArb = fc
  .array(movementArb, { minLength: 0, maxLength: 40 })
  .filter((movements) => {
    try {
      simulateLedger(movements);
      return true;
    } catch {
      return false;
    }
  });

describe('Inventory properties (PBT)', () => {
  const stockCalculator = new StockCalculatorService(
    null as never,
  );

  describe('P1 — stock never negative after valid movement sequences', () => {
    it('keeps non-negative stock when only service-valid outbounds are applied', () => {
      fc.assert(
        fc.property(validMovementSequenceArb, (movements) => {
          const finalStock = simulateLedger(movements);
          expect(finalStock).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 200 },
      );
    });

    it('allows outbound that exactly depletes stock without going negative', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 500 }), (stock) => {
          const finalStock = simulateLedger([
            { type: MovementType.INBOUND, quantity: stock },
            { type: MovementType.OUTBOUND, quantity: stock },
          ]);

          expect(finalStock).toBe(0);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('P3 — stock consistency with mathematical sum', () => {
    it('matches inbound minus outbound totals for any raw totals', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 10_000 }),
          fc.nat({ max: 10_000 }),
          (inbound, outbound) => {
            const calculated = stockCalculator.toCurrentStock({
              inboundTotal: String(inbound),
              outboundTotal: String(outbound),
            });

            expect(calculated).toBe(inbound - outbound);
          },
        ),
        { numRuns: 300 },
      );
    });

    it('matches mathematical sum for any movement sequence', () => {
      fc.assert(
        fc.property(fc.array(movementArb, { maxLength: 50 }), (movements) => {
          const inbound = movements
            .filter((m) => m.type === MovementType.INBOUND)
            .reduce((sum, m) => sum + m.quantity, 0);
          const outbound = movements
            .filter((m) => m.type === MovementType.OUTBOUND)
            .reduce((sum, m) => sum + m.quantity, 0);

          expect(
            stockCalculator.toCurrentStock({
              inboundTotal: String(inbound),
              outboundTotal: String(outbound),
            }),
          ).toBe(sumStockMathematically(movements));
        }),
        { numRuns: 200 },
      );
    });
  });

  describe('P9 — low-stock alerts are deterministic', () => {
    it('alerts iff active product stock is strictly below minimum', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ProductStatus.ACTIVE, ProductStatus.INACTIVE),
          fc.nat({ max: 10_000 }),
          fc.nat({ max: 10_000 }),
          (status, currentStock, minimumStock) => {
            const alert = stockCalculator.computeLowStockAlert(
              status,
              currentStock,
              minimumStock,
            );
            const expected =
              status === ProductStatus.ACTIVE && currentStock < minimumStock;

            expect(alert).toBe(expected);
          },
        ),
        { numRuns: 300 },
      );
    });

    it('does not alert at exact minimum; alerts one unit below', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10_000 }), (minimumStock) => {
          expect(
            stockCalculator.computeLowStockAlert(
              ProductStatus.ACTIVE,
              minimumStock,
              minimumStock,
            ),
          ).toBe(false);
          expect(
            stockCalculator.computeLowStockAlert(
              ProductStatus.ACTIVE,
              minimumStock - 1,
              minimumStock,
            ),
          ).toBe(true);
        }),
        { numRuns: 200 },
      );
    });
  });
});
