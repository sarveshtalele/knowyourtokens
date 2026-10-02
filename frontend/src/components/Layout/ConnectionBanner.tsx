import { useEffect, useState } from 'react';
import { useLive } from '../../context/LiveContext';

/**
 * Honest "is this page actually current" indicator. The dashboard has no
 * polling of its own -- pages fetch once and rely on the /ws/live push (see
 * LiveContext) to know when to refetch. If that socket is down, nothing is
 * arriving automatically and the page could be showing stale numbers
 * without the user having any way to tell -- so say so, instead of letting
 * a disconnected "Live" badge imply otherwise.
 */
export function ConnectionBanner() {
  const { connected } = useLive();
  const [graceOver, setGraceOver] = useState(false);

  useEffect(() => {
    if (connected) return;
    // Grace period so a normal page-load reconnect blip doesn't flash a
    // banner every single navigation.
    const t = setTimeout(() => setGraceOver(true), 4000);
    return () => {
      clearTimeout(t);
      setGraceOver(false);
    };
  }, [connected]);

  if (connected || !graceOver) return null;

  return (
    <div
      role="alert"
      className="bg-warning-soft text-warning-text px-7 py-2 text-sm flex items-center justify-between gap-3"
    >
      <span>
        <b>Not connected to the telemetry backend.</b> New data won't load automatically until the connection is back —
        the numbers on screen may be out of date. Check <code className="font-mono">knowyourtokens status</code> if this
        doesn't clear on its own.
      </span>
      <button
        onClick={() => window.location.reload()}
        className="shrink-0 border border-warning rounded-md px-3 py-1 text-xs font-semibold hover:bg-surface"
      >
        Reload
      </button>
    </div>
  );
}
