import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LiveUpdate } from '../types';

interface LiveState {
  metrics: Record<string, number>;
  connected: boolean;
  /** Increments on every live update -- put it in a useApi deps array to refetch when data changes. */
  version: number;
}

const LiveContext = createContext<LiveState>({ metrics: {}, connected: false, version: 0 });

/** Same origin as the page: the Vite dev proxy and the CLI's static server both forward /ws. */
export function liveSocketUrl(loc: Pick<Location, 'protocol' | 'host'> = window.location): string {
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/ws/live`;
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let closedByUs = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let ws: WebSocket | null = null;

    function connect() {
      ws = new WebSocket(liveSocketUrl());
      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
      };
      ws.onmessage = (e) => {
        try {
          const p: LiveUpdate = JSON.parse(e.data);
          setMetrics((m) => ({ ...m, ...p.data }));
          setVersion((v) => v + 1);
        } catch {
          /* ignore malformed payload */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (closedByUs) return;
        // Exponential backoff, capped at 30s.
        const delay = Math.min(30_000, 1000 * 2 ** attempt++);
        retryTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws?.close();
    }
    connect();
    return () => {
      closedByUs = true;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  return <LiveContext.Provider value={{ metrics, connected, version }}>{children}</LiveContext.Provider>;
}

export function useLive() {
  return useContext(LiveContext);
}
