import { motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { IconGithub, IconMoon, IconSun, Logo } from './Icons';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  mq.addEventListener('change', onChange);
  return () => {
    mo.disconnect();
    mq.removeEventListener('change', onChange);
  };
}

/** Theme lives on <html data-theme> (set before paint by an inline script in index.html). */
function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, currentTheme, () => 'dark');
  const toggle = () => {
    const next: Theme = currentTheme() === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('tt-theme', next);
    } catch {
      /* storage blocked: the choice still applies for this visit */
    }
  };
  return { theme, toggle };
}

export function Nav() {
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`} aria-label="Primary">
      <motion.div
        aria-hidden="true"
        style={{
          scaleX: progress,
          transformOrigin: '0 50%',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -1,
          height: 2,
          background: 'linear-gradient(90deg, var(--accent), var(--accent-3), var(--accent-2))',
        }}
      />
      <div className="wrap nav-inner">
        <a className="brand" href="#top">
          <Logo /> Token Telemetry
        </a>
        <div className="nav-links">
          <a href="#demo">Demo</a>
          <a href="#workflows">Workflows</a>
          <a href="#for-you">For you</a>
          <a href="#app">App</a>
          <a href="#integrations">Integrations</a>
          <a href="#specs">Specs</a>
        </div>
        <div className="nav-spacer" />
        <button
          type="button"
          className="icon-btn"
          onClick={toggle}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        >
          {theme === 'light' ? <IconMoon /> : <IconSun />}
        </button>
        <a className="btn btn-sm btn-pill" href="#install">
          Install
        </a>
        <a className="btn btn-sm" href="https://github.com/sarveshtalele/tokentelemetry">
          <IconGithub /> <span className="label">GitHub</span>
        </a>
      </div>
    </nav>
  );
}
