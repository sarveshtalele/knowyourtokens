import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/Layout/AppLayout';

// One chunk per page: the dashboard loads first, the rest on navigation.
const GlobalDashboard = lazy(() => import('./pages/GlobalDashboard').then((m) => ({ default: m.GlobalDashboard })));
const ProjectsList = lazy(() => import('./pages/ProjectsList').then((m) => ({ default: m.ProjectsList })));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then((m) => ({ default: m.ProjectDetail })));
const Requests = lazy(() => import('./pages/Requests').then((m) => ({ default: m.Requests })));
const RequestFull = lazy(() => import('./pages/RequestFull').then((m) => ({ default: m.RequestFull })));
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));
const Tools = lazy(() => import('./pages/Tools').then((m) => ({ default: m.Tools })));
const Skills = lazy(() => import('./pages/Skills').then((m) => ({ default: m.Skills })));
const Sessions = lazy(() => import('./pages/Sessions').then((m) => ({ default: m.Sessions })));
const Clients = lazy(() => import('./pages/Clients').then((m) => ({ default: m.Clients })));
const McpPlugins = lazy(() => import('./pages/McpPlugins').then((m) => ({ default: m.McpPlugins })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Calculator = lazy(() => import('./pages/Calculator').then((m) => ({ default: m.Calculator })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

function PageFallback() {
  return (
    <p aria-live="polite" className="p-8 text-sm text-ink-soft">
      Loading…
    </p>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<GlobalDashboard />} />
            <Route path="/projects" element={<ProjectsList />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/requests/:id" element={<RequestFull />} />
            <Route path="/about" element={<About />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/mcp-plugins" element={<McpPlugins />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
