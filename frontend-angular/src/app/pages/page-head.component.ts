import { Component, input } from '@angular/core';

/** Port of PageHead (pages/GlobalDashboard.tsx) on its real <div>; `actions` content is projected when hasActions. */
@Component({
  selector: 'div[ttPageHead]',
  standalone: true,
  host: { class: 'flex items-start justify-between gap-5 flex-wrap' },
  template: `<div><div class="text-accent text-[11px] font-extrabold uppercase tracking-wide">{{ eyebrow() }}</div><div class="text-[27px] font-extrabold tracking-tight mt-1 mb-1.5">{{ title() }}</div>@if (subtitle()) {<div class="text-ink-soft text-sm max-w-2xl">{{ subtitle() }}</div>}</div>@if (hasActions()) {<div class="flex gap-2 flex-wrap"><ng-content /></div>}`,
})
export class PageHeadComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly hasActions = input(false);
}

/** Port of ErrorPanel (pages/GlobalDashboard.tsx) on its real <div>. */
@Component({
  selector: 'div[ttErrorPanel]',
  standalone: true,
  host: { class: 'p-10 text-center text-ink-soft bg-surface border border-line rounded-lg' },
  template: `Could not reach the telemetry backend at <span class="font-mono">/api/v1</span>.<br /><span class="font-mono text-xs">{{ message() }}</span><br /><br />Start it with: <span class="font-mono">cd backend &amp;&amp; python run.py</span>`,
})
export class ErrorPanelComponent {
  readonly message = input.required<string>();
}
