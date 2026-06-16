import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsService } from '../services/products.service';
import {
  buildCreateProductPayload,
  validateProductForm,
} from '../utils/product-validation';
import { MAX_QUANTITY } from '../utils/quantity-limits';
import { UNIT_OF_MEASURE_OPTIONS, type UnitOfMeasure } from '../types/product';
import { Toast, type ToastVariant } from './toast';
import './product-form.css';

interface FormToast {
  message: string;
  variant: ToastVariant;
}

export function ProductForm() {
  const navigate = useNavigate();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure>('units');
  const [priceInput, setPriceInput] = useState('');
  const [minimumStockInput, setMinimumStockInput] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<FormToast | null>(null);
  const [touched, setTouched] = useState({
    sku: false,
    name: false,
    category: false,
    price: false,
    minimumStock: false,
  });

  const formInput = useMemo(
    () => ({
      sku,
      name,
      description,
      category,
      unitOfMeasure,
      priceInput,
      minimumStockInput,
    }),
    [sku, name, description, category, unitOfMeasure, priceInput, minimumStockInput],
  );

  const validation = useMemo(
    () => validateProductForm(formInput),
    [formInput],
  );

  const markTouched = (field: keyof typeof touched) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({
      sku: true,
      name: true,
      category: true,
      price: true,
      minimumStock: true,
    });
    setSubmitError(null);

    const payload = buildCreateProductPayload(formInput);
    if (!payload) {
      return;
    }

    try {
      setSubmitting(true);
      await productsService.create(payload);
      setToast({
        message: 'Product created successfully.',
        variant: 'success',
      });
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to create product',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const showSkuError = touched.sku && validation.fieldErrors.sku;
  const showNameError = touched.name && validation.fieldErrors.name;
  const showCategoryError = touched.category && validation.fieldErrors.category;
  const showPriceError = touched.price && validation.fieldErrors.price;
  const showMinimumStockError =
    touched.minimumStock && validation.fieldErrors.minimumStock;

  return (
    <section className="product-form">
      <header className="product-form__header">
        <h1 className="product-form__title">New Product</h1>
        <p className="product-form__subtitle">
          Register a product with a unique SKU, price, and minimum stock
        </p>
      </header>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {submitError && (
        <p className="product-form__banner product-form__banner--error" role="alert">
          {submitError}
        </p>
      )}

      <form className="product-form__form" onSubmit={handleSubmit} noValidate>
        <div className="product-form__field">
          <label className="product-form__label" htmlFor="product-sku">
            SKU
          </label>
          <input
            id="product-sku"
            className={`product-form__input${
              showSkuError ? ' product-form__input--error' : ''
            }`}
            value={sku}
            maxLength={50}
            disabled={submitting}
            onChange={(event) => setSku(event.target.value)}
            onBlur={() => markTouched('sku')}
            aria-invalid={showSkuError ? true : undefined}
            aria-describedby={showSkuError ? 'product-sku-error' : undefined}
          />
          {showSkuError && (
            <p id="product-sku-error" className="product-form__error" role="alert">
              {validation.fieldErrors.sku}
            </p>
          )}
        </div>

        <div className="product-form__field">
          <label className="product-form__label" htmlFor="product-name">
            Name
          </label>
          <input
            id="product-name"
            className={`product-form__input${
              showNameError ? ' product-form__input--error' : ''
            }`}
            value={name}
            maxLength={255}
            disabled={submitting}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => markTouched('name')}
            aria-invalid={showNameError ? true : undefined}
            aria-describedby={showNameError ? 'product-name-error' : undefined}
          />
          {showNameError && (
            <p id="product-name-error" className="product-form__error" role="alert">
              {validation.fieldErrors.name}
            </p>
          )}
        </div>

        <div className="product-form__field">
          <label className="product-form__label" htmlFor="product-description">
            Description
          </label>
          <textarea
            id="product-description"
            className="product-form__textarea"
            value={description}
            disabled={submitting}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="product-form__field">
          <label className="product-form__label" htmlFor="product-category">
            Category
          </label>
          <input
            id="product-category"
            className={`product-form__input${
              showCategoryError ? ' product-form__input--error' : ''
            }`}
            value={category}
            maxLength={100}
            disabled={submitting}
            onChange={(event) => setCategory(event.target.value)}
            onBlur={() => markTouched('category')}
            aria-invalid={showCategoryError ? true : undefined}
            aria-describedby={showCategoryError ? 'product-category-error' : undefined}
          />
          {showCategoryError && (
            <p id="product-category-error" className="product-form__error" role="alert">
              {validation.fieldErrors.category}
            </p>
          )}
        </div>

        <div className="product-form__field">
          <label className="product-form__label" htmlFor="product-unit">
            Unit of measure
          </label>
          <select
            id="product-unit"
            className="product-form__select"
            value={unitOfMeasure}
            disabled={submitting}
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
        </div>

        <div className="product-form__field">
          <label className="product-form__label" htmlFor="product-price">
            Price
          </label>
          <input
            id="product-price"
            type="number"
            min={0.01}
            step={0.01}
            className={`product-form__input${
              showPriceError ? ' product-form__input--error' : ''
            }`}
            value={priceInput}
            disabled={submitting}
            onChange={(event) => setPriceInput(event.target.value)}
            onBlur={() => markTouched('price')}
            aria-invalid={showPriceError ? true : undefined}
            aria-describedby={showPriceError ? 'product-price-error' : undefined}
          />
          {showPriceError && (
            <p id="product-price-error" className="product-form__error" role="alert">
              {validation.fieldErrors.price}
            </p>
          )}
        </div>

        <div className="product-form__field">
          <label className="product-form__label" htmlFor="product-minimum-stock">
            Minimum stock
          </label>
          <input
            id="product-minimum-stock"
            type="number"
            min={0}
            max={MAX_QUANTITY}
            step={1}
            className={`product-form__input${
              showMinimumStockError ? ' product-form__input--error' : ''
            }`}
            value={minimumStockInput}
            disabled={submitting}
            onChange={(event) => setMinimumStockInput(event.target.value)}
            onBlur={() => markTouched('minimumStock')}
            aria-invalid={showMinimumStockError ? true : undefined}
            aria-describedby={
              showMinimumStockError ? 'product-minimum-stock-error' : undefined
            }
          />
          {showMinimumStockError && (
            <p
              id="product-minimum-stock-error"
              className="product-form__error"
              role="alert"
            >
              {validation.fieldErrors.minimumStock}
            </p>
          )}
        </div>

        <div className="product-form__actions">
          <button
            type="button"
            className="product-form__button product-form__button--secondary"
            disabled={submitting}
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="product-form__button product-form__button--primary"
            disabled={!validation.isValid || submitting}
          >
            {submitting ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </form>
    </section>
  );
}
