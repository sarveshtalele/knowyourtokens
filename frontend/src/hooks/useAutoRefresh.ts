import { useEffect, useRef } from 'react';

/** Call `callback` every `intervalMs` while the tab is visible; always the latest callback. */
export function useAutoRefresh(callback: () => void, intervalMs = 10000) {
  const ref = useRef(callback);
  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') ref.current();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
