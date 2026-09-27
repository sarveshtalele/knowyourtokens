import { Component, computed, signal } from '@angular/core';
import { ApiResource } from '../lib/api-resource';
import { getSessions } from '../api/sessions';
import { getProjects } from '../api/projects';
import { ago, fmt } from '../lib/format';
import { PageHeadComponent, ErrorPanelComponent } from './page-head.component';
import { DataTableComponent, type Column } from '../data/data-table.component';
import { ProjectFilterComponent } from './date-range-filter.component';

/** Port of pages/Sessions.tsx. */
@Component({
  selector: 'tt-sessions',
  standalone: true,
  imports: [PageHeadComponent, ErrorPanelComponent, DataTableComponent, ProjectFilterComponent],
  host: { style: 'display: contents' },
  template: `
    @if (res.error(); as err) {
      <div ttErrorPanel [message]="err.message"></div>
    } @else if (res.loading()) {
      <div class="p-10 text-center text-ink-soft">Loading sessions…</div>
    } @else {
      <div class="space-y-6">
        <div ttPageHead eyebrow="Execution history" title="Sessions" subtitle="Session-level context for diagnosing high-volume Claude Code workflows."></div>
        <div class="flex gap-2 flex-wrap">
          <select ttProjectFilter [projects]="projectNames()" [value]="project()" (changed)="project.set($event)"></select>
          <input [value]="q()" (input)="q.set($any($event.target).value)" placeholder="Search session…" class="h-10 border border-line bg-surface rounded-md px-3 text-sm min-w-[240px] flex-1 outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" />
        </div>
        <div ttDataTable [columns]="columns" [data]="filtered()" [cells]="{ '0': sessionCell }"></div>
      </div>
    }
    <ng-template #sessionCell let-v><span class="font-mono">{{ str(v).slice(0, 12) }}</span></ng-template>
  `,
})
export class SessionsComponent {
  readonly res = new ApiResource(() => getSessions());
  readonly projects = new ApiResource(() => getProjects());
  readonly project = signal('');
  readonly q = signal('');
  str = (v: unknown) => String(v);
  readonly projectNames = computed(() => (this.projects.data() ?? []).map((p) => p.project));
  readonly filtered = computed(() =>
    (this.res.data() ?? [])
      .filter((s) => !this.project() || s.project === this.project())
      .filter((s) => [s.project, s.client, s.model, s.session_id].join(' ').toLowerCase().includes(this.q().toLowerCase())),
  );
  readonly columns: Column[] = [
    { key: 'session_id', label: 'Session' },
    { key: 'project', label: 'Project' },
    { key: 'client', label: 'Client' },
    { key: 'model', label: 'Model' },
    { key: 'total_tokens', label: 'Tokens', align: 'right', render: (v) => fmt(v as number) },
    { key: 'interactions', label: 'Interactions', align: 'right', render: (v) => fmt(v as number) },
    { key: 'last_active', label: 'Last active', render: (v) => ago(v as string) },
  ];
}
