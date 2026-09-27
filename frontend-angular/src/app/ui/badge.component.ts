import { Component, computed, input } from '@angular/core';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const TONE_CLASSES: Record<Tone, string> = {
  default: 'bg-surface-muted text-ink-soft',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent-soft text-accent-strong',
};

/** Port of components/ui/Badge.tsx on its real <span>. */
@Component({
  selector: 'span[ttBadge]',
  standalone: true,
  host: { '[class]': 'cls()' },
  template: `<ng-content />`,
})
export class BadgeComponent {
  readonly tone = input<Tone>('default');
  readonly cls = computed(() => `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE_CLASSES[this.tone()]}`);
}
