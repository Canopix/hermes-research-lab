"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type DependencyList,
} from "react";

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches data on mount and whenever `deps` change.
 *
 * `fetcher` is an inline arrow at every call site, so it has a new identity on
 * every render. We keep it in a ref instead of in the effect's dependency
 * array — otherwise the effect would re-run on every render, each fetch would
 * setState, trigger a re-render, and fire again: an unbounded request storm.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcherRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: fetchData };
}
