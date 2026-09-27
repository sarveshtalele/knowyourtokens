import { Component, computed, signal } from '@angular/core';
import { ApiResource } from '../lib/api-resource';
import { getProjects } from '../api/projects';
import { getReportPreview, reportExportUrl } from '../api/reports';
import { fmt } from '../lib/format';
import type { ReportKind } from '../lib/types';
import { PageHeadComponent, ErrorPanelComponent } from './page-head.component';
import { SelectComponent } from '../ui/select.component';
import { ButtonComponent } from '../ui/button.component';
import { IconComponent } from '../ui/icon.component';
import { DateRangeFilterComponent } from './date-range-filter.component';

const KINDS: { value: ReportKind; label: string; description: string }[] = [
  { value: 'requests', label: 'Requests', description: 'One row per Claude request: tokens, model, client, prompt/response previews.' },
  { value: 'projects', label: 'Projects', description: 'One row per project: totals, sessions, and its most-used tool.' },
];

function startDateFor(days: string): string | undefined {
  const n = Number(days);
  if (!n) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Port of pages/Reports.tsx. */
@Component({
  selector: 'tt-reports',
  standalone: true,
  imports: [PageHeadComponent, ErrorPanelComponent, SelectComponent, ButtonComponent, IconComponent, DateRangeFilterComponent],
  host: { style: 'display: contents' },
  template: `
    <div class="space-y-6">
      <div ttPageHead eyebrow="Export" title="Reports" subtitle="Export usage, tool, and attribution data as CSV or JSON for spreadsheets, BI tools, or your own analysis."></div>
      <div class="bg-surface border border-line rounded-lg p-4 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label class="block text-xs font-semibold text-ink-soft mb-1.5">Report type</label><select ttSelect class="w-full" (change)="kind.set($any($event.target).value)">@for (k of kinds; track k.value) {<option [value]="k.value" [selected]="kind() === k.value">{{ k.label }}</option>}</select></div>
          <div><label class="block text-xs font-semibold text-ink-soft mb-1.5">Project</label><select ttSelect class="w-full" (change)="project.set($any($event.target).value)"><option value="All" [selected]="project() === 'All'">All projects</option>@for (p of projectList(); track p.project) {<option [value]="p.project" [selected]="project() === p.project">{{ p.project }}</option>}</select></div>
          <div><label class="block text-xs font-semibold text-ink-soft mb-1.5">Date range</label><select ttDateRange [value]="days()" (changed)="days.set($event)"></select></div>
        </div>
        <p class="text-xs text-ink-soft">{{ description() }}</p>
      </div>
      @if (preview.error(); as err) {
        <div ttErrorPanel [message]="err.message"></div>
      }
      @if (!preview.error()) {
        <div class="bg-surface border border-line rounded-lg p-4 space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div class="text-xs font-semibold text-ink-soft">Rows matching this filter</div>
              <div class="text-ink font-extrabold text-2xl tracking-tight">{{ preview.loading() || !preview.data() ? '…' : fmt(preview.data()!.row_count) }}</div>
              @if (preview.data() && preview.data()!.row_count >= 5000) {
                <p class="text-xs text-warning mt-1">Exports are capped at 5,000 rows — narrow the date range or project to get everything.</p>
              }
            </div>
            <div class="flex gap-2">
              <a [href]="exportUrl('csv')"><button ttButton variant="primary" class="flex items-center gap-1.5"><svg ttIcon="download" [width]="14" [height]="14"></svg> Download CSV</button></a>
              <a [href]="exportUrl('json')"><button ttButton class="flex items-center gap-1.5"><svg ttIcon="download" [width]="14" [height]="14"></svg> Download JSON</button></a>
            </div>
          </div>
          @if (preview.data() && preview.data()!.sample.length > 0) {
            <div class="overflow-x-auto">
              <div class="text-xs font-semibold text-ink-soft mb-2">Preview (first 5 rows)</div>
              <table class="w-full text-xs border-collapse">
                <thead><tr class="text-left text-ink-soft border-b border-line">@for (c of preview.data()!.columns; track c) {<th class="py-1.5 pr-4 font-semibold whitespace-nowrap">{{ c }}</th>}</tr></thead>
                <tbody>
                  @for (row of preview.data()!.sample; track $index) {
                    <tr class="border-b border-line last:border-0">@for (c of preview.data()!.columns; track c) {<td class="py-1.5 pr-4 whitespace-nowrap max-w-[260px] truncate text-ink-soft">{{ str(row[c] ?? '') }}</td>}</tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @if (preview.data() && preview.data()!.row_count === 0) {
            <div class="text-center text-ink-soft py-6 text-sm">No rows match this filter.</div>
          }
        </div>
      }
    </div>
  `,
})
export class ReportsComponent {
  readonly kinds = KINDS;
  readonly projects = new ApiResource(() => getProjects());
  readonly projectList = computed(() => this.projects.data() ?? []);
  readonly kind = signal<ReportKind>('requests');
  readonly project = signal('All');
  readonly days = signal('0');
  readonly filters = computed(() => ({ kind: this.kind(), project: this.project() === 'All' ? undefined : this.project(), start: startDateFor(this.days()) }));
  readonly preview = new ApiResource(() => getReportPreview(this.filters()), () => [this.filters().kind, this.filters().project, this.filters().start]);
  readonly description = computed(() => KINDS.find((k) => k.value === this.kind())?.description);
  fmt = fmt;
  str = (v: unknown) => String(v);
  exportUrl = (format: 'csv' | 'json') => reportExportUrl(this.filters(), format);
}
