import { Component, effect, inject, signal } from '@angular/core';
import { LiveService } from '../lib/live.service';

/** Port of components/Layout/ConnectionBanner.tsx: shown only after 4s disconnected (a reconnect blip never flashes it). */
@Component({
  selector: 'tt-connection-banner',
  standalone: true,
  host: { style: 'display: contents' },
  template: `
    @if (show()) {
      <div class="bg-warning-soft text-warning px-7 py-2 text-sm flex items-center justify-between gap-3">
        <span><b>Not connected to the telemetry backend.</b> New data won't load automatically until the connection is back — the numbers on screen may be out of date. Check <code class="font-mono">tokentelemetry status</code><ng-container>{{ ' ' }}</ng-container>if this doesn't clear on its own.</span>
        <button (click)="reload()" class="shrink-0 border border-warning rounded-md px-3 py-1 text-xs font-semibold hover:bg-surface">Reload</button>
      </div>
    }
  `,
})
export class ConnectionBannerComponent {
  private readonly live = inject(LiveService);
  readonly show = signal(false);
  reload = () => window.location.reload();

  constructor() {
    effect((onCleanup) => {
      if (this.live.connected()) {
        this.show.set(false);
        return;
      }
      const t = setTimeout(() => this.show.set(true), 4000);
      onCleanup(() => clearTimeout(t));
    }, { allowSignalWrites: true });
  }
}
