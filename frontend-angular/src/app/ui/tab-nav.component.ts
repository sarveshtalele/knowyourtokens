import { Component, input, output } from '@angular/core';

/** Port of components/ui/TabNav.tsx on its real <div>. */
@Component({
  selector: 'div[ttTabNav]',
  standalone: true,
  host: { class: 'flex gap-0.5 border-b border-line mb-4' },
  template: `@for (t of tabs(); track t) {<button (click)="change.emit(t)" [class]="'border-0 bg-transparent px-3.5 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ' + (active() === t ? 'text-accent-strong border-accent' : 'text-ink-soft border-transparent hover:text-ink')">{{ t }}</button>}`,
})
export class TabNavComponent {
  readonly tabs = input.required<string[]>();
  readonly active = input.required<string>();
  readonly change = output<string>();
}
