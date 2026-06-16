import { useState, type FormEvent } from 'react';
import type { ProductWithStock, UnitOfMeasure } from '../types/product';
import { UNIT_OF_MEASURE_OPTIONS } from '../types/product';
import { productsService } from '../services/products.service';
import { MAX_QUANTITY } from '../utils/quantity-limits';
import { parseMinimumStock } from '../utils/product-validation';
import './product-edit-dialog.css';

interface ProductEditDialogProps {
  product: ProductWithStock;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductEditDialog({
  product,
  onClose,
  onSaved,
}: ProductEditDialogProps) {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure>(
    product.unitOfMeasure,
  );
  const [price, setPrice] = useState(String(product.price));
  const [minimumStock, setMinimumStock] = useState(String(product.minimumStock));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsedPrice = Number(price);
    const parsedMinimumStock = parseMinimumStock(minimumStock);

    if (!name.trim() || !category.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Name, category, and a positive price are required.');
      return;
    }

    if (parsedMinimumStock === null) {
      setError(
        'Minimum stock must be a non-negative integer up to 2,147,483,647.',
      );
      return;
    }

    try {
      setSaving(true);
      await productsService.update(product.id, {
        name: name.trim(),
        category: category.trim(),
        unitOfMeasure,
        price: parsedPrice,
        minimumStock: parsedMinimumStock,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="product-edit-dialog__backdrop" role="presentation" onClick={onClose}>
      <div
        className="product-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-product-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="product-edit-dialog__header">
          <h2 id="edit-product-title">Edit product</h2>
          <p className="product-edit-dialog__sku">SKU: {product.sku}</p>
        </header>

        <form className="product-edit-dialog__form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="product-edit-dialog__field">
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
            />
          </label>

          <label className="product-edit-dialog__field">
            <span>Category</span>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={saving}
            />
          </label>

          <label className="product-edit-dialog__field">
            <span>Unit of measure</span>
            <select
              value={unitOfMeasure}
              disabled={saving}
              onChange={(event) =>
                setUnitOfMeasure(event.target.value as UnitOfMeasure)
              }
            >
              {UNIT_OF_MEASURE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="product-edit-dialog__field">
            <span>Price</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={saving}
            />
          </label>

          <label className="product-edit-dialog__field">
            <span>Minimum stock</span>
            <input
              type="number"
              min={0}
              max={MAX_QUANTITY}
              step={1}
              value={minimumStock}
              onChange={(event) => setMinimumStock(event.target.value)}
              disabled={saving}
            />
          </label>

          {error && (
            <p className="product-edit-dialog__error" role="alert">
              {error}
            </p>
          )}

          <div className="product-edit-dialog__actions">
            <button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
