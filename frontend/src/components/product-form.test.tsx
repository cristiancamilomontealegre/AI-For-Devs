import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductForm } from './product-form';
import { productsService } from '../services/products.service';

vi.mock('../services/products.service', () => ({
  productsService: {
    create: vi.fn(),
  },
}));

const mockedCreate = vi.mocked(productsService.create);

function renderProductForm() {
  return render(
    <MemoryRouter>
      <ProductForm />
    </MemoryRouter>,
  );
}

describe('ProductForm', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
  });

  it('shows validation errors after submit with invalid data', async () => {
    renderProductForm();

    fireEvent.submit(
      screen.getByRole('button', { name: 'Save product' }).closest('form')!,
    );

    expect(await screen.findByText('SKU is required')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('creates a product when the form is valid', async () => {
    mockedCreate.mockResolvedValue({
      id: 99,
      sku: 'FORM-001',
      name: 'Created From Form',
      description: null,
      category: 'General',
      unitOfMeasure: 'units',
      price: 15.5,
      minimumStock: 2,
      status: 'active',
      currentStock: 0,
      lowStockAlert: true,
      hasMovements: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    renderProductForm();

    fireEvent.change(screen.getByLabelText('SKU'), {
      target: { value: 'FORM-001' },
    });
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Created From Form' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'General' },
    });
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '15.5' },
    });
    fireEvent.change(screen.getByLabelText('Minimum stock'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save product' }));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith({
        sku: 'FORM-001',
        name: 'Created From Form',
        category: 'General',
        unitOfMeasure: 'units',
        price: 15.5,
        minimumStock: 2,
      });
    });

    expect(
      await screen.findByText('Product created successfully.'),
    ).toBeInTheDocument();
  });
});
