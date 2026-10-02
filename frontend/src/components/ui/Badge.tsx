type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const TONE_CLASSES: Record<Tone, string> = {
  default: 'bg-surface-muted text-ink-soft',
  success: 'bg-success-soft text-success-text',
  warning: 'bg-warning-soft text-warning-text',
  danger: 'bg-danger-soft text-danger-text',
  info: 'bg-info-soft text-info-text',
  accent: 'bg-accent-soft text-accent-text',
};

export function Badge({ tone = 'default', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
