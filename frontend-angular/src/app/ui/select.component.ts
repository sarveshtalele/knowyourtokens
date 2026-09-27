import { Component } from '@angular/core';

/**
 * Port of components/ui/Select.tsx on its real <select>. Options mark themselves [selected]: a [value] binding on the
 * <select> is applied before @for renders the options, so the first option would show instead (React sets it after).
 */
@Component({
  selector: 'select[ttSelect]',
  standalone: true,
  host: { class: 'h-10 border border-line bg-surface rounded-md px-3 text-sm text-ink outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft' },
  template: `<ng-content />`,
})
export class SelectComponent {}
