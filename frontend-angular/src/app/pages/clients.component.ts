import { Component, computed } from '@angular/core';
import { ApiResource } from '../lib/api-resource';
import { getClients } from '../api/clients';
import { fmt } from '../lib/format';
import { PageHeadComponent, ErrorPanelComponent } from './page-head.component';
import { StatRowComponent } from '../data/stat-row.component';
import { DataTableComponent, type Column } from '../data/data-table.component';
import { TokenBarChartComponent } from '../charts/charts';
import { BadgeComponent } from '../ui/badge.component';
import type { Stat } from '../data/metric-card.component';

/** Port of pages/Clients.tsx. */
@Component({
  selector: 'tt-clients',
  standalone: true,
  imports: [PageHeadComponent, ErrorPanelComponent, StatRowComponent, DataTableComponent, TokenBarChartComponent, BadgeComponent],
  host: { style: 'display: contents' },
  template: `
    @if (res.error(); as err) {
      <div ttErrorPanel [message]="err.message"></div>
    } @else if (res.loading()) {
      <div class="p-10 text-center text-ink-soft">Loading clients…</div>
    } @else {
      <div class="space-y-6">
        <div ttPageHead eyebrow="Environment intelligence" title="Clients & IDEs" subtitle="Best-effort client classification across Claude Code sessions."></div>
        <div ttStatRow [stats]="stats()"></div>
        @if (clients().length > 0) {
          <div ttTokenBarChart [data]="barData()" title="Client mix"></div>
        }
        <div class="bg-surface border border-line rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-line"><span class="font-bold text-sm">Client breakdown</span><span ttBadge tone="info">Classification confidence varies</span></div>
          <div ttDataTable [columns]="columns()" [data]="clients()" emptyLabel="No client data recorded yet." [cells]="{ '5': projectsCell }"></div>
        </div>
        <div class="bg-surface border border-line rounded-lg p-4">
          <div class="font-bold text-sm mb-1">Classification note</div>
          <p class="text-ink-soft text-sm">The telemetry layer uses available process/environment signals and transcript metadata. Treat the client field as analytical classification, not a cryptographic source of truth.</p>
        </div>
      </div>
    }
    <ng-template #projectsCell let-v><span ttBadge><ng-container>{{ fmt(v) }}</ng-container> active</span></ng-template>
  `,
})
export class ClientsComponent {
  readonly res = new ApiResource(() => getClients());
  readonly clients = computed(() => this.res.data() ?? []);
  fmt = fmt;
  readonly totalTokens = computed(() => this.clients().reduce((a, c) => a + (c.total_tokens || 0), 0));
  readonly barData = computed(() => this.clients().map((c) => ({ project: c.client, total_tokens: c.total_tokens })));
  readonly stats = computed<Stat[]>(() => [
    { label: 'Known clients', value: fmt(this.clients().length), hint: 'Number of distinct IDE/CLI clients detected in telemetry (e.g. Claude Code Terminal, Cursor, VS Code).' },
    { label: 'Top client', value: this.clients()[0]?.client || '—', hint: 'The client with the most total tokens recorded, all-time.' },
    { label: 'Total tokens', value: fmt(this.totalTokens()), hint: 'Sum of tokens across all known clients, all-time — exact API usage.' },
    { label: 'Total requests', value: fmt(this.clients().reduce((a, c) => a + (c.requests || 0), 0)), hint: 'Sum of requests across all known clients, all-time.' },
  ]);
  readonly columns = computed<Column[]>(() => {
    const total = this.totalTokens();
    return [
      { key: 'client', label: 'Client' },
      { key: 'total_tokens', label: 'Tokens', align: 'right', render: (v) => fmt(v as number) },
      { key: 'sessions', label: 'Sessions', align: 'right', render: (v) => fmt(v as number) },
      { key: 'requests', label: 'Requests', align: 'right', render: (v) => fmt(v as number) },
      { key: 'total_tokens', label: 'Share', align: 'right', render: (v) => (total ? `${Math.round(((v as number) / total) * 100)}%` : '0%') },
      { key: 'projects', label: 'Projects' },
    ];
  });
}
