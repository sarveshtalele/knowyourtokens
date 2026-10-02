import { useEffect, useRef, useState } from 'react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

const STEPS: Record<string, string[]> = {
  'safari-mac': [
    'In the Safari menu bar choose File → Add to Dock…',
    'Click Add. It opens in its own window and stays in your Dock.',
  ],
  ios: ['Tap the Share button', 'Choose “Add to Home Screen”'],
  firefox: [
    'Firefox can’t install web apps yet. Run `knowyourtokens shortcut` in a terminal instead:',
    'it creates a Desktop / Start Menu / Applications launcher you can pin.',
  ],
  other: [
    'Open the browser menu (⋮) and choose “Install Know Your Tokens” (or Apps → Install).',
    'Or run `knowyourtokens shortcut` in a terminal for a desktop launcher.',
  ],
};

function IconInstall() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4M12 7v6M9.5 10.5 12 13l2.5-2.5" />
    </svg>
  );
}

/** "Install app" → the dashboard as a standalone app you can pin to the Dock / taskbar. */
export function InstallAppButton() {
  const state = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (state.kind === 'installed') return null;

  const onClick = async () => {
    if (state.kind === 'prompt') {
      await state.install();
    } else {
      setOpen((o) => !o);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onClick}
        aria-expanded={state.kind === 'manual' ? open : undefined}
        title="Install as an app: pin it to your Dock or taskbar"
        className="flex items-center gap-1.5 border border-line bg-surface text-ink rounded-md px-3 py-2 text-sm font-semibold hover:border-ink-soft"
      >
        <IconInstall /> Install app
      </button>
      {open && state.kind === 'manual' && (
        <dialog
          open
          aria-label="How to install"
          className="absolute right-0 left-auto top-full m-0 mt-2 w-80 rounded-lg border border-line bg-surface text-ink p-4 shadow-xl text-sm z-20"
        >
          <p className="font-semibold text-ink mb-2">Use Know Your Tokens like an app</p>
          <ol className="list-decimal pl-5 space-y-1 text-ink-soft">
            {STEPS[state.platform].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-ink-soft">
            Then right-click the icon → <b>Keep in Dock</b> (macOS) or <b>Pin to taskbar</b> (Windows) /{' '}
            <b>Add to Favorites</b> (Linux).
          </p>
        </dialog>
      )}
    </div>
  );
}
