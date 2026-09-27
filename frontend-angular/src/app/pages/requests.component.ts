import { Component, computed, inject, signal } from '@angular/core';
import { ApiResource } from '../lib/api-resource';
import { LiveService } from '../lib/live.service';
import { getUsage } from '../api/usage';
import { getProjects } from '../api/projects';
import { ago, fmt } from '../lib/format';
import type { UsageRow } from '../lib/types';
import { PageHeadComponent, ErrorPanelComponent } from './page-head.component';
import { StatRowComponent } from '../data/stat-row.component';
import { DataTableComponent, type Column } from '../data/data-table.component';
import { ButtonComponent } from '../ui/button.component';
import { IconComponent } from '../ui/icon.component';
import { DrawerComponent } from '../ui/drawer.component';
import { ProjectFilterComponent } from './date-range-filter.component';
import { RequestDetailComponent } from './request-detail.component';
import type { Stat } from '../data/metric-card.component';

/** Port of pages/Requests.tsx. */
@Component({
  selector: 'tt-requests',
  standalone: true,
  imports: [PageHeadComponent, ErrorPanelComponent, StatRowComponent, DataTableComponent, ButtonComponent, IconComponent, DrawerComponent, ProjectFilterComponent, RequestDetailComponent],
  host: { style: 'display: contents' },
  template: `
    @if (usage.error(); as err) {
      <div ttErrorPanel [message]="err.message"></div>
    } @else {
      <div class="space-y-6">
        <div ttPageHead eyebrow="Trace explorer" title="Requests" subtitle="Inspect individual Claude requests with exact usage and context metadata. Click a row to view the prompt and response." [hasActions]="true"><button ttButton (click)="usage.reload()" class="flex items-center gap-1.5"><svg ttIcon="refresh" [width]="14" [height]="14"></svg> Refresh</button></div>
        <div ttStatRow [stats]="stats()"></div>
        <div class="flex gap-2 flex-wrap">
          <input [value]="q()" (input)="q.set($any($event.target).value)" placeholder="Search project, model, client…" class="h-10 border border-line bg-surface rounded-md px-3 text-sm min-w-[260px] flex-1 outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" />
          <select ttProjectFilter [projects]="projectNames()" [value]="project()" (changed)="project.set($event); page.set(1)"></select>
        </div>
        @if (usage.loading() && rows().length === 0) {
          <div class="p-10 text-center text-ink-soft">Loading requests…</div>
        } @else {
          <div ttDataTable [columns]="columns" [data]="filtered()" [clickable]="true" (rowClick)="selected.set($event)" [cells]="{ '0': sessionCell }"></div>
        }
        <div class="flex gap-2 justify-end">
          <button ttButton [disabled]="page() <= 1" (click)="page.set(max1(page() - 1))">← Prev</button>
          <button ttButton (click)="page.set(page() + 1)">Next →</button>
        </div>
        <tt-drawer [open]="!!selected()" [title]="selected() ? 'Request · ' + selected()!.session_id.slice(0, 12) : ''" (closed)="selected.set(null)">
          @if (selected(); as s) {<div ttRequestDetail [row]="s"></div>}
        </tt-drawer>
      </div>
    }
    <ng-template #sessionCell let-v><span class="font-mono">{{ str(v).slice(0, 12) }}</span></ng-template>
  `,
})
export class RequestsComponent {
  private readonly live = inject(LiveService);
  readonly page = signal(1);
  readonly project = signal('');
  readonly q = signal('');
  readonly selected = signal<UsageRow | null>(null);
  readonly usage = new ApiResource(
    () => getUsage({ page: String(this.page()), page_size: '100', ...(this.project() ? { project: this.project() } : {}) }),
    () => [this.page(), this.project(), this.live.version()],
  );
  readonly projects = new ApiResource(() => getProjects());
  readonly rows = computed(() => this.usage.data() ?? []);
  readonly projectNames = computed(() => (this.projects.data() ?? []).map((p) => p.project));
  readonly filtered = computed(() => this.rows().filter((r) => [r.project, r.model, r.client, r.session_id].join(' ').toLowerCase().includes(this.q().toLowerCase())));
  str = (v: unknown) => String(v);
  max1 = (n: number) => Math.max(1, n);

  readonly stats = computed<Stat[]>(() => {
    const usage = this.rows();
    const totalTokens = usage.reduce((a, r) => a + (r.total_tokens || 0), 0);
    const cacheRead = usage.reduce((a, r) => a + (r.cache_read_tokens || 0), 0);
    return [
      { label: 'Requests (page)', value: fmt(usage.length), hint: 'Number of requests shown on this page of results (up to 100), not the total across all pages.' },
      { label: 'Avg request', value: usage.length ? fmt(Math.round(totalTokens / usage.length)) : '—', hint: 'Average total tokens per request, for the requests on this page only.' },
      { label: 'Cache read (page)', value: fmt(cacheRead), hint: 'Total cache-read tokens across the requests on this page — tokens served from cache instead of reprocessed.' },
      { label: 'Page', value: String(this.page()), hint: 'The current page number. Use the Prev/Next buttons below to move through pages of 100.' },
    ];
  });

  readonly columns: Column[] = [
    { key: 'session_id', label: 'Session' },
    { key: 'project', label: 'Project' },
    { key: 'model', label: 'Model' },
    { key: 'client', label: 'Client' },
    { key: 'input_tokens', label: 'Input', align: 'right', render: (v) => fmt(v as number) },
    { key: 'output_tokens', label: 'Output', align: 'right', render: (v) => fmt(v as number) },
    { key: 'cache_read_tokens', label: 'Cache read', align: 'right', render: (v) => fmt(v as number) },
    { key: 'event_time', label: 'Age', render: (v) => ago(v as string) },
  ];
}
