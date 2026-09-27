import { Injectable, signal } from '@angular/core';
import type { LiveUpdate } from './types';

/** Port of context/LiveContext.tsx: the /ws/live push channel (connected flag, latest metrics, update counter). */
@Injectable({ providedIn: 'root' })
export class LiveService {
  readonly metrics = signal<Record<string, number>>({});
  readonly connected = signal(false);
  /** Increments on every live update -- pages use it as a refetch dependency. */
  readonly version = signal(0);

  constructor() {
    const connect = () => {
      const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
      const ws = new WebSocket(`ws://${host}:8000/ws/live`);
      ws.onopen = () => this.connected.set(true);
      ws.onmessage = (e) => {
        try {
          const p: LiveUpdate = JSON.parse(e.data);
          this.metrics.update((m) => ({ ...m, ...p.data }));
          this.version.update((v) => v + 1);
        } catch {
          /* ignore malformed payload */
        }
      };
      ws.onclose = () => {
        this.connected.set(false);
        setTimeout(connect, 5000);
      };
      ws.onerror = () => ws.close();
    };
    connect();
  }
}
