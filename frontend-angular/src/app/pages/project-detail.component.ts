import { Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ApiResource } from '../lib/api-resource';
import { getProjects, getProjectAttributionSummary } from '../api/projects';
import { getAttributions } from '../api/attributions';
import { getUsageByProject } from '../api/usage';
import { getSessions } from '../api/sessions';
import { ago, attributionLabel, fmt, healthOf, UNATTRIBUTED_HINT } from '../lib/format';
import type { UsageRow } from '../lib/types';
import { ErrorPanelComponent } from './page-head.component';
import { StatRowComponent } from '../data/stat-row.component';
import { DataTableComponent, type Column } from '../data/data-table.component';
import { TabNavComponent } from '../ui/tab-nav.component';
import { BadgeComponent } from '../ui/badge.component';
import { DrawerComponent } from '../ui/drawer.component';
import { TooltipComponent } from '../ui/tooltip.component';
import { IconComponent } from '../ui/icon.component';
import { RequestDetailComponent } from './request-detail.component';
import type { Stat } from '../data/metric-card.component';

/** Port of RequestsTab (pages/ProjectDetail.tsx): a fragment, so the host adds no box. */
@Component({
  selector: 'tt-project-requests',
  standalone: true,
  imports: [DataTableComponent, DrawerComponent, RequestDetailComponent],
  host: { style: 'display: contents' },
  template: `
    @if (res.loading()) {
      <div class="p-10 text-center text-ink-soft">Loading…</div>
    } @else {
      <div ttDataTable [columns]="columns" [data]="(res.data() ?? []).slice(0, 50)" emptyLabel="No requests for this project." [clickable]="true" (rowClick)="selected.set($event)" [cells]="{ '0': sessionCell }"></div>
      <tt-drawer [open]="!!selected()" [title]="selected() ? 'Request · ' + selected()!.session_id.slice(0, 12) : ''" (closed)="selected.set(null)">@if (selected(); as s) {<div ttRequestDetail [row]="s"></div>}</tt-drawer>
    }
    <ng-template #sessionCell let-v><span class="font-mono">{{ str(v).slice(0, 12) }}</span></ng-template>
  `,
})
export class ProjectRequestsComponent {
  readonly project = input.required<string>();
  readonly res = new ApiResource(() => getUsageByProject(this.project()), () => [this.project()]);
  readonly selected = signal<UsageRow | null>(null);
  str = (v: unknown) => String(v);
  readonly columns: Column[] = [
    { key: 'session_id', label: 'Session' },
    { key: 'model', label: 'Model' },
    { key: 'client', label: 'Client' },
    { key: 'input_tokens', label: 'Input', align: 'right', render: (v) => fmt(v as number) },
    { key: 'output_tokens', label: 'Output', align: 'right', render: (v) => fmt(v as number) },
    { key: 'cache_read_tokens', label: 'Cache read', align: 'right', render: (v) => fmt(v as number) },
  ];
}

/** Port of SessionsTab (pages/ProjectDetail.tsx). */
@Component({
  selector: 'tt-project-sessions',
  standalone: true,
  imports: [DataTableComponent],
  host: { style: 'display: contents' },
  template: `
    @if (res.loading()) {
      <div class="p-10 text-center text-ink-soft">Loading…</div>
    } @else {
      <div ttDataTable [columns]="columns" [data]="scoped()" emptyLabel="No sessions for this project." [cells]="{ '0': sessionCell }"></div>
    }
    <ng-template #sessionCell let-v><span class="font-mono">{{ str(v).slice(0, 12) }}</span></ng-template>
  `,
})
export class ProjectSessionsComponent {
  readonly project = input.required<string>();
  readonly res = new ApiResource(() => getSessions());
  readonly scoped = computed(() => (this.res.data() ?? []).filter((s) => s.project === this.project()));
  str = (v: unknown) => String(v);
  readonly columns: Column[] = [
    { key: 'session_id', label: 'Session' },
    { key: 'client', label: 'Client' },
    { key: 'model', label: 'Model' },
    { key: 'total_tokens', label: 'Tokens', align: 'right', render: (v) => fmt(v as number) },
    { key: 'interactions', label: 'Interactions', align: 'right', render: (v) => fmt(v as number) },
    { key: 'last_active', label: 'Last active', render: (v) => ago(v as string) },
  ];
}

