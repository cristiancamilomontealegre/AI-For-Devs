import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductRowActions } from './product-row-actions';
import { productsService } from '../services/products.service';
import type { ProductWithStock } from '../types/product';

vi.mock('../services/products.service', () => ({
  productsService: {
    updateState: vi.fn(),
    remove: vi.fn(),
  },
}));

const mockedUpdateState = vi.mocked(productsService.updateState);
const mockedRemove = vi.mocked(productsService.remove);

const product: ProductWithStock = {
  id: 1,
  sku: 'SKU-001',
  name: 'Widget',
  description: null,
  category: 'General',
  unitOfMeasure: 'units',
  price: 10,
  minimumStock: 5,
  status: 'active',
  currentStock: 8,
  lowStockAlert: true,
  hasMovements: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderActions(overrides: Partial<ProductWithStock> = {}) {
  const onBusyChange = vi.fn();
  const onChanged = vi.fn();
  const onError = vi.fn();
  const onEdit = vi.fn();

  render(
    <MemoryRouter>
      <ProductRowActions
        product={{ ...product, ...overrides }}
        busy={false}
        onBusyChange={onBusyChange}
        onEdit={onEdit}
        onChanged={onChanged}
        onError={onError}
      />
    </MemoryRouter>,
  );

  return { onBusyChange, onChanged, onError, onEdit };
}

describe('ProductRowActions', () => {
  beforeEach(() => {
    mockedUpdateState.mockReset();
    mockedRemove.mockReset();
  });

  it('shows register movement link for active products', () => {
    renderActions();

    expect(
      screen.getByRole('link', { name: 'Register movement' }),
    ).toHaveAttribute('href', '/movements/new?productId=1');
  });

  it('shows a confirmation modal before deactivating', async () => {
    renderActions();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/8 units in stock/)).toBeInTheDocument();
    expect(mockedUpdateState).not.toHaveBeenCalled();
  });

  it('deactivates after confirmation', async () => {
    mockedUpdateState.mockResolvedValue({ ...product, status: 'inactive' });
    const { onChanged } = renderActions();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Deactivate',
      }),
    );

    await waitFor(() => {
      expect(mockedUpdateState).toHaveBeenCalledWith(1, 'inactive');
    });

    expect(onChanged).toHaveBeenCalled();
  });

  it('shows permanent delete action only when product has no movements', () => {
    renderActions();

    expect(
      screen.getByRole('button', { name: 'Delete permanently' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Protected' })).not.toBeInTheDocument();
  });

  it('shows protected action and hint when product has movements', () => {
    renderActions({ hasMovements: true });

    expect(screen.getByRole('button', { name: 'Protected' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete permanently' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Has movement history — use Deactivate instead of delete./),
    ).toBeInTheDocument();
  });

  it('shows an info modal when protected is clicked', () => {
    renderActions({ hasMovements: true });

    fireEvent.click(screen.getByRole('button', { name: 'Protected' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delete not available' })).toBeInTheDocument();
    expect(screen.getByText(/registered movements/)).toBeInTheDocument();
    expect(mockedRemove).not.toHaveBeenCalled();
  });

  it('shows a confirmation modal before deleting permanently', async () => {
    renderActions();

    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Permanently delete product' })).toBeInTheDocument();
    expect(mockedRemove).not.toHaveBeenCalled();
  });

  it('deletes after confirmation', async () => {
    mockedRemove.mockResolvedValue(undefined);
    const { onChanged } = renderActions();

    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Delete permanently',
      }),
    );

    await waitFor(() => {
      expect(mockedRemove).toHaveBeenCalledWith(1);
    });

    expect(onChanged).toHaveBeenCalled();
  });
});
