import { AfterViewInit, Component, Directive, ElementRef, OnDestroy, computed, input, signal, viewChild } from '@angular/core';
import { fmt } from '../lib/format';

/**
 * Ports of components/charts/*.tsx. recharts is React-only, so the charts are rewritten as plain SVG (dependency
 * status REWRITE). The frame is recharts' own, measured from the source's DOM: a `recharts-responsive-container`
 * of the same height, and the same plot area (margins, a 60px Y axis, the X axis height) -- with no data recharts
 * draws nothing but that frame, which is what the empty state must match exactly. With data, the same plot area
 * holds bars / a line / a pie; that rendering is not pixel-identical to recharts (a documented, accepted gap).
 */

const AXIS_TICK = 'fill: rgb(var(--color-ink-soft)); font-size: 11px;';

function niceMax(max: number): number {
  if (max <= 0) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step * 4 >= max) return m * step * 4;
  return max;
}

/** Width tracking of the responsive container, like recharts' ResponsiveContainer. */
@Directive()
abstract class ChartBase implements AfterViewInit, OnDestroy {
  readonly box = viewChild.required<ElementRef<HTMLDivElement>>('box');
  readonly width = signal(0);
  private ro?: ResizeObserver;
  ngAfterViewInit() {
    const el = this.box().nativeElement;
    this.width.set(Math.round(el.getBoundingClientRect().width));
    this.ro = new ResizeObserver(() => this.width.set(Math.round(el.getBoundingClientRect().width)));
    this.ro.observe(el);
  }
  ngOnDestroy() {
    this.ro?.disconnect();
  }
}

/** Bars on a category axis (TokenBarChart / ToolUsageChart share this). */
function bars(data: { label: string; value: number }[], w: number, h: number, m: { top: number; right: number; left: number; bottom: number }, xAxisH: number, maxLabel: number) {
  const x0 = m.left + 60;
  const x1 = w - m.right;
  const y0 = m.top;
  const y1 = h - m.bottom - xAxisH;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const band = data.length ? (x1 - x0) / data.length : 0;
  const barW = band * 0.8;
  const ticks = [0, 1, 2, 3, 4].map((i) => ({ v: (max / 4) * i, y: y1 - ((y1 - y0) * i) / 4 }));
  return {
    x0, x1, y0, y1, ticks,
    bars: data.map((d, i) => {
      const bh = ((y1 - y0) * d.value) / max;
      const label = d.label.length > maxLabel ? `${d.label.slice(0, maxLabel - 1)}…` : d.label;
      return { x: x0 + band * i + (band - barW) / 2, y: y1 - bh, w: barW, h: bh, cx: x0 + band * i + band / 2, label };
    }),
  };
}

@Directive()
abstract class BarChartBase extends ChartBase {
  protected abstract readonly points: () => { label: string; value: number }[];
  protected abstract readonly H: number;
  protected abstract readonly maxLabel: number;
  readonly plot = computed(() => bars(this.points(), this.width(), this.H, { top: 5, right: 10, left: 10, bottom: 60 }, 80, this.maxLabel));
  fmtV = (v: number) => fmt(v);
  /** A bar with the source's radius [4, 4, 0, 0]. */
  barPath(b: { x: number; y: number; w: number; h: number }) {
    const r = Math.min(4, b.w / 2, b.h);
    return `M${b.x},${b.y + b.h}V${b.y + r}Q${b.x},${b.y} ${b.x + r},${b.y}H${b.x + b.w - r}Q${b.x + b.w},${b.y} ${b.x + b.w},${b.y + r}V${b.y + b.h}Z`;
  }
}

