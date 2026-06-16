import { useCallback, useEffect, useRef, useState } from 'react';
import { parseApiError } from '../utils/api-error';

interface UseAsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseAsyncOptions<T> {
  initialData: T;
  enabled?: boolean;
  deps?: readonly unknown[];
}

export function useAsync<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncOptions<T>,
): UseAsyncState<T> {
  const { initialData, enabled = true, deps = [] } = options;
  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetcherRef.current();
      setData(result);
    } catch (err) {
      setData(initialDataRef.current);
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetcherRef.current();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setData(initialDataRef.current);
          setError(parseApiError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are explicit refresh triggers
  }, [enabled, ...deps]);

  return { data, loading, error, refetch: fetchData };
}
