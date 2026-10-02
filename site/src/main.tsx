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

// Inertial smooth scrolling (skipped when the visitor prefers reduced motion).
// Lenis drives the native scroll position, so framer-motion's useScroll and
// sticky sections keep working unchanged.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  void import('lenis').then(({ default: Lenis }) => {
    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 0.9,
      anchors: { offset: -64 },
    });
    const raf = (t: number) => {
      lenis.raf(t);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  });
}
