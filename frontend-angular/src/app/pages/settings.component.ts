import { Component, computed } from '@angular/core';
import { ApiResource } from '../lib/api-resource';
import { getSettings, triggerReconcile } from '../api/settings';
import { fmt } from '../lib/format';
import { PageHeadComponent, ErrorPanelComponent } from './page-head.component';
import { BadgeComponent } from '../ui/badge.component';
import { ButtonComponent } from '../ui/button.component';

/** Port of pages/Settings.tsx. */
@Component({
  selector: 'tt-settings',
  standalone: true,
  imports: [PageHeadComponent, ErrorPanelComponent, BadgeComponent, ButtonComponent],
  host: { style: 'display: contents' },
  template: `
    @if (res.error(); as err) {
      <div ttErrorPanel [message]="err.message"></div>
    } @else if (res.loading() || !res.data()) {
      <div class="p-10 text-center text-ink-soft">Loading settings…</div>
    } @else {
      <div class="space-y-6">
        <div ttPageHead eyebrow="Operations" title="Telemetry settings" subtitle="Local-first collector configuration compatible with the Claude Token Telemetry v5 architecture." [hasActions]="true"><button ttButton variant="primary" (click)="reconcile()">Reconcile now</button></div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-surface border border-line rounded-lg p-4">
            <div class="font-bold text-sm mb-3">Collector</div>
            <div class="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Database</span><span><span class="font-mono text-xs">{{ s().db_path }}</span></span></div>
            <div class="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">DB size</span><span>{{ fmt(s().db_size) + ' bytes' }}</span></div>
            <div class="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Poll interval</span><span>{{ (s().env['CLAUDE_TELEMETRY_INTERVAL'] || '5') + ' seconds' }}</span></div>
            <div class="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Last reconcile</span><span>{{ s().last_reconcile || '—' }}</span></div>
          </div>
          <div class="bg-surface border border-line rounded-lg p-4">
            <div class="font-bold text-sm mb-3">Data semantics</div>
            <div class="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Request usage</span><span><span ttBadge tone="success">Exact</span></span></div>
            <div class="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Tool/path attribution</span><span><span ttBadge tone="warning">Estimated</span></span></div>
            <div class="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Skills</span><span><span ttBadge tone="info">Tracked</span></span></div>
          </div>
        </div>
        <div class="bg-surface border border-line rounded-lg p-4">
          <div class="font-bold text-sm mb-3">Table counts</div>
          <div class="grid grid-cols-3 gap-3">
            @for (e of counts(); track e[0]) {<div class="bg-surface-muted rounded-lg p-3.5"><div class="text-ink-soft text-[11px]">{{ e[0] }}</div><div class="font-extrabold text-lg">{{ fmt(e[1]) }}</div></div>}
          </div>
        </div>
      </div>
    }
  `,
})
export class SettingsComponent {
  readonly res = new ApiResource(() => getSettings());
  readonly s = computed(() => this.res.data()!);
  readonly counts = computed(() => Object.entries(this.res.data()?.table_counts ?? {}));
  fmt = fmt;
  async reconcile() {
    await triggerReconcile();
    this.res.reload();
  }
}