/** Port of pages/ProjectDetail.tsx. */
@Component({
  selector: 'tt-project-detail',
  standalone: true,
  imports: [ErrorPanelComponent, StatRowComponent, DataTableComponent, TabNavComponent, BadgeComponent, TooltipComponent, IconComponent, ProjectRequestsComponent, ProjectSessionsComponent],
  host: { style: 'display: contents' },
  template: `
    @if (projects.error(); as err) {
      <div ttErrorPanel [message]="err.message"></div>
    } @else if (projects.loading()) {
      <div class="p-10 text-center text-ink-soft">Loading project…</div>
    } @else if (!project()) {
      <div class="p-10 text-center text-ink-soft bg-surface border border-line rounded-lg">No project named "<ng-container>{{ id() }}</ng-container>" found in telemetry data.</div>
    } @else {
      <div class="space-y-6">
        <div class="flex items-start justify-between gap-5 flex-wrap">
          <div>
            <div class="flex items-center gap-3 mb-1"><span class="bg-accent-soft text-accent-strong text-xs font-bold rounded-full px-3 py-1">Project scope</span><span class="text-ink-soft text-sm"><ng-container>{{ project()!.project }}</ng-container> · <ng-container>{{ project()!.sessions }}</ng-container> sessions · <ng-container>{{ project()!.client_count }}</ng-container> clients</span></div>
            <div class="text-[27px] font-extrabold tracking-tight">{{ project()!.project }}</div>
          </div>
          <div class="flex items-center gap-2"><span ttBadge tone="success">Live collector</span></div>
        </div>
        <div ttTabNav [tabs]="tabs" [active]="tab()" (change)="tab.set($event)"></div>
        @if (tab() === 'Summary') {
          <div class="space-y-6">
            <div ttStatRow [stats]="stats()"></div>
            <div class="grid grid-cols-[1.35fr_.65fr] gap-4">
              <div class="bg-surface border border-line rounded-lg p-4">
                <div class="flex items-center justify-between mb-4"><h3 class="text-sm font-bold">Attribution hotspots</h3><span ttBadge tone="warning">Estimated</span></div>
                @for (a of hotspots(); track a.category) {
                  <div class="my-3.5"><div class="flex justify-between text-sm"><span class="font-mono flex items-center gap-1.5"><ng-container>{{ label(a.category) }}</ng-container>@if (a.category === '[unattributed]') {<span ttTooltip [label]="hint"><svg ttIcon="info" class="text-ink-soft"></svg></span>}</span><b>{{ fmt(a.estimated_tokens) }}</b></div><div class="h-1.5 rounded-full bg-line mt-1.5 overflow-hidden"><div class="h-full bg-accent rounded-full" [style.width]="(a.estimated_tokens / maxAttr()) * 100 + '%'"></div></div></div>
                }
                @if (attrs().length === 0) {<div class="text-ink-soft text-sm">No attribution data for this project.</div>}
              </div>
              <div class="bg-surface border border-line rounded-lg p-4">
                <h3 class="text-sm font-bold mb-3">Project profile</h3>
                <div class="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Sessions</span><span>{{ str(project()!.sessions) }}</span></div>
                <div class="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Clients</span><span>{{ str(project()!.client_count) }}</span></div>
                <div class="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Last activity</span><span>{{ ago(project()!.last_activity) }}</span></div>
                <div class="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Attribution</span><span><span ttBadge tone="warning">Estimated</span></span></div>
              </div>
            </div>
            <div class="bg-surface border border-line rounded-lg p-4">
              <h3 class="text-sm font-bold mb-3">Most used in this project</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                @for (t of tiles(); track t.label) {
                  <div class="bg-surface-muted rounded-lg p-3.5"><div class="text-[11px] text-ink-soft mb-1">{{ t.label }}</div>@if (t.name) {<div class="font-mono text-sm font-bold truncate" [attr.title]="t.name">{{ t.name }}</div><div class="text-[11px] text-ink-soft mt-0.5"><ng-container>{{ fmt(t.count || 0) }}</ng-container> calls</div>} @else {<div class="text-sm text-ink-soft">No data yet</div>}</div>
                }
              </div>
            </div>
          </div>
        }
        @if (tab() === 'Requests') {<tt-project-requests [project]="project()!.project" />}
        @if (tab() === 'Hotspots') {
          <div class="bg-surface border border-line rounded-lg p-4"><p class="text-ink-soft text-sm mb-3">Estimated attribution; drill into request rows for exact API usage.</p><div ttDataTable [columns]="hotspotColumns" [data]="sortedAttrs()" emptyLabel="No attribution data." [cells]="{ '0': categoryCell }"></div></div>
        }
        @if (tab() === 'Sessions') {<tt-project-sessions [project]="project()!.project" />}
      </div>
    }
    <ng-template #categoryCell let-v><span class="font-mono flex items-center gap-1.5"><ng-container>{{ label(str(v)) }}</ng-container>@if (v === '[unattributed]') {<span ttTooltip [label]="hint"><svg ttIcon="info" class="text-ink-soft"></svg></span>}</span></ng-template>
  `,
})
export class ProjectDetailComponent {
  readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });
  readonly tabs = ['Summary', 'Requests', 'Hotspots', 'Sessions'];
  readonly tab = signal('Summary');
  readonly projects = new ApiResource(() => getProjects());
  readonly attributions = new ApiResource(() => getAttributions());
  readonly attrSummary = new ApiResource(() => getProjectAttributionSummary(this.id()), () => [this.id()]);
  readonly project = computed(() => (this.projects.data() ?? []).find((p) => p.project === this.id()));
  readonly attrs = computed(() => (this.attributions.data() ?? []).filter((a) => a.project === this.id()));
  readonly sortedAttrs = computed(() => [...this.attrs()].sort((a, b) => b.estimated_tokens - a.estimated_tokens));
  readonly hotspots = computed(() => this.sortedAttrs().slice(0, 5));
  readonly maxAttr = computed(() => Math.max(1, ...this.attrs().map((x) => x.estimated_tokens)));
  readonly hint = UNATTRIBUTED_HINT;
  fmt = fmt;
  ago = ago;
  label = attributionLabel;
  str = (v: unknown) => String(v);

  readonly stats = computed<Stat[]>(() => {
    const p = this.project()!;
    return [
      { label: 'Tokens', value: fmt(p.total_tokens), hint: 'Total tokens (input + output + cache read + cache write) recorded for this project, all-time — exact API usage.' },
      { label: 'Requests', value: fmt(p.requests), hint: 'Total Claude API requests recorded for this project, all-time.' },
      { label: 'Sessions', value: fmt(p.sessions), hint: 'Number of distinct Claude Code sessions in this project.' },
      { label: 'Health', value: `${healthOf(p.last_activity)}%`, hint: 'A recency signal, not a real health check — 98% if active in the last hour, 93% within a day, 85% within a week, 72% otherwise. Higher just means more recent activity, not more usage or fewer errors.' },
    ];
  });

  readonly tiles = computed(() => {
    const s = this.attrSummary.data();
    return [
      { label: 'Top skill', name: s?.top_skill?.skill_name, count: s?.top_skill?.call_count },
      { label: 'Top MCP server', name: s?.top_mcp_server?.server_name, count: s?.top_mcp_server?.call_count },
      { label: 'Top hook', name: s?.top_hook?.hook_name, count: s?.top_hook?.call_count },
    ];
  });

  readonly hotspotColumns: Column[] = [
    { key: 'category', label: 'Category' },
    { key: 'estimated_tokens', label: 'Estimated tokens', align: 'right', render: (v) => fmt(v as number) },
    { key: 'reference_count', label: 'References', align: 'right', render: (v) => fmt(v as number) },
  ];
}
