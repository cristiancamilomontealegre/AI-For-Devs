import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useActiveProducts } from '../hooks/useActiveProducts';
import { useStock } from '../hooks/useStock';
import { movementsService } from '../services/movements.service';
import type { ProductWithStock } from '../types/product';
import { formatUnitShort } from '../types/product';
import {
  getReasonsForType,
  type MovementReason,
  type MovementType,
} from '../types/movement';
import {
  computeProjectedStock,
  parseQuantity,
  validateMovementForm,
} from '../utils/movement-validation';
import { MAX_QUANTITY } from '../utils/quantity-limits';
import { ProductAutocomplete } from './product-autocomplete';
import { Toast, type ToastVariant } from './toast';
import './movement-form.css';

interface FormToast {
  message: string;
  variant: ToastVariant;
}

const INITIAL_TYPE: MovementType = 'inbound';
const INITIAL_REASON: MovementReason = 'purchase';

export function MovementForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProductId = Number(searchParams.get('productId'));
  const { products, loading: productsLoading, error: productsError } =
    useActiveProducts();

  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithStock | null>(null);
  const [type, setType] = useState<MovementType>(INITIAL_TYPE);
  const [reason, setReason] = useState<MovementReason | ''>(INITIAL_REASON);
  const [quantityInput, setQuantityInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<FormToast | null>(null);
  const [quantityTouched, setQuantityTouched] = useState(false);

  const productId = selectedProduct?.id ?? null;
  const { currentStock, loading: stockLoading, error: stockError, refetch } =
    useStock(productId);

  const reasonOptions = useMemo(() => getReasonsForType(type), [type]);

  useEffect(() => {
    const isReasonValid = reasonOptions.some((option) => option.value === reason);
    if (!isReasonValid) {
      setReason(reasonOptions[0]?.value ?? '');
    }
  }, [type, reasonOptions, reason]);

  useEffect(() => {
    if (
      !Number.isFinite(preselectedProductId) ||
      preselectedProductId <= 0 ||
      productsLoading ||
      selectedProduct !== null
    ) {
      return;
    }

    const match = products.find((product) => product.id === preselectedProductId);
    if (match) {
      setSelectedProduct(match);
    }
  }, [preselectedProductId, products, productsLoading, selectedProduct]);

  const quantity = parseQuantity(quantityInput);
  const validation = validateMovementForm({
    quantity,
    type,
    currentStock,
    stockLoading,
    hasProduct: selectedProduct !== null,
    hasReason: reason !== '',
  });

  const projectedStock = useMemo(
    () => computeProjectedStock(currentStock, quantity, type),
    [currentStock, quantity, type],
  );

  const resetForm = () => {
    setSelectedProduct(null);
    setType(INITIAL_TYPE);
    setReason(INITIAL_REASON);
    setQuantityInput('');
    setQuantityTouched(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuantityTouched(true);

    if (!validation.isValid || !selectedProduct || quantity === null || !reason) {
      return;
    }

    try {
      setSubmitting(true);
      setToast(null);

      await movementsService.create({
        productId: selectedProduct.id,
        type,
        quantity,
        reason,
      });

      setToast({
        message: 'Movement registered successfully.',
        variant: 'success',
      });
      resetForm();
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? err.message : 'Failed to register movement',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const unitLabel = formatUnitShort(selectedProduct?.unitOfMeasure ?? 'units');

  const showQuantityError = quantityTouched && validation.quantityError;

  return (
    <section className="movement-form">
      <header className="movement-form__header">
        <h1 className="movement-form__title">New Movement</h1>
        <p className="movement-form__subtitle">
          Register an inbound or outbound inventory movement
        </p>
      </header>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {productsError && (
        <p className="movement-form__banner movement-form__banner--error" role="alert">
          {productsError}
        </p>
      )}

      <form className="movement-form__form" onSubmit={handleSubmit} noValidate>
        <div className="movement-form__field">
        <label className="movement-form__label" htmlFor="product-select">
          Product
        </label>
          <ProductAutocomplete
            products={products}
            loading={productsLoading}
            disabled={submitting}
            selectedProduct={selectedProduct}
            onSelect={setSelectedProduct}
          />
        </div>

        <div className="movement-form__row">
          <div className="movement-form__field">
            <span className="movement-form__label">Movement type</span>
            <div className="movement-form__radio-group" role="radiogroup">
              <label className="movement-form__radio">
                <input
                  type="radio"
                  name="type"
                  value="inbound"
                  checked={type === 'inbound'}
                  disabled={submitting}
                  onChange={() => setType('inbound')}
                />
                Inbound
              </label>
              <label className="movement-form__radio">
                <input
                  type="radio"
                  name="type"
                  value="outbound"
                  checked={type === 'outbound'}
                  disabled={submitting}
                  onChange={() => setType('outbound')}
                />
                Outbound
              </label>
            </div>
          </div>

          <div className="movement-form__field">
            <label className="movement-form__label" htmlFor="reason">
              Reason
            </label>
            <select
              id="reason"
              className="movement-form__select"
              value={reason}
              disabled={submitting}
              onChange={(event) =>
                setReason(event.target.value as MovementReason)
              }
            >
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="movement-form__field">
          <label className="movement-form__label" htmlFor="quantity">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min={1}
            max={MAX_QUANTITY}
            step={1}
            className={`movement-form__input${
              showQuantityError ? ' movement-form__input--error' : ''
            }`}
            value={quantityInput}
            disabled={!selectedProduct || submitting}
            onChange={(event) => setQuantityInput(event.target.value)}
            onBlur={() => setQuantityTouched(true)}
            aria-invalid={showQuantityError ? true : undefined}
            aria-describedby={showQuantityError ? 'quantity-error' : undefined}
          />
          {showQuantityError && (
            <p id="quantity-error" className="movement-form__error" role="alert">
              {validation.quantityError}
            </p>
          )}
        </div>

        {selectedProduct && (
          <div className="movement-form__summary" aria-live="polite">
            <h2 className="movement-form__summary-title">Stock summary</h2>

            {stockLoading ? (
              <p className="movement-form__summary-loading">
                Loading current stock…
              </p>
            ) : stockError ? (
              <div className="movement-form__summary-error">
                <p>{stockError}</p>
                <button
                  type="button"
                  className="movement-form__retry"
                  onClick={() => void refetch()}
                >
                  Retry
                </button>
              </div>
            ) : (
              <dl className="movement-form__summary-grid">
                <div>
                  <dt>Current stock</dt>
                  <dd>
                    {currentStock ?? 0} {unitLabel}
                  </dd>
                </div>
                <div>
                  <dt>After movement</dt>
                  <dd
                    className={
                      type === 'outbound' &&
                      projectedStock !== null &&
                      projectedStock < 0
                        ? 'movement-form__summary-negative'
                        : undefined
                    }
                  >
                    {projectedStock !== null
                      ? `${projectedStock} ${unitLabel}`
                      : '—'}
                  </dd>
                </div>
              </dl>
            )}

            {type === 'outbound' &&
              !stockLoading &&
              currentStock !== null &&
              quantity !== null &&
              quantity > currentStock && (
                <p className="movement-form__warning" role="alert">
                  Insufficient stock. Available: {currentStock} {unitLabel}.
                </p>
              )}
          </div>
        )}

        <div className="movement-form__actions">
          <button
            type="button"
            className="movement-form__button movement-form__button--secondary"
            disabled={submitting}
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="movement-form__button movement-form__button--primary"
            disabled={!validation.isValid || submitting}
          >
            {submitting ? 'Saving…' : 'Save movement'}
          </button>
        </div>
      </form>
    </section>
  );
}
