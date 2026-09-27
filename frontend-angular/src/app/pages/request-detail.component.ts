import { Component, input } from '@angular/core';
import { BadgeComponent } from '../ui/badge.component';
import { ago, fmt } from '../lib/format';
import type { UsageRow } from '../lib/types';

/** Port of RequestDetail (pages/Requests.tsx) on its real <div>. */
@Component({
  selector: 'div[ttRequestDetail]',
  standalone: true,
  imports: [BadgeComponent],
  host: { class: 'space-y-5' },
  template: `
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-center gap-2 flex-wrap"><span ttBadge tone="accent">{{ row().model || '—' }}</span><span ttBadge>{{ row().client || '—' }}</span><span class="text-ink-soft text-xs">{{ ago(row().event_time) }}</span></div>
      <button (click)="openFull()" class="text-xs font-semibold text-accent-strong hover:underline whitespace-nowrap">Open full prompt &amp; response ↗</button>
    </div>
    <div class="text-lg font-bold">{{ row().project || '—' }}</div>
    <div class="grid grid-cols-2 gap-3">
      @for (m of metrics(); track m[0]) {<div class="bg-surface-muted rounded-lg p-3"><div class="text-[11px] text-ink-soft">{{ m[0] }}</div><div class="font-bold text-base">{{ m[1] }}</div></div>}
    </div>
    <div>
      <div class="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-2">Session</div>
      <div class="grid grid-cols-[130px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Session id</span><span><span class="font-mono text-xs">{{ row().session_id }}</span></span></div>
      <div class="grid grid-cols-[130px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Total tokens</span><span>{{ fmt(row().total_tokens) }}</span></div>
      <div class="grid grid-cols-[130px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Context window</span><span>{{ row().context_window ? fmt(row().context_window) : '—' }}</span></div>
      <div class="grid grid-cols-[130px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm"><span class="text-ink-soft">Event time</span><span>{{ row().event_time || '—' }}</span></div>
    </div>
    <div>
      <div class="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-2">Prompt preview</div>
      <p class="text-ink-soft text-xs mb-2">Truncated preview stored at collection time (up to 800 characters) — not the full transcript.</p>
      <pre class="bg-surface-code text-slate-300 rounded-lg p-3.5 text-xs whitespace-pre-wrap break-words leading-relaxed max-h-72 overflow-y-auto">{{ row().prompt_preview || '(no prompt preview captured)' }}</pre>
    </div>
    <div>
      <div class="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-2">Response preview</div>
      <p class="text-ink-soft text-xs mb-2">Truncated preview (up to 1200 characters) — not the full response.</p>
      <pre class="bg-surface-code text-slate-300 rounded-lg p-3.5 text-xs whitespace-pre-wrap break-words leading-relaxed max-h-72 overflow-y-auto">{{ row().response_preview || '(no response preview captured)' }}</pre>
    </div>
  `,
})
export class RequestDetailComponent {
  readonly row = input.required<UsageRow>();
  fmt = fmt;
  ago = ago;
  metrics = () => [['Input', fmt(this.row().input_tokens)], ['Output', fmt(this.row().output_tokens)], ['Cache read', fmt(this.row().cache_read_tokens)], ['Cache write', fmt(this.row().cache_write_tokens)]];
  openFull = () => window.open(`/requests/${this.row().id}`, '_blank', 'noopener');
}
