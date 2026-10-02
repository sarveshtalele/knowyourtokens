import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState =
  | { kind: 'installed' }
  | { kind: 'prompt'; install: () => Promise<boolean> }
  | { kind: 'manual'; platform: 'safari-mac' | 'ios' | 'firefox' | 'other' };

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function manualPlatform(): 'safari-mac' | 'ios' | 'firefox' | 'other' {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return 'safari-mac';
  return 'other';
}

/**
 * "Install as an app" support. Chromium browsers (Chrome, Edge, Brave, Arc)
 * fire `beforeinstallprompt`, which we hold on to and replay from a button;
 * Safari and Firefox need manual steps, which the UI explains.
 */
export function useInstallPrompt(): InstallState {
  const [state, setState] = useState<InstallState>(() =>
    isStandalone() ? { kind: 'installed' } : { kind: 'manual', platform: manualPlatform() },
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setState({
        kind: 'prompt',
        install: async () => {
          await evt.prompt();
          const { outcome } = await evt.userChoice;
          return outcome === 'accepted';
        },
      });
    };
    const onInstalled = () => setState({ kind: 'installed' });
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return state;
}
