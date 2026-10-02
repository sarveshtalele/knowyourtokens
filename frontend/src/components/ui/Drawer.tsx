import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconClose } from './Icons';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Drawer({ open, title, onClose, children }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close panel"
        tabIndex={-1}
        className="absolute inset-0 bg-black/40 cursor-default"
        onClick={onClose}
      />
      <dialog
        open
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute right-0 left-auto top-0 m-0 p-0 border-0 max-h-none h-full w-full max-w-[620px] text-ink bg-surface shadow-[-16px_0_50px_rgba(15,23,42,.16)] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-surface z-10">
          <strong id={titleId} className="text-sm">
            {title}
          </strong>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-md hover:bg-surface-muted text-ink-soft"
          >
            <IconClose />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </dialog>
    </div>
  );
}
