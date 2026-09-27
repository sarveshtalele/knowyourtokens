import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout.component';
import { DashboardComponent } from './pages/dashboard.component';
import { ProjectsListComponent } from './pages/projects-list.component';
import { ProjectDetailComponent } from './pages/project-detail.component';
import { RequestsComponent } from './pages/requests.component';
import { RequestFullComponent } from './pages/request-full.component';
import { AboutComponent } from './pages/about.component';
import { ToolsComponent } from './pages/tools.component';
import { SkillsComponent } from './pages/skills.component';
import { SessionsComponent } from './pages/sessions.component';
import { ClientsComponent } from './pages/clients.component';
import { McpPluginsComponent } from './pages/mcp-plugins.component';
import { ReportsComponent } from './pages/reports.component';
import { SettingsComponent } from './pages/settings.component';

/** Port of App.tsx's route table (a layout route with every page as a child). */
export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', component: DashboardComponent, pathMatch: 'full' },
      { path: 'projects', component: ProjectsListComponent },
      { path: 'projects/:id', component: ProjectDetailComponent },
      { path: 'requests', component: RequestsComponent },
      { path: 'requests/:id', component: RequestFullComponent },
      { path: 'about', component: AboutComponent },
      { path: 'tools', component: ToolsComponent },
      { path: 'skills', component: SkillsComponent },
      { path: 'sessions', component: SessionsComponent },
      { path: 'clients', component: ClientsComponent },
      { path: 'mcp-plugins', component: McpPluginsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'settings', component: SettingsComponent },
    ],
  },
];
