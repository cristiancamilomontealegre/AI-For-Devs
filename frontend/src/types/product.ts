export type ProductStatus = 'active' | 'inactive';

export type UnitOfMeasure = 'units' | 'kg' | 'liters';

export interface ProductWithStock {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unitOfMeasure: UnitOfMeasure;
  price: number;
  minimumStock: number;
  status: ProductStatus;
  currentStock: number;
  lowStockAlert: boolean;
  hasMovements: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryFilters {
  name?: string;
  sku?: string;
  category?: string;
  status?: ProductStatus;
}

export const UNIT_OF_MEASURE_OPTIONS: Array<{
  value: UnitOfMeasure;
  label: string;
}> = [
  { value: 'units', label: 'Units' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'liters', label: 'Liters' },
];

export function formatUnitLabel(unit: UnitOfMeasure): string {
  return UNIT_OF_MEASURE_OPTIONS.find((option) => option.value === unit)?.label ?? unit;
}

export function formatUnitShort(unit: UnitOfMeasure): string {
  switch (unit) {
    case 'kg':
      return 'kg';
    case 'liters':
      return 'L';
    default:
      return 'units';
  }
}
