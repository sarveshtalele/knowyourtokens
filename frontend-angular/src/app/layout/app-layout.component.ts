import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopBarComponent } from './top-bar.component';
import { ConnectionBannerComponent } from './connection-banner.component';

/** Port of components/Layout/AppLayout.tsx (LiveProvider = the root LiveService). */
@Component({
  selector: 'tt-app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopBarComponent, ConnectionBannerComponent],
  host: { style: 'display: contents' },
  template: `<div class="flex h-screen bg-canvas"><aside ttSidebar></aside><div class="flex-1 flex flex-col min-w-0"><header ttTopBar></header><tt-connection-banner /><main class="flex-1 overflow-y-auto p-7"><div class="max-w-app mx-auto w-full"><router-outlet /></div></main></div></div>`,
})
export class AppLayoutComponent {}
