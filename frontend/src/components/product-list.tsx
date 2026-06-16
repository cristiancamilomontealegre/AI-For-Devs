import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts, type StatusFilter } from '../hooks/useProducts';
import type { ProductWithStock } from '../types/product';
import { formatUnitShort } from '../types/product';
import { StockBadge } from './stock-badge';
import { LoadingSpinner } from './loading-spinner';
import { ErrorMessage } from './error-message';
import { ProductEditDialog } from './product-edit-dialog';
import { ProductRowActions } from './product-row-actions';
import { Toast, type ToastVariant } from './toast';
import './product-list.css';

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function matchesSearch(product: ProductWithStock, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) {
    return true;
  }

  return (
    product.name.toLowerCase().includes(term) ||
    product.sku.toLowerCase().includes(term) ||
    product.category.toLowerCase().includes(term)
  );
}

export function ProductList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);
  const { products, loading, error, refetch } = useProducts({ statusFilter });

  const filteredProducts = useMemo(
    () => products.filter((product) => matchesSearch(product, search)),
    [products, search],
  );

  return (
    <section className="product-list">
      <header className="product-list__header">
        <div>
          <h1 className="product-list__title">Product Inventory</h1>
          <p className="product-list__subtitle">
            Real-time stock calculated from movements
          </p>
        </div>
      </header>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      <div className="product-list__filters">
        <label className="product-list__filter">
          <span className="product-list__filter-label">Search</span>
          <input
            type="search"
            className="product-list__input"
            placeholder="Name, SKU, or category…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search by name or SKU"
          />
        </label>

        <label className="product-list__filter">
          <span className="product-list__filter-label">Status</span>
          <select
            className="product-list__select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && error && (
        <ErrorMessage message={error} onRetry={() => void refetch()} />
      )}

      {!loading && !error && (
        <>
          <p className="product-list__count" aria-live="polite">
            {filteredProducts.length} product
            {filteredProducts.length !== 1 ? 's' : ''} found
          </p>

          {products.length === 0 ? (
            <p className="product-list__empty">
              No products in inventory yet.{' '}
              <Link to="/products/new">Create your first product</Link>.
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="product-list__empty">
              No products match your search or filters.
            </p>
          ) : (
            <div className="product-list__table-wrapper">
              <table className="product-list__table">
                <thead>
                  <tr>
                    <th scope="col">SKU</th>
                    <th scope="col">Name</th>
                    <th scope="col">Category</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Price</th>
                    <th scope="col">Current Stock</th>
                    <th scope="col">Minimum Stock</th>
                    <th scope="col">Stock</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="product-list__sku">{product.sku}</td>
                      <td>{product.name}</td>
                      <td>{product.category}</td>
                      <td>{formatUnitShort(product.unitOfMeasure)}</td>
                      <td>{priceFormatter.format(product.price)}</td>
                      <td>
                        {product.currentStock}{' '}
                        {formatUnitShort(product.unitOfMeasure)}
                      </td>
                      <td>
                        {product.minimumStock}{' '}
                        {formatUnitShort(product.unitOfMeasure)}
                      </td>
                      <td>
                        <StockBadge
                          currentStock={product.currentStock}
                          minimumStock={product.minimumStock}
                          status={product.status}
                          unitOfMeasure={product.unitOfMeasure}
                        />
                      </td>
                      <td>
                        <span
                          className={`product-list__status product-list__status--${product.status}`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td>
                        <ProductRowActions
                          product={product}
                          busy={actionBusyId === product.id}
                          onBusyChange={(busy) =>
                            setActionBusyId(busy ? product.id : null)
                          }
                          onEdit={() => setEditingProduct(product)}
                          onChanged={() => void refetch()}
                          onError={(message) =>
                            setToast({ message, variant: 'error' })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editingProduct && (
        <ProductEditDialog
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            void refetch();
            setToast({
              message: 'Product updated successfully.',
              variant: 'success',
            });
          }}
        />
      )}
    </section>
  );
}
