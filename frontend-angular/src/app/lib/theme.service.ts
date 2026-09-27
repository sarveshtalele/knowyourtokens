import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'theme';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Port of hooks/useTheme.ts. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(getInitialTheme());

  constructor() {
    effect(() => {
      const theme = this.theme();
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem(STORAGE_KEY, theme);
    });
    // The source's OS-preference listener checks localStorage AFTER its first effect has written the theme there,
    // so it never registers; mirrored by not registering one.
  }

  toggle() {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
