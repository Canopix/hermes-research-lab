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
 * Fetches on mount, optionally polls, and refetches when `deps` change.
 *
 * `fetcher` is an inline arrow at every call site, so it has a new identity on
 * every render. Depending on it directly made the effect re-run every render
 * → setState → re-render → refetch: an unbounded request storm (worse with
 * polling). Keep it in a ref and drive the effect off `pollIntervalMs`/`deps`.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  pollIntervalMs?: number,
  deps: DependencyList = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    if (pollIntervalMs && pollIntervalMs > 0) {
      intervalRef.current = setInterval(fetchData, pollIntervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, pollIntervalMs, ...deps]);

  return { data, loading, error, refetch: fetchData };
}