import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockBadge } from './stock-badge';

describe('StockBadge', () => {
  it('renders green badge when active stock is at or above minimum', () => {
    render(
      <StockBadge currentStock={10} minimumStock={10} status="active" />,
    );

    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('stock-badge--success');
    expect(badge).toHaveTextContent('10 units');
  });

  it('renders red badge when active stock is below minimum', () => {
    render(
      <StockBadge currentStock={3} minimumStock={5} status="active" />,
    );

    expect(screen.getByRole('status')).toHaveClass('stock-badge--danger');
  });

  it('renders gray badge for inactive products', () => {
    render(
      <StockBadge currentStock={0} minimumStock={5} status="inactive" />,
    );

    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('stock-badge--inactive');
    expect(badge).toHaveTextContent('Inactive');
  });
});
