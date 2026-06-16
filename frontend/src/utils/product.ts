import type {
  ProductStatus,
  ProductWithStock,
  UnitOfMeasure,
} from '../types/product';

const VALID_UNITS: UnitOfMeasure[] = ['units', 'kg', 'liters'];

export function normalizeProductWithStock(
  raw: Partial<ProductWithStock> | null | undefined,
): ProductWithStock | null {
  if (!raw?.id || !raw.sku) {
    return null;
  }

  const status: ProductStatus =
    raw.status === 'active' || raw.status === 'inactive'
      ? raw.status
      : 'inactive';

  const unitOfMeasure: UnitOfMeasure = VALID_UNITS.includes(
    raw.unitOfMeasure as UnitOfMeasure,
  )
    ? (raw.unitOfMeasure as UnitOfMeasure)
    : 'units';

  const currentStock = Number.isFinite(Number(raw.currentStock))
    ? Number(raw.currentStock)
    : 0;

  const minimumStock = Number.isFinite(Number(raw.minimumStock))
    ? Number(raw.minimumStock)
    : 0;

  return {
    id: raw.id,
    sku: raw.sku,
    name: raw.name ?? 'Unknown product',
    description: raw.description ?? null,
    category: raw.category ?? 'Uncategorized',
    unitOfMeasure,
    price: Number(raw.price ?? 0),
    minimumStock,
    status,
    currentStock,
    lowStockAlert: Boolean(raw.lowStockAlert),
    hasMovements: Boolean(raw.hasMovements),
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
  };
}
