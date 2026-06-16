import type { ProductStatus, UnitOfMeasure } from '../types/product';
import { formatUnitShort } from '../types/product';
import './stock-badge.css';

export interface StockBadgeProps {
  currentStock?: number | null;
  minimumStock?: number | null;
  status?: ProductStatus | null;
  unitOfMeasure?: UnitOfMeasure | null;
}

type BadgeVariant = 'success' | 'danger' | 'inactive' | 'unknown';

interface NormalizedStockBadgeProps {
  currentStock: number;
  minimumStock: number;
  status: ProductStatus;
  variant: BadgeVariant;
}

function normalizeProps(props: StockBadgeProps): NormalizedStockBadgeProps {
  const currentStock = Number.isFinite(Number(props.currentStock))
    ? Number(props.currentStock)
    : 0;

  const minimumStock = Number.isFinite(Number(props.minimumStock))
    ? Number(props.minimumStock)
    : 0;

  const status: ProductStatus =
    props.status === 'active' || props.status === 'inactive'
      ? props.status
      : 'inactive';

  if (props.currentStock == null && props.minimumStock == null && !props.status) {
    return {
      currentStock: 0,
      minimumStock: 0,
      status: 'inactive',
      variant: 'unknown',
    };
  }

  if (status === 'inactive') {
    return { currentStock, minimumStock, status, variant: 'inactive' };
  }

  return {
    currentStock,
    minimumStock,
    status,
    variant: currentStock >= minimumStock ? 'success' : 'danger',
  };
}

export function StockBadge(props: StockBadgeProps) {
  const { currentStock, variant } = normalizeProps(props);
  const unitLabel = formatUnitShort(props.unitOfMeasure ?? 'units');
  const isLowStock = variant === 'danger';

  return (
    <span
      className={`stock-badge stock-badge--${variant}`}
      role="status"
      aria-label={
        variant === 'unknown'
          ? 'Stock unavailable'
          : variant === 'inactive'
            ? 'Inactive product'
            : isLowStock
              ? `Low stock: ${currentStock} ${unitLabel}`
              : `Stock: ${currentStock} ${unitLabel}`
      }
    >
      {variant === 'unknown' ? (
        '—'
      ) : variant === 'inactive' ? (
        'Inactive'
      ) : (
        <>
          {isLowStock && (
            <span className="stock-badge__alert" aria-hidden="true">
              ⚠
            </span>
          )}
          {currentStock} {unitLabel}
        </>
      )}
    </span>
  );
}
