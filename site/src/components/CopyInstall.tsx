import { useState } from 'react';

export function CopyInstall({ command = 'npx tokentelemetry' }: { command?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the command is still selectable */
    }
  }
  return (
    <div className="install mono">
      <span className="prompt" aria-hidden="true">
        $
      </span>
      <code>{command}</code>
      <button type="button" className="copy" onClick={copy} aria-label={`Copy "${command}"`}>
        <span aria-live="polite">{copied ? 'Copied ✓' : 'Copy'}</span>
      </button>
    </div>
  );
}
