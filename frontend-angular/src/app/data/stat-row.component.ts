import { Component, input } from '@angular/core';
import { MetricCardComponent, type Stat } from './metric-card.component';

/** Port of components/data/StatRow.tsx on its real <div>. */
@Component({
  selector: 'div[ttStatRow]',
  standalone: true,
  imports: [MetricCardComponent],
  host: { class: 'grid gap-4', '[style.grid-template-columns]': "'repeat(' + columns() + ', minmax(0, 1fr))'" },
  template: `@for (s of stats(); track s.label) {<div ttMetricCard [stat]="s"></div>}`,
})
export class StatRowComponent {
  readonly stats = input.required<Stat[]>();
  readonly columns = input(4);
}
