import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiResource } from '../lib/api-resource';
import { LiveService } from '../lib/live.service';
import { getProjects } from '../api/projects';
import { getUsageTimeline } from '../api/usage';
import { getClients } from '../api/clients';
import { ago, fmt } from '../lib/format';
import { PageHeadComponent, ErrorPanelComponent } from './page-head.component';
import { StatRowComponent } from '../data/stat-row.component';
import { DataTableComponent, type Column } from '../data/data-table.component';
import { TokenTrendChartComponent, TokenBarChartComponent } from '../charts/charts';
import { DateRangeFilterComponent } from './date-range-filter.component';
import type { Stat } from '../data/metric-card.component';

/** Port of pages/GlobalDashboard.tsx. */
@Component({
  selector: 'tt-dashboard',
  standalone: true,
  imports: [RouterLink, PageHeadComponent, ErrorPanelComponent, StatRowComponent, DataTableComponent, TokenTrendChartComponent, TokenBarChartComponent, DateRangeFilterComponent],
  host: { style: 'display: contents' },
  template: `
    @if (error(); as err) {
      <div ttErrorPanel [message]="err.message"></div>
    } @else if ((projects.loading() && projectList().length === 0) || (timeline.loading() && timelineList().length === 0)) {
      <div class="p-10 text-center text-ink-soft">Loading overview…</div>
    } @else {
      <div class="space-y-6">
        <div ttPageHead eyebrow="Command center" title="Usage overview" subtitle="Global Claude Code telemetry across projects, sessions, clients, tools and skills." [hasActions]="true"><select ttDateRange [value]="days()" (changed)="days.set($event)"></select></div>
        <div ttStatRow [columns]="4" [stats]="topStats()"></div>
        <div class="grid grid-cols-[1.35fr_.65fr] gap-4">
          <div ttTokenTrendChart [data]="trend()" [title]="'Token consumption (' + rangeLabel() + ')'"></div>
          <div class="bg-surface border border-line rounded-lg p-4">
            <h3 class="text-sm font-bold mb-4">Token mix</h3>
            @for (m of mix(); track m.label) {
              <div class="my-4"><div class="flex justify-between text-sm"><span>{{ m.label }}</span><b>{{ fmt(m.val) }}</b></div><div class="h-1.5 rounded-full bg-line mt-1.5 overflow-hidden"><div class="h-full bg-accent rounded-full" [style.width]="m.pct + '%'"></div></div></div>
            }
          </div>
        </div>
        <div ttStatRow [columns]="4" [stats]="bottomStats()"></div>
        @if (projectList().length > 0) {
          <div ttTokenBarChart [data]="barData()"></div>
        }
        <div class="bg-surface border border-line rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-line"><span class="font-bold text-sm">Projects</span><a routerLink="/projects" class="text-sm font-semibold text-accent-strong hover:underline">View all</a></div>
          <div ttDataTable [columns]="columns" [data]="projectList().slice(0, 8)"></div>
        </div>
      </div>
    }
  `,
})
export class DashboardComponent {
  private readonly live = inject(LiveService);
  readonly days = signal('0');
  readonly rangeLabel = computed(() => (this.days() === '0' ? 'all time' : `${this.days()}d`));
  // live.version bumps whenever the backend pushes a change over /ws/live, so these refetch on their own.
  readonly projects = new ApiResource(() => getProjects(), () => [this.live.version()]);
  readonly timeline = new ApiResource(() => getUsageTimeline(Number(this.days())), () => [this.days(), this.live.version()]);
  readonly clients = new ApiResource(() => getClients(), () => [this.live.version()]);
  readonly projectList = computed(() => this.projects.data() ?? []);
  readonly timelineList = computed(() => this.timeline.data() ?? []);
  readonly error = computed(() => this.projects.error() || this.timeline.error());
  fmt = fmt;

  readonly totals = computed(() => {
    const timeline = this.timelineList();
    const projects = this.projectList();
    return {
      input: timeline.reduce((a, d) => a + (d.input || 0), 0),
      output: timeline.reduce((a, d) => a + (d.output || 0), 0),
      cacheRead: timeline.reduce((a, d) => a + (d.cache_read || 0), 0),
      cacheWrite: timeline.reduce((a, d) => a + (d.cache_write || 0), 0),
      totalTokens: timeline.reduce((a, d) => a + (d.tokens || 0), 0),
      totalRequests: projects.reduce((a, p) => a + (p.requests || 0), 0),
    };
  });

  readonly topStats = computed<Stat[]>(() => {
    const t = this.totals();
    const liveTotal = this.live.metrics()['total_tokens'] as number | undefined;
    return [
      { label: `Total tokens (${this.rangeLabel()})`, value: fmt(liveTotal ?? t.totalTokens), hint: 'Input + output + cache read + cache write tokens across all requests in the selected date range. Exact figures reported by the Claude API, not estimates.' },
      { label: 'Input tokens', value: fmt(t.input), hint: 'Tokens sent to Claude as part of the prompt and context, in the selected range.' },
      { label: 'Output tokens', value: fmt(t.output), hint: 'Tokens Claude generated in its responses, in the selected range.' },
      { label: 'Cache read', value: fmt(t.cacheRead), hint: "Tokens served from Claude's prompt cache instead of being reprocessed from scratch — cheaper than a fresh input token, and tracked separately from Input above." },
    ];
  });

  readonly bottomStats = computed<Stat[]>(() => {
    const t = this.totals();
    const topClient = (this.clients.data() ?? [])[0];
    return [
      { label: 'Requests (all time)', value: fmt(t.totalRequests), hint: 'Total Claude API requests recorded across every project, always all-time — independent of the date range selected above.' },
      { label: 'Projects', value: fmt(this.projectList().length), hint: 'Number of distinct projects with recorded telemetry.' },
      { label: 'Top client', value: topClient ? topClient.client : '—', hint: 'The IDE/CLI client that has sent the most requests, all-time.' },
      { label: 'Avg tokens/req', value: t.totalRequests > 0 ? fmt(Math.round(t.totalTokens / t.totalRequests)) : '—', hint: 'Total tokens (selected range) divided by total requests (all-time) — a rough per-request average, not an exact ratio for the same window.' },
    ];
  });

  readonly mix = computed(() => {
    const t = this.totals();
    const total = t.input + t.cacheRead + t.cacheWrite + t.output || 1;
    return ([['Input', t.input], ['Cache read', t.cacheRead], ['Cache write', t.cacheWrite], ['Output', t.output]] as [string, number][]).map(([label, val]) => ({ label, val, pct: Math.round((val / total) * 100) }));
  });

  readonly trend = computed(() => this.timelineList().map((d) => ({ day: d.day, tokens: d.tokens })));
  readonly barData = computed(() => this.projectList().slice(0, 20).map((p) => ({ project: p.project, total_tokens: p.total_tokens })));

  readonly columns: Column[] = [
    { key: 'project', label: 'Project', sortable: true },
    { key: 'total_tokens', label: 'Tokens', sortable: true, align: 'right', render: (v) => fmt(v as number) },
    { key: 'requests', label: 'Requests', sortable: true, align: 'right', render: (v) => fmt(v as number) },
    { key: 'last_activity', label: 'Last active', sortable: true, render: (v) => ago(v as string) },
  ];
}
