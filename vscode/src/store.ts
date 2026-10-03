// Holds the latest data from the local API and tells the views when it changes.
import * as vscode from 'vscode';
import { ApiError, KytClient, Project, Session, Summary, UsageRow } from './api';
import { localDay } from './format';
import { Ports } from './ports';

export interface Snapshot {
  today?: Summary;
  week?: Summary;
  all?: Summary;
  projects: Project[];
  sessions: Session[];
  requests: UsageRow[];
  version?: string;
  updatedAt?: Date;
}

export class Store implements vscode.Disposable {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChange = this.changed.event;

  connected = false;
  lastError?: string;
  ports: Ports;
  data: Snapshot = { projects: [], sessions: [], requests: [] };
  private inFlight?: Promise<void>;

  constructor(
    private readonly resolvePorts: () => Ports,
    private readonly listSize: () => number,
  ) {
    this.ports = resolvePorts();
  }

  get apiUrl(): string {
    return `http://127.0.0.1:${this.ports.backend}`;
  }

  get dashboardUrl(): string {
    return `http://127.0.0.1:${this.ports.dashboard}`;
  }

  /** Re-read ports (they can change after a restart) and fetch everything. Concurrent calls share one fetch. */
  refresh(): Promise<void> {
    if (!this.inFlight) {
      this.inFlight = this.load().finally(() => {
        this.inFlight = undefined;
      });
    }
    return this.inFlight;
  }

  private async load(): Promise<void> {
    this.ports = this.resolvePorts();
    const client = new KytClient(this.apiUrl);
    const wasConnected = this.connected;
    try {
      const health = await client.health();
      const today = localDay();
      const weekStart = localDay(new Date(Date.now() - 6 * 86400000));
      const n = this.listSize();
      const [todaySum, week, all, projects, sessions, requests] = await Promise.all([
        client.summary({ start: today, end: today }),
        client.summary({ start: weekStart, end: today }),
        client.summary(),
        client.projects(),
        client.sessions(n),
        client.recentRequests(n),
      ]);
      this.data = { today: todaySum, week, all, projects, sessions, requests, version: health.version, updatedAt: new Date() };
      this.connected = true;
      this.lastError = undefined;
    } catch (err) {
      this.connected = false;
      this.lastError = err instanceof ApiError ? err.message : String(err);
    }
    await vscode.commands.executeCommand('setContext', 'knowyourtokens.connected', this.connected);
    if (wasConnected !== this.connected || this.connected) this.changed.fire();
  }

  dispose(): void {
    this.changed.dispose();
  }
}
