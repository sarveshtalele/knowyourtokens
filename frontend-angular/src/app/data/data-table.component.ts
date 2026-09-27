import { Component, TemplateRef, computed, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  /** Text cell renderer (a JSX-returning render in the source is a `cells` template instead). */
  render?: (val: unknown, row: any) => string;
}

/**
 * Port of components/data/DataTable.tsx on its real wrapper <div>. `cells[i]` is an ng-template for column i when
 * the source's render returns markup (context: $implicit = value, row = the row).
 */
@Component({
  selector: 'div[ttDataTable]',
  standalone: true,
  imports: [NgTemplateOutlet],
  host: { class: 'bg-surface border border-line rounded-lg overflow-x-auto' },
  template: `
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="border-b border-line bg-surface-muted">
          @for (c of columns(); track $index; let ci = $index) {
            <th (click)="c.sortable && toggle(c.key)" [class]="'px-4 py-3 text-[11px] uppercase tracking-wide font-bold text-ink-soft whitespace-nowrap ' + (c.align === 'right' ? 'text-right' : 'text-left') + ' ' + (c.sortable ? 'cursor-pointer select-none hover:text-ink' : '')"><ng-container>{{ c.label }}</ng-container><ng-container>{{ sortKey() === c.key ? (sortDir() === 'asc' ? ' ▲' : ' ▼') : '' }}</ng-container></th>
          }
        </tr>
      </thead>
      <tbody>
        @if (sorted().length === 0) {
          <tr><td [attr.colspan]="columns().length" class="p-10 text-center text-ink-soft">{{ emptyLabel() }}</td></tr>
        } @else {
          @for (row of sorted(); track $index) {
            <tr (click)="rowClick.emit(row)" [class]="'border-b border-line last:border-0 ' + (clickable() ? 'cursor-pointer hover:bg-surface-muted' : '')">
              @for (c of columns(); track $index; let ci = $index) {
                <td [class]="'px-4 py-2.5 text-ink whitespace-nowrap ' + (c.align === 'right' ? 'text-right font-mono text-xs' : '')">@if (cells()[ci]) {<ng-container *ngTemplateOutlet="cells()[ci]; context: { $implicit: row[c.key], row: row }" />} @else {<ng-container>{{ c.render ? c.render(row[c.key], row) : str(row[c.key]) }}</ng-container>}</td>
              }
            </tr>
          }
        }
      </tbody>
    </table>
  `,
})
export class DataTableComponent {
  readonly columns = input.required<Column[]>();
  readonly data = input.required<any[]>();
  readonly emptyLabel = input('No data yet.');
  readonly cells = input<Record<number, TemplateRef<unknown>>>({});
  /** Whether the source passed onRowClick (rows get the clickable styling). */
  readonly clickable = input(false);
  readonly rowClick = output<any>();

  readonly sortKey = signal('');
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  readonly sorted = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    return [...this.data()].sort((a, b) => {
      if (!key) return 0;
      const va = a[key];
      const vb = b[key];
      if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
      return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  });

  toggle(k: string) {
    if (this.sortKey() === k) this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      this.sortKey.set(k);
      this.sortDir.set('desc');
    }
  }

  str(v: unknown) {
    return String(v ?? '—');
  }
}
