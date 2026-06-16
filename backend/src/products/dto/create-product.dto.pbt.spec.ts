import * as fc from 'fast-check';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

const validProductBase = {
  sku: 'SKU-PBT',
  name: 'PBT Product',
  category: 'General',
  price: 10,
};

describe('CreateProductDto properties (PBT)', () => {
  describe('P4 — minimum stock must not be negative', () => {
    it('rejects any negative minimumStock value', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ max: -1 }), async (minimumStock) => {
          const dto = plainToInstance(CreateProductDto, {
            ...validProductBase,
            minimumStock,
          });

          const errors = await validate(dto);
          expect(errors.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });

    it('accepts zero as a valid minimumStock boundary', async () => {
      const dto = plainToInstance(CreateProductDto, {
        ...validProductBase,
        minimumStock: 0,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('accepts any non-negative minimumStock', async () => {
      await fc.assert(
        fc.asyncProperty(fc.nat({ max: 10_000 }), async (minimumStock) => {
          const dto = plainToInstance(CreateProductDto, {
            ...validProductBase,
            minimumStock,
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });
  });
});
