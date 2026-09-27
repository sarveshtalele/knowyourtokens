import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ApiResource } from '../lib/api-resource';
import { getUsageById } from '../api/usage';
import { ago, fmt } from '../lib/format';
import { ErrorPanelComponent } from './page-head.component';
import { BadgeComponent } from '../ui/badge.component';
import { TooltipComponent } from '../ui/tooltip.component';
import { IconComponent } from '../ui/icon.component';

const SEGMENTS: { key: 'cache_read_tokens' | 'cache_write_tokens' | 'input_tokens' | 'output_tokens'; label: string; color: string }[] = [
  { key: 'cache_read_tokens', label: 'Cache read (reused system prompt, tools, history)', color: 'bg-accent' },
  { key: 'cache_write_tokens', label: 'Cache write (newly cached this turn)', color: 'bg-info' },
  { key: 'input_tokens', label: 'Fresh input', color: 'bg-success' },
  { key: 'output_tokens', label: "Claude's response", color: 'bg-warning' },
];

/** Port of pages/RequestFull.tsx. */
@Component({
  selector: 'tt-request-full',
  standalone: true,
  imports: [RouterLink, ErrorPanelComponent, BadgeComponent, TooltipComponent, IconComponent],
  host: { style: 'display: contents' },
  template: `
    @if (res.error(); as err) {
      <div ttErrorPanel [message]="err.message"></div>
    } @else if (res.loading() || !res.data()) {
      <div class="p-10 text-center text-ink-soft">Loading request…</div>
    } @else {
      <div class="space-y-6 max-w-4xl">
        <div><a routerLink="/requests" class="text-sm text-accent-strong hover:underline">← Back to requests</a></div>
        <div class="flex items-start justify-between gap-5 flex-wrap"><div>
          <div class="text-accent text-[11px] font-extrabold uppercase tracking-wide">Full transcript</div>
          <div class="text-[27px] font-extrabold tracking-tight mt-1 mb-1.5">Request · <ng-container>{{ row().session_id.slice(0, 12) }}</ng-container></div>
          <div class="flex items-center gap-2 flex-wrap text-sm"><span ttBadge tone="accent">{{ row().model || '—' }}</span><span ttBadge>{{ row().client || '—' }}</span><span ttBadge>{{ row().project || '—' }}</span><span class="text-ink-soft text-xs">{{ ago(row().event_time) }}</span></div>
        </div></div>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          @for (m of metrics(); track m.label) {<div class="bg-surface-muted rounded-lg p-3"><div class="flex items-center gap-1 text-[11px] text-ink-soft"><span>{{ m.label }}</span><span ttTooltip [label]="m.hint"><svg ttIcon="info" class="text-ink-soft/70 hover:text-ink-soft shrink-0" [width]="12" [height]="12"></svg></span></div><div class="font-bold text-base">{{ m.value }}</div></div>}
        </div>
        <div class="bg-surface border border-line rounded-lg p-4">
          <div class="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-1">Where did these tokens go?</div>
          <p class="text-xs text-ink-soft mb-3">@if (row()[dominant().key] > 0) {<b class="text-ink">{{ dominant().label }}</b> makes up the largest share of this request's<ng-container>{{ ' ' }}</ng-container><ng-container>{{ fmt(row().total_tokens) }}</ng-container> total tokens (<ng-container>{{ pct(row()[dominant().key]) }}</ng-container>%).<ng-container>{{ ' ' }}</ng-container>@if (dominant().key === 'cache_read_tokens') {That's expected in a long session -- it's your system prompt, tool definitions, and prior conversation being reused from cache, not reprocessed from scratch.}
} @else {No token usage recorded for this request.}</p>
          <div class="flex h-3 rounded-full overflow-hidden bg-line">@for (seg of segments; track seg.key) {@if (share(seg.key) > 0) {<div [class]="seg.color" [style.width]="share(seg.key) + '%'" [attr.title]="seg.label + ': ' + fmt(row()[seg.key])"></div>}
}</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">@for (seg of segments; track seg.key) {<div class="flex items-center gap-1.5 text-[11px] text-ink-soft"><span [class]="'w-2 h-2 rounded-full shrink-0 ' + seg.color"></span><span class="truncate">{{ seg.label }}</span></div>}</div>
        </div>
        <div class="bg-surface border border-line rounded-lg p-4">
          <div class="flex items-center justify-between mb-2"><div class="text-[11px] uppercase tracking-wide font-bold text-ink-soft">Full prompt</div><button (click)="copy(row().prompt_full || row().prompt_preview || '')" class="text-[11px] font-semibold text-accent-strong hover:underline">Copy</button></div>
          <p class="text-xs text-ink-soft mb-2">Every user message and tool result since this session's last reply, in order. The system prompt and tool definitions aren't shown here -- Claude Code doesn't expose them to this collector -- but their exact token cost is fully accounted for above, under Cache read/write.</p>
          <pre class="bg-surface-code text-slate-300 rounded-lg p-4 text-xs whitespace-pre-wrap break-words leading-relaxed max-h-[60vh] overflow-y-auto">{{ row().prompt_full || row().prompt_preview || '(No new user message or tool result before this reply -- likely one step in a multi-tool sequence within the same turn.)' }}</pre>
        </div>
        <div class="bg-surface border border-line rounded-lg p-4">
          <div class="flex items-center justify-between mb-2"><div class="text-[11px] uppercase tracking-wide font-bold text-ink-soft">Full response</div><button (click)="copy(row().response_full || row().response_preview || '')" class="text-[11px] font-semibold text-accent-strong hover:underline">Copy</button></div>
          <pre class="bg-surface-code text-slate-300 rounded-lg p-4 text-xs whitespace-pre-wrap break-words leading-relaxed max-h-[60vh] overflow-y-auto">{{ row().response_full || row().response_preview || '(no response captured)' }}</pre>
        </div>
        <div class="text-xs text-ink-soft">Session id: <span class="font-mono">{{ row().session_id }}</span> · Event time: <ng-container>{{ row().event_time || '—' }}</ng-container></div>
      </div>
    }
  `,
})
export class RequestFullComponent {
  private readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });
  readonly res = new ApiResource(() => getUsageById(this.id()), () => [this.id()]);
  readonly row = computed(() => this.res.data()!);
  readonly segments = SEGMENTS;
  fmt = fmt;
  ago = ago;
  readonly dominant = computed(() => SEGMENTS.reduce((a, b) => (this.row()[a.key] >= this.row()[b.key] ? a : b)));
  pct = (v: number) => Math.round((v / (this.row().total_tokens || 1)) * 100);
  share = (k: (typeof SEGMENTS)[number]['key']) => (this.row()[k] / (this.row().total_tokens || 1)) * 100;
  copy = (text: string) => navigator.clipboard?.writeText(text);
  readonly metrics = computed(() => {
    const r = this.row();
    return [
      { label: 'Input', value: fmt(r.input_tokens), hint: "Fresh, uncached tokens the API had to process for this request -- often small once a session's context is warm in the cache." },
      { label: 'Output', value: fmt(r.output_tokens), hint: 'Tokens Claude generated in its response.' },
      { label: 'Cache read', value: fmt(r.cache_read_tokens), hint: 'Tokens reused from cache: your system prompt, tool definitions, and earlier conversation history -- charged at a fraction of fresh-token cost. This is usually where a large total comes from, not a hidden input cost.' },
      { label: 'Cache write', value: fmt(r.cache_write_tokens), hint: 'Tokens newly written into the cache on this turn, for the next turn to read back cheaply.' },
      { label: 'Total', value: fmt(r.total_tokens), hint: 'Input + output + cache read + cache write -- exact, from the Claude API.' },
    ];
  });
}
