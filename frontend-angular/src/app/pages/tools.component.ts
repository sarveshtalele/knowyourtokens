import { Component, computed } from '@angular/core';
import { ApiResource } from '../lib/api-resource';
import { getTools } from '../api/tools';
import { ago, fmt } from '../lib/format';
import { PageHeadComponent, ErrorPanelComponent } from './page-head.component';
import { StatRowComponent } from '../data/stat-row.component';
import { DataTableComponent, type Column } from '../data/data-table.component';
import { ToolUsageChartComponent } from '../charts/charts';
import { BadgeComponent } from '../ui/badge.component';
import type { Stat } from '../data/metric-card.component';

/** Port of pages/Tools.tsx. */
@Component({
  selector: 'tt-tools',
  standalone: true,
  imports: [PageHeadComponent, ErrorPanelComponent, StatRowComponent, DataTableComponent, ToolUsageChartComponent, BadgeComponent],
  host: { style: 'display: contents' },
  template: `
    @if (res.error(); as err) {
      <div ttErrorPanel [message]="err.message"></div>
    } @else if (res.loading()) {
      <div class="p-10 text-center text-ink-soft">Loading tools…</div>
    } @else {
      <div class="space-y-6">
        <div ttPageHead eyebrow="Tool telemetry" title="Tools" subtitle="Understand which Claude Code tools drive context growth and execution volume."></div>
        <div ttStatRow [stats]="stats()"></div>
        <div ttToolUsageChart [data]="tools()"></div>
        <div class="bg-surface border border-line rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-line"><span class="font-bold text-sm">Tool consumption</span><span ttBadge tone="info">Exact call counts</span></div>
          <div ttDataTable [columns]="columns()" [data]="tools()" emptyLabel="No tool calls recorded."></div>
        </div>
      </div>
    }
  `,
})
export class ToolsComponent {
  readonly res = new ApiResource(() => getTools());
  readonly tools = computed(() => this.res.data() ?? []);
  readonly totalCalls = computed(() => this.tools().reduce((a, t) => a + (t.call_count || 0), 0));
  readonly stats = computed<Stat[]>(() => {
    const total = this.totalCalls();
    return [
      { label: 'Tool calls', value: fmt(total), hint: 'Total number of tool invocations recorded across all projects and sessions, all-time.' },
      ...this.tools().slice(0, 3).map((t) => ({
        label: t.tool_name,
        value: fmt(t.call_count),
        delta: total ? `${Math.round((t.call_count / total) * 100)}% of calls` : undefined,
        hint: `Calls to the "${t.tool_name}" tool, all-time. The percentage is its share of total tool calls.`,
      })),
    ];
  });
  readonly columns = computed<Column[]>(() => {
    const total = this.totalCalls();
    return [
      { key: 'tool_name', label: 'Tool' },
      { key: 'call_count', label: 'Calls', align: 'right', render: (v) => fmt(v as number) },
      { key: 'unique_sessions', label: 'Unique sessions', align: 'right', render: (v) => fmt(v as number) },
      { key: 'call_count', label: 'Share', align: 'right', render: (v) => (total ? `${Math.round(((v as number) / total) * 100)}%` : '0%') },
      { key: 'first_seen', label: 'First seen', render: (v) => String(v || '—') },
      { key: 'last_seen', label: 'Last seen', render: (v) => ago(v as string) },
    ];
  });
}
