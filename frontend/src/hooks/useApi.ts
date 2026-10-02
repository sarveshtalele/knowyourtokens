import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface State<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

/**
 * Fetch on mount and whenever `deps` change. In-flight requests are aborted
 * when deps change or the component unmounts, so a slow response can never
 * overwrite a newer one. Previous data stays visible while refetching.
 */
export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<{ data: T }>,
  deps: unknown[] = [],
): State<T> & { reload: () => void } {
  const [state, setState] = useState<State<T>>({ data: undefined, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef
      .current(controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setState({ data: res.data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState((s) => ({ data: s.data, loading: false, error: err instanceof Error ? err : new Error(String(err)) }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's contract
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