@Component({
  selector: 'div[ttTokenBarChart]',
  standalone: true,
  host: { class: 'bg-surface border border-line rounded-lg p-4' },
  template: `
  <h3 class="text-sm font-bold mb-4">{{ title() }}</h3>
  <div #box class="recharts-responsive-container" style="width: 100%; height: 320px; min-width: 0px;">
    @if (width() > 0) {
      <div class="recharts-wrapper" [style]="'position: relative; cursor: default; width: 100%; height: 100%; max-height: 320px; max-width: ' + width() + 'px;'">
        <svg class="recharts-surface" [attr.width]="width()" height="320" [attr.viewBox]="'0 0 ' + width() + ' 320'" style="width: 100%; height: 100%;">
  @if (plot().bars.length) {
    <svg:g class="recharts-cartesian-axis recharts-yAxis">
      @for (t of plot().ticks; track t.v) {<svg:text [attr.x]="plot().x0 - 8" [attr.y]="t.y" text-anchor="end" dominant-baseline="middle" style="fill: rgb(var(--color-ink-soft)); font-size: 11px;">{{ fmtV(t.v) }}</svg:text>}
    </svg:g>
    <svg:g class="recharts-cartesian-axis recharts-xAxis">
      @for (b of plot().bars; track $index) {<svg:text [attr.transform]="'rotate(-40 ' + b.cx + ' ' + (plot().y1 + 12) + ')'" [attr.x]="b.cx" [attr.y]="plot().y1 + 12" text-anchor="end" style="fill: rgb(var(--color-ink-soft)); font-size: 11px;">{{ b.label }}</svg:text>}
    </svg:g>
    @for (b of plot().bars; track $index) {<svg:path [attr.d]="barPath(b)" fill="#6D5EF7" />}
  }
</svg>
      </div>
    }
  </div>
`,
})
export class TokenBarChartComponent extends BarChartBase {
  readonly data = input.required<{ project: string; total_tokens: number }[]>();
  readonly title = input('Usage by project');
  protected readonly H = 320;
  protected readonly maxLabel = 16;
  protected readonly points = () => this.data().map((d) => ({ label: d.project, value: d.total_tokens }));
}

@Component({
  selector: 'div[ttToolUsageChart]',
  standalone: true,
  host: { class: 'bg-surface border border-line rounded-lg p-4' },
  template: `
  <h3 class="text-sm font-bold mb-4">{{ title() }}</h3>
  <div #box class="recharts-responsive-container" style="width: 100%; height: 300px; min-width: 0px;">
    @if (width() > 0) {
      <div class="recharts-wrapper" [style]="'position: relative; cursor: default; width: 100%; height: 100%; max-height: 300px; max-width: ' + width() + 'px;'">
        <svg class="recharts-surface" [attr.width]="width()" height="300" [attr.viewBox]="'0 0 ' + width() + ' 300'" style="width: 100%; height: 100%;">
  @if (plot().bars.length) {
    <svg:g class="recharts-cartesian-axis recharts-yAxis">
      @for (t of plot().ticks; track t.v) {<svg:text [attr.x]="plot().x0 - 8" [attr.y]="t.y" text-anchor="end" dominant-baseline="middle" style="fill: rgb(var(--color-ink-soft)); font-size: 11px;">{{ fmtV(t.v) }}</svg:text>}
    </svg:g>
    <svg:g class="recharts-cartesian-axis recharts-xAxis">
      @for (b of plot().bars; track $index) {<svg:text [attr.transform]="'rotate(-40 ' + b.cx + ' ' + (plot().y1 + 12) + ')'" [attr.x]="b.cx" [attr.y]="plot().y1 + 12" text-anchor="end" style="fill: rgb(var(--color-ink-soft)); font-size: 11px;">{{ b.label }}</svg:text>}
    </svg:g>
    @for (b of plot().bars; track $index) {<svg:path [attr.d]="barPath(b)" fill="#6D5EF7" />}
  }
</svg>
      </div>
    }
  </div>
`,
})
export class ToolUsageChartComponent extends BarChartBase {
  readonly data = input.required<{ tool_name: string; call_count: number }[]>();
  readonly title = input('Tool call distribution');
  protected readonly H = 300;
  protected readonly maxLabel = 14;
  protected readonly points = () => this.data().slice(0, 12).map((d) => ({ label: d.tool_name, value: d.call_count }));
}

