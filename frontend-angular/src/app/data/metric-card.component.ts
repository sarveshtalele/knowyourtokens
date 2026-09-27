import { Component, computed, input } from '@angular/core';
import { TooltipComponent } from '../ui/tooltip.component';
import { IconComponent } from '../ui/icon.component';

export interface Stat {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'neutral';
  hint?: string;
}

/** Port of components/data/MetricCard.tsx on its real <div>. */
@Component({
  selector: 'div[ttMetricCard]',
  standalone: true,
  imports: [TooltipComponent, IconComponent],
  host: { class: 'bg-surface border border-line rounded-lg p-4 shadow-[0_2px_10px_rgba(15,23,42,.045)] min-h-[110px]' },
  template: `<div class="flex items-center gap-1.5 text-ink-soft font-semibold text-xs"><span>{{ stat().label }}</span>@if (stat().hint) {<span ttTooltip [label]="stat().hint!"><svg ttIcon="info" class="text-ink-soft/70 hover:text-ink-soft shrink-0"></svg></span>}</div><div class="text-ink font-extrabold text-[26px] tracking-tight mt-2 mb-0.5">{{ stat().value }}</div>@if (stat().delta) {<div [class]="'text-xs font-semibold ' + trendColor()">{{ stat().delta }}</div>}`,
})
export class MetricCardComponent {
  readonly stat = input.required<Stat>();
  readonly trendColor = computed(() => {
    const trend = this.stat().trend ?? 'up';
    return trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-ink-soft';
  });
}
