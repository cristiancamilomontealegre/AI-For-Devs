import { useMemo, useState } from 'react';
import { useMovements } from '../hooks/useMovements';
import { useProducts } from '../hooks/useProducts';
import type { MovementType } from '../types/movement';
import {
  formatMovementReason,
  formatMovementType,
} from '../types/movement';
import { formatUnitShort } from '../types/product';
import { LoadingSpinner } from './loading-spinner';
import { ErrorMessage } from './error-message';
import './movement-history.css';

type TypeFilter = MovementType | 'all';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function MovementHistory() {
  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filters = useMemo(
    () => ({
      productId,
      type: typeFilter === 'all' ? undefined : typeFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [productId, typeFilter, startDate, endDate],
  );

  const { products, loading: productsLoading } = useProducts({
    statusFilter: 'all',
  });
  const { movements, loading, error, refetch } = useMovements(filters);

  return (
    <section className="movement-history">
      <header className="movement-history__header">
        <div>
          <h1 className="movement-history__title">Movement History</h1>
          <p className="movement-history__subtitle">
            Browse inbound and outbound movements with filters
          </p>
        </div>
      </header>

      <div className="movement-history__filters">
        <label className="movement-history__filter">
          <span className="movement-history__filter-label">Product</span>
          <select
            className="movement-history__select"
            value={productId ?? ''}
            disabled={productsLoading}
            onChange={(event) => {
              const value = event.target.value;
              setProductId(value ? Number(value) : undefined);
            }}
            aria-label="Filter by product"
          >
            <option value="">All products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.sku} — {product.name}
              </option>
            ))}
          </select>
        </label>

        <label className="movement-history__filter">
          <span className="movement-history__filter-label">Type</span>
          <select
            className="movement-history__select"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as TypeFilter)
            }
            aria-label="Filter by movement type"
          >
            <option value="all">All types</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
        </label>

        <label className="movement-history__filter">
          <span className="movement-history__filter-label">From</span>
          <input
            type="date"
            className="movement-history__input"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            aria-label="Start date"
          />
        </label>

        <label className="movement-history__filter">
          <span className="movement-history__filter-label">To</span>
          <input
            type="date"
            className="movement-history__input"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            aria-label="End date"
          />
        </label>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && error && (
        <ErrorMessage message={error} onRetry={() => void refetch()} />
      )}

      {!loading && !error && (
        <>
          <p className="movement-history__count" aria-live="polite">
            {movements.length} movement{movements.length !== 1 ? 's' : ''} found
          </p>

          {movements.length === 0 ? (
            <p className="movement-history__empty">
              No movements match your filters.
            </p>
          ) : (
            <div className="movement-history__table-wrapper">
              <table className="movement-history__table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Product</th>
                    <th scope="col">Type</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const unit = formatUnitShort(
                      movement.product?.unitOfMeasure ?? 'units',
                    );

                    return (
                      <tr key={movement.id}>
                        <td>
                          {dateFormatter.format(new Date(movement.occurredAt))}
                        </td>
                        <td>
                          {movement.product?.name ?? `Product #${movement.productId}`}
                          {movement.product?.sku && (
                            <span className="movement-history__product-sku">
                              {movement.product.sku}
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`movement-history__type--${movement.type}`}
                          >
                            {formatMovementType(movement.type)}
                          </span>
                        </td>
                        <td>{formatMovementReason(movement.reason)}</td>
                        <td>
                          {movement.quantity} {unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
