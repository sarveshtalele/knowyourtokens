import { Component, input, output } from '@angular/core';
import { SelectComponent } from '../ui/select.component';

const OPTIONS = [
  { label: 'All time', value: '0' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'Last 365 days', value: '365' },
];

/** Port of components/filters/DateRangeFilter.tsx on its real <select>. */
@Component({
  selector: 'select[ttDateRange]',
  standalone: true,
  host: { class: 'h-10 border border-line bg-surface rounded-md px-3 text-sm text-ink outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft', '(change)': 'changed.emit($any($event.target).value)' },
  template: `@for (o of options; track o.value) {<option [value]="o.value" [selected]="value() === o.value">{{ o.label }}</option>}`,
})
export class DateRangeFilterComponent {
  readonly value = input.required<string>();
  readonly changed = output<string>();
  readonly options = OPTIONS;
}

/** Port of components/filters/ProjectFilter.tsx on its real <select>. */
@Component({
  selector: 'select[ttProjectFilter]',
  standalone: true,
  host: { class: 'h-10 border border-line bg-surface rounded-md px-3 text-sm text-ink outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft', '(change)': 'changed.emit($any($event.target).value)' },
  template: `<option value="" [selected]="value() === ''">All projects</option>@for (p of projects(); track p) {<option [value]="p" [selected]="value() === p">{{ p }}</option>}`,
})
export class ProjectFilterComponent {
  readonly projects = input.required<string[]>();
  readonly value = input.required<string>();
  readonly changed = output<string>();
}

export const FILTERS = [DateRangeFilterComponent, ProjectFilterComponent, SelectComponent];
