import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiResource } from '../lib/api-resource';
import { LiveService } from '../lib/live.service';
import { getProjects } from '../api/projects';
import { PageHeadComponent, ErrorPanelComponent } from './page-head.component';
import { ButtonComponent } from '../ui/button.component';
import { IconComponent } from '../ui/icon.component';
import { ProjectCardComponent } from './project-card.component';

/** Port of pages/ProjectsList.tsx. */
@Component({
  selector: 'tt-projects-list',
  standalone: true,
  imports: [RouterLink, PageHeadComponent, ErrorPanelComponent, ButtonComponent, IconComponent, ProjectCardComponent],
  host: { style: 'display: contents' },
  template: `
    @if (res.error(); as err) {
      <div ttErrorPanel [message]="err.message"></div>
    } @else if (res.loading() && projects().length === 0) {
      <div class="p-10 text-center text-ink-soft">Loading projects…</div>
    } @else {
      <div class="space-y-6">
        <div ttPageHead eyebrow="Inventory" title="Projects" subtitle="Every project is an independent telemetry scope with its own sessions, requests, tools and skills." [hasActions]="true"><button ttButton (click)="res.reload()" class="flex items-center gap-1.5"><svg ttIcon="refresh" [width]="14" [height]="14"></svg> Discover projects</button></div>
        <input [value]="q()" (input)="q.set($any($event.target).value)" placeholder="Search projects…" class="h-10 border border-line bg-surface rounded-md px-3 text-sm w-full max-w-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" />
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @if (filtered().length === 0) {
            <div class="col-span-full p-10 text-center text-ink-soft bg-surface border border-line rounded-lg">No projects match.</div>
          } @else {
            @for (p of filtered(); track p.project) {<a ttProjectCard [p]="p" [routerLink]="'/projects/' + enc(p.project)"></a>}
          }
        </div>
      </div>
    }
  `,
})
export class ProjectsListComponent {
  private readonly live = inject(LiveService);
  readonly res = new ApiResource(() => getProjects(), () => [this.live.version()]);
  readonly projects = computed(() => this.res.data() ?? []);
  readonly q = signal('');
  readonly filtered = computed(() => this.projects().filter((p) => p.project.toLowerCase().includes(this.q().toLowerCase())));
  enc = encodeURIComponent;
}