@Component({
  selector: 'div[ttTokenTrendChart]',
  standalone: true,
  host: { class: 'bg-surface border border-line rounded-lg p-4' },
  template: `
  <h3 class="text-sm font-bold mb-4">{{ title() }}</h3>
  <div #box class="recharts-responsive-container" style="width: 100%; height: 250px; min-width: 0px;">
    @if (width() > 0) {
      <div class="recharts-wrapper" [style]="'position: relative; cursor: default; width: 100%; height: 100%; max-height: 250px; max-width: ' + width() + 'px;'">
        <svg class="recharts-surface" [attr.width]="width()" height="250" [attr.viewBox]="'0 0 ' + width() + ' 250'" style="width: 100%; height: 100%;">
    @if (line().pts.length) {
      <svg:g class="recharts-cartesian-axis recharts-yAxis">
        @for (t of line().ticks; track t.v) {<svg:text [attr.x]="line().x0 - 8" [attr.y]="t.y" text-anchor="end" dominant-baseline="middle" style="fill: rgb(var(--color-ink-soft)); font-size: 11px;">{{ fmtV(t.v) }}</svg:text>}
      </svg:g>
      <svg:g class="recharts-cartesian-axis recharts-xAxis">
        @for (p of line().pts; track $index) {<svg:text [attr.x]="p.x" [attr.y]="line().y1 + 16" text-anchor="middle" style="fill: rgb(var(--color-ink-soft)); font-size: 11px;">{{ p.day }}</svg:text>}
      </svg:g>
      <svg:path [attr.d]="line().d" fill="none" stroke="#6D5EF7" stroke-width="2" />
    }
  </svg>
      </div>
    }
  </div>
`,
})
export class TokenTrendChartComponent extends ChartBase {
  readonly data = input.required<{ day: string; tokens: number }[]>();
  readonly title = input('Daily token volume');
  fmtV = (v: number) => fmt(v);
  readonly line = computed(() => {
    const sorted = [...this.data()].sort((a, b) => a.day.localeCompare(b.day));
    const w = this.width();
    const x0 = 65;
    const x1 = w - 5;
    const y0 = 5;
    const y1 = 250 - 5 - 30;
    const max = niceMax(Math.max(0, ...sorted.map((d) => d.tokens)));
    const step = sorted.length > 1 ? (x1 - x0) / (sorted.length - 1) : 0;
    const pts = sorted.map((d, i) => ({ day: d.day, x: sorted.length > 1 ? x0 + step * i : (x0 + x1) / 2, y: y1 - ((y1 - y0) * d.tokens) / max }));
    return {
      x0, y1, pts,
      ticks: [0, 1, 2, 3, 4].map((i) => ({ v: (max / 4) * i, y: y1 - ((y1 - y0) * i) / 4 })),
      d: pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(''),
    };
  });
}

const PIE_COLORS = ['#6D5EF7', '#2878C8', '#0F9D72', '#C27A12', '#C53D4B', '#a49cff'];

@Component({
  selector: 'div[ttCategoryPieChart]',
  standalone: true,
  host: { class: 'bg-surface border border-line rounded-lg p-4' },
  template: `
  <h3 class="text-sm font-bold mb-4">{{ title() }}</h3>
  <div #box class="recharts-responsive-container" style="width: 100%; height: 260px; min-width: 0px;">
    @if (width() > 0) {
      <div class="recharts-wrapper" [style]="'position: relative; cursor: default; width: 100%; height: 100%; max-height: 260px; max-width: ' + width() + 'px;'">
        <svg class="recharts-surface" [attr.width]="width()" height="260" [attr.viewBox]="'0 0 ' + width() + ' 260'" style="width: 100%; height: 100%;">
    @for (s of pie(); track $index) {
      <svg:path [attr.d]="s.d" [attr.fill]="s.color" stroke="rgb(var(--color-surface))" stroke-width="2" />
      <svg:text [attr.x]="s.lx" [attr.y]="s.ly" [attr.text-anchor]="s.anchor" [attr.fill]="s.color" style="font-size: 12px;">{{ s.label }}</svg:text>
    }
  </svg>
      </div>
    }
  </div>
`,
})
export class CategoryPieChartComponent extends ChartBase {
  readonly data = input.required<{ name: string; value: number }[]>();
  readonly title = input('Distribution');
  readonly pie = computed(() => {
    const data = this.data();
    const total = data.reduce((a, d) => a + d.value, 0) || 1;
    const cx = this.width() / 2;
    const cy = 130;
    const r = 90;
    let a0 = -Math.PI / 2;
    return data.map((d, i) => {
      const a1 = a0 + (2 * Math.PI * d.value) / total;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a: number, rr = r) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
      const [sx, sy] = p(a0);
      const [ex, ey] = p(a1);
      const mid = (a0 + a1) / 2;
      const [lx, ly] = p(mid, r + 20);
      a0 = a1;
      return {
        d: `M${cx},${cy}L${sx},${sy}A${r},${r} 0 ${large} 1 ${ex},${ey}Z`,
        color: PIE_COLORS[i % PIE_COLORS.length],
        lx, ly, anchor: lx > cx ? 'start' : 'end',
        label: `${d.name} ${Math.round((d.value / total) * 100)}%`,
      };
    });
  });
}
