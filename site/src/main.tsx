import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// The production build is prerendered (scripts/prerender.mjs) for crawlers
// and no-JS readers; hydrate that markup instead of replacing it.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
