import { Component, input, signal } from '@angular/core';

/** Port of components/ui/Tooltip.tsx on its real <span>. */
@Component({
  selector: 'span[ttTooltip]',
  standalone: true,
  host: { class: 'relative inline-block', '(mouseenter)': 'show.set(true)', '(mouseleave)': 'show.set(false)' },
  template: `<ng-content />@if (show()) {<span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-[260px] whitespace-normal text-center leading-snug rounded-md bg-slate-900 dark:bg-slate-700 text-white text-[11px] px-2.5 py-1.5 z-20 shadow-lg">{{ label() }}</span>}`,
})
export class TooltipComponent {
  readonly label = input.required<string>();
  readonly show = signal(false);
}
