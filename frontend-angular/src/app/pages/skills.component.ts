import { Component, computed } from '@angular/core';
import { ApiResource } from '../lib/api-resource';
import { getSkills } from '../api/skills';
import { ago, fmt } from '../lib/format';
import { PageHeadComponent, ErrorPanelComponent } from './page-head.component';
import { StatRowComponent } from '../data/stat-row.component';
import { DataTableComponent, type Column } from '../data/data-table.component';
import { CategoryPieChartComponent } from '../charts/charts';
import { BadgeComponent } from '../ui/badge.component';
import { ButtonComponent } from '../ui/button.component';
import { IconComponent } from '../ui/icon.component';
import type { Stat } from '../data/metric-card.component';

/** Port of pages/Skills.tsx. */
@Component({
  selector: 'tt-skills',
  standalone: true,
  imports: [PageHeadComponent, ErrorPanelComponent, StatRowComponent, DataTableComponent, CategoryPieChartComponent, BadgeComponent, ButtonComponent, IconComponent],
  host: { style: 'display: contents' },
  template: `
    @if (res.error(); as err) {
      <div ttErrorPanel [message]="err.message"></div>
    } @else if (res.loading()) {
      <div class="p-10 text-center text-ink-soft">Loading skills…</div>
    } @else {
      <div class="space-y-6">
        <div ttPageHead eyebrow="Workflow intelligence" title="Skills" subtitle="Track skill activation, invocation source and call volume." [hasActions]="true"><button ttButton (click)="res.reload()" class="flex items-center gap-1.5"><svg ttIcon="refresh" [width]="14" [height]="14"></svg> Refresh</button></div>
        <div ttStatRow [columns]="3" [stats]="stats()"></div>
        @if (triggerDist().length > 0) {
          <div ttCategoryPieChart [data]="triggerDist()" title="Trigger type distribution"></div>
        }
        <div class="bg-surface border border-line rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-line"><span class="font-bold text-sm">Skill activity</span><span ttBadge tone="accent">Exact call counts</span></div>
          <div ttDataTable [columns]="columns" [data]="skills()" emptyLabel="No skill activations recorded yet." [cells]="{ '1': triggerCell }"></div>
        </div>
      </div>
    }
    <ng-template #triggerCell let-v><span ttBadge [tone]="v === 'tool' ? 'info' : 'success'">{{ str(v || '—') }}</span></ng-template>
  `,
})
export class SkillsComponent {
  readonly res = new ApiResource(() => getSkills());
  readonly skills = computed(() => this.res.data() ?? []);
  str = (v: unknown) => String(v);
  readonly triggerDist = computed(() => {
    const counts: Record<string, number> = {};
    for (const s of this.skills()) counts[s.trigger_type || 'unknown'] = (counts[s.trigger_type || 'unknown'] || 0) + s.call_count;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  });
  readonly stats = computed<Stat[]>(() => {
    const skills = this.skills();
    return [
      { label: 'Skill activations', value: fmt(skills.reduce((a, s) => a + (s.call_count || 0), 0)), hint: 'Total number of times any Skill has been invoked, across all recorded activity.' },
      { label: 'Unique skills', value: fmt(skills.length), hint: 'Number of distinct Skills that have been activated at least once.' },
      { label: 'Last activated', value: skills[0] ? ago(skills[0].last_activated) : '—', hint: 'How long ago the most recently used Skill was invoked (the table below is sorted by activation count, not recency).' },
    ];
  });
  readonly columns: Column[] = [
    { key: 'skill_name', label: 'Skill' },
    { key: 'trigger_type', label: 'Trigger' },
    { key: 'plugin_name', label: 'Plugin', render: (v) => String(v || '—') },
    { key: 'call_count', label: 'Activations', align: 'right', render: (v) => fmt(v as number) },
    { key: 'last_activated', label: 'Last activated', render: (v) => ago(v as string) },
  ];
}
