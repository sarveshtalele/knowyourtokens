import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="py-16 text-center space-y-3">
      <p className="text-sm font-semibold text-accent-text">404</p>
      <h1 className="text-2xl font-bold text-ink">Page not found</h1>
      <p className="text-ink-soft">That page doesn't exist in this dashboard.</p>
      <Link to="/" className="inline-block text-accent-text font-semibold hover:underline">
        Back to the dashboard
      </Link>
    </div>
  );
}
