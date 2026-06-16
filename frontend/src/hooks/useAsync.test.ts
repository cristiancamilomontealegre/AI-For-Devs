import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsync } from './useAsync';

describe('useAsync', () => {
  it('fetches once when initialData is a new array reference each render', async () => {
    const fetcher = vi.fn(async () => ['item']);

    const { result, rerender } = renderHook(
      ({ initialData }: { initialData: string[] }) =>
        useAsync(fetcher, { initialData }),
      { initialProps: { initialData: [] as string[] } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(['item']);

    rerender({ initialData: [] as string[] });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches when an explicit dep changes', async () => {
    const fetcher = vi.fn(async () => ['item']);

    const { rerender } = renderHook(
      ({ filter }: { filter: string }) =>
        useAsync(fetcher, { initialData: [] as string[], deps: [filter] }),
      { initialProps: { filter: 'all' } },
    );

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    rerender({ filter: 'active' });

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });
});
