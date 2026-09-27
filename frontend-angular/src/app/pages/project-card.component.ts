import { Component, computed, input } from '@angular/core';
import { BadgeComponent } from '../ui/badge.component';
import { ago, fmt, healthOf } from '../lib/format';
import type { ProjectSummary } from '../lib/types';

/** Port of components/cards/ProjectCard.tsx on its real <a> (the usage adds [routerLink]). */
@Component({
  selector: 'a[ttProjectCard]',
  standalone: true,
  imports: [BadgeComponent],
  host: { class: 'block bg-surface border border-line rounded-lg p-4 hover:border-ink-soft hover:shadow-[0_2px_10px_rgba(15,23,42,.06)] transition-shadow' },
  template: `<div class="flex items-center gap-3 mb-3"><div class="w-9 h-9 rounded-md bg-accent-soft text-accent-strong grid place-items-center font-extrabold shrink-0">{{ p().project.slice(0, 2).toUpperCase() }}</div><div class="min-w-0"><div class="font-bold truncate">{{ p().project }}</div><div class="text-[11px] text-ink-soft"><ng-container>{{ p().sessions }}</ng-container> sessions</div></div></div><div class="flex items-center justify-between text-sm"><div><div class="font-bold">{{ fmt(p().total_tokens) }}</div><div class="text-[11px] text-ink-soft">tokens</div></div><div><div class="font-bold">{{ fmt(p().requests) }}</div><div class="text-[11px] text-ink-soft">requests</div></div><div><div class="font-bold">{{ ago(p().last_activity) }}</div><div class="text-[11px] text-ink-soft">last active</div></div><span ttBadge [tone]="tone()"><ng-container>{{ health() }}</ng-container>%</span></div>`,
})
export class ProjectCardComponent {
  readonly p = input.required<ProjectSummary>();
  readonly health = computed(() => healthOf(this.p().last_activity));
  readonly tone = computed(() => (this.health() > 95 ? 'success' : this.health() > 90 ? 'info' : 'warning'));
  fmt = fmt;
  ago = ago;
}
