import { Component, computed, input } from '@angular/core';

const BASE = 'border rounded-md px-3.5 py-2 text-sm font-semibold transition-colors';
const VARIANTS: Record<string, string> = {
  default: 'border-line bg-surface text-ink hover:border-ink-soft hover:bg-surface-muted',
  primary: 'border-accent bg-accent text-on-accent hover:bg-accent-strong',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-surface-muted',
};

/** Port of components/ui/Button.tsx on its real <button>; extra classes come from the usage's class attribute. */
@Component({
  selector: 'button[ttButton]',
  standalone: true,
  host: { '[class]': 'cls()' },
  template: `<ng-content />`,
})
export class ButtonComponent {
  readonly variant = input<'default' | 'primary' | 'ghost'>('default');
  readonly cls = computed(() => `${BASE} ${VARIANTS[this.variant()]}`);
}
