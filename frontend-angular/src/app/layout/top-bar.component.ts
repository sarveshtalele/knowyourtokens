import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../ui/icon.component';
import { ThemeService } from '../lib/theme.service';
import { LiveService } from '../lib/live.service';
import { RouteService } from './route.service';

const LABELS: Record<string, string> = {
  projects: 'Projects',
  requests: 'Requests',
  tools: 'Tools',
  skills: 'Skills',
  sessions: 'Sessions',
  clients: 'Clients & IDEs',
  'mcp-plugins': 'MCP & Plugins',
  settings: 'Telemetry settings',
  about: 'About',
};

/** Port of components/Layout/TopBar.tsx on its real <header>. */
@Component({
  selector: 'header[ttTopBar]',
  standalone: true,
  imports: [RouterLink, IconComponent],
  host: { class: 'h-16 bg-surface/90 backdrop-blur border-b border-line flex items-center justify-between px-7 sticky top-0 z-10' },
  template: `
    <div class="flex items-center gap-2 text-sm text-ink-soft">
      <strong class="text-ink">Telemetry</strong>
      @if (parts().length === 0) {
        <span class="text-line">/</span><span class="font-semibold text-ink">Global</span>
      } @else {
        @for (p of parts(); track $index; let i = $index, last = $last) {
          <span class="flex items-center gap-2"><span class="text-line">/</span>@if (last) {<span class="font-semibold text-ink">{{ label(p) }}</span>} @else {<a [routerLink]="'/' + parts().slice(0, i + 1).join('/')" class="hover:text-ink">{{ label(p) }}</a>}</span>
        }
      }
    </div>
    <div class="flex items-center gap-2">
      <button (click)="theme.toggle()" [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" [attr.title]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" class="flex items-center justify-center border border-line bg-surface text-ink rounded-md w-9 h-9 hover:border-ink-soft">@if (theme.theme() === 'dark') {<svg ttIcon="sun"></svg>} @else {<svg ttIcon="moon"></svg>}</button>
      <button (click)="reload()" class="flex items-center gap-1.5 border border-line bg-surface text-ink rounded-md px-3 py-2 text-sm font-semibold hover:border-ink-soft"><svg ttIcon="refresh" [width]="14" [height]="14"></svg> Refresh</button>
      <span [attr.title]="live.connected() ? 'Connected — new data refreshes automatically as it arrives' : 'Not connected — reconnecting…'" [class]="'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold ' + (live.connected() ? 'bg-accent text-on-accent' : 'bg-surface-muted text-ink-soft border border-line')"><span [class]="'w-1.5 h-1.5 rounded-full ' + (live.connected() ? 'bg-on-accent animate-pulse' : 'bg-ink-soft')"></span>{{ live.connected() ? 'Live' : 'Reconnecting…' }}</span>
    </div>
  `,
})
export class TopBarComponent {
  readonly theme = inject(ThemeService);
  readonly live = inject(LiveService);
  private readonly route = inject(RouteService);
  readonly parts = computed(() => this.route.pathname().split('/').filter(Boolean));
  label = (p: string) => LABELS[p] || decodeURIComponent(p);
  reload = () => window.location.reload();
}
