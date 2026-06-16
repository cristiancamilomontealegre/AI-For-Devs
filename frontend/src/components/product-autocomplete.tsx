import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProductWithStock } from '../types/product';
import './product-autocomplete.css';

interface ProductAutocompleteProps {
  products: ProductWithStock[];
  loading?: boolean;
  disabled?: boolean;
  selectedProduct: ProductWithStock | null;
  onSelect: (product: ProductWithStock | null) => void;
}

function formatProductLabel(product: ProductWithStock): string {
  return `${product.sku} — ${product.name}`;
}

export function ProductAutocomplete({
  products,
  loading = false,
  disabled = false,
  selectedProduct,
  onSelect,
}: ProductAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedProduct) {
      setQuery(formatProductLabel(selectedProduct));
    }
  }, [selectedProduct]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || (selectedProduct && query === formatProductLabel(selectedProduct))) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term),
    );
  }, [products, query, selectedProduct]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    if (selectedProduct && value !== formatProductLabel(selectedProduct)) {
      onSelect(null);
    }
  };

  const handleSelect = (product: ProductWithStock) => {
    onSelect(product);
    setQuery(formatProductLabel(product));
    setIsOpen(false);
  };

  return (
    <div className="product-autocomplete" ref={containerRef}>
      <input
        type="search"
        className="product-autocomplete__input"
        placeholder={loading ? 'Loading products…' : 'Search by name or SKU…'}
        value={query}
        disabled={disabled || loading}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => setIsOpen(true)}
        id="product-select"
        aria-label="Select product"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        role="combobox"
      />

      {isOpen && !disabled && filteredProducts.length > 0 && (
        <ul className="product-autocomplete__list" role="listbox">
          {filteredProducts.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                className="product-autocomplete__option"
                role="option"
                aria-selected={selectedProduct?.id === product.id}
                onClick={() => handleSelect(product)}
              >
                <span className="product-autocomplete__sku">{product.sku}</span>
                <span>{product.name}</span>
                <span className="product-autocomplete__stock">
                  Stock: {product.currentStock}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !loading && query && filteredProducts.length === 0 && (
        <p className="product-autocomplete__empty">No active products found.</p>
      )}
    </div>
  );
}
