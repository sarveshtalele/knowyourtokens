import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ConnectionBanner } from './ConnectionBanner';
import { LiveProvider } from '../../context/LiveContext';

export function AppLayout() {
  return (
    <LiveProvider>
      <div className="flex h-screen bg-canvas">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <ConnectionBanner />
          <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto p-7 focus:outline-hidden">
            <div className="max-w-app mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </LiveProvider>
  );
}
