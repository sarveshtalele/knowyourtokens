import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../ui/icon.component';
import { RouteService } from './route.service';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/projects', label: 'Projects', icon: 'folder' },
  { to: '/requests', label: 'Requests', icon: 'list' },
  { to: '/tools', label: 'Tools', icon: 'wrench' },
  { to: '/skills', label: 'Skills', icon: 'bolt' },
  { to: '/sessions', label: 'Sessions', icon: 'chat' },
  { to: '/clients', label: 'Clients', icon: 'monitor' },
  { to: '/mcp-plugins', label: 'MCP & Plugins', icon: 'plug' },
  { to: '/reports', label: 'Reports', icon: 'download' },
  { to: '/about', label: 'About', icon: 'about' },
];

/** Port of components/Layout/Sidebar.tsx on its real <aside>. NavLink's active rule: exact for "/", prefix otherwise. */
@Component({
  selector: 'aside[ttSidebar]',
  standalone: true,
  imports: [RouterLink, IconComponent],
  host: { '[class]': "(expanded() ? 'w-60' : 'w-[76px]') + ' bg-[#0f172a] text-slate-300 h-screen flex flex-col transition-all duration-200 shrink-0'" },
  template: `
    <div class="flex items-center gap-3 px-4 h-16 border-b border-slate-800">
      <span class="w-8 h-8 rounded-md bg-accent grid place-items-center text-white font-bold text-sm shrink-0">CT</span>
      @if (expanded()) {<span class="font-bold text-white truncate">Telemetry</span>}
      <button (click)="expanded.set(!expanded())" class="ml-auto text-slate-400 hover:text-white grid place-items-center w-7 h-7 rounded hover:bg-slate-800" [attr.aria-label]="expanded() ? 'Minimize sidebar' : 'Expand sidebar'" [attr.title]="expanded() ? 'Minimize sidebar' : 'Expand sidebar'">@if (expanded()) {<svg ttIcon="chevronLeft"></svg>} @else {<svg ttIcon="chevronRight"></svg>}</button>
    </div>
    <nav class="flex-1 py-2 overflow-y-auto">
      @for (item of items; track item.to) {
        <a [routerLink]="item.to" [attr.aria-current]="isActive(item.to) ? 'page' : null" [attr.title]="!expanded() ? item.label : null" [class]="'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ' + (isActive(item.to) ? 'bg-accent-soft text-accent-strong font-semibold border-r-2 border-accent' : 'text-slate-400 hover:bg-slate-800 hover:text-white')"><svg [ttIcon]="item.icon" class="shrink-0"></svg>@if (expanded()) {<span class="truncate">{{ item.label }}</span>}</a>
      }
    </nav>
    <div class="border-t border-slate-800 px-2 py-1">
      <a routerLink="/settings" [attr.aria-current]="isActive('/settings') ? 'page' : null" [attr.title]="!expanded() ? 'Settings' : null" [class]="'flex items-center gap-3 px-2 py-2.5 text-sm rounded-md transition-colors ' + (isActive('/settings') ? 'text-accent-strong font-semibold' : 'text-slate-400 hover:text-white')"><svg ttIcon="settings" class="shrink-0 ml-1.5"></svg>@if (expanded()) {<span class="truncate">Settings</span>}</a>
    </div>
    @if (expanded()) {
      <div class="px-4 py-3 text-[11px] text-slate-500 border-t border-slate-800">Local-first · SQLite<br />Telemetry v5 compatible</div>
    }
  `,
})
export class SidebarComponent {
  private readonly route = inject(RouteService);
  readonly items = NAV_ITEMS;
  readonly expanded = signal(this.initial());

  constructor() {
    effect(() => localStorage.setItem('sidebar-expanded', String(this.expanded())));
  }

  private initial(): boolean {
    const stored = localStorage.getItem('sidebar-expanded');
    if (stored !== null) return stored !== 'false';
    return window.innerWidth >= 1024;
  }

  readonly isActive = (to: string) => {
    const path = this.route.pathname().replace(/\/+$/, '') || '/';
    return to === '/' ? path === '/' : path === to || path.startsWith(to + '/');
  };
}
