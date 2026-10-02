import { Tooltip } from '../ui/Tooltip';
import { IconInfo } from '../ui/Icons';

interface Props {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'neutral';
  hint?: string;
}

export function MetricCard({ label, value, delta, trend = 'up', hint }: Props) {
  const trendColor = trend === 'up' ? 'text-success-text' : trend === 'down' ? 'text-danger-text' : 'text-ink-soft';
  return (
    <div className="bg-surface border border-line rounded-lg p-4 shadow-[0_2px_10px_rgba(15,23,42,.045)] min-h-[110px]">
      <div className="flex items-center gap-1.5 text-ink-soft font-semibold text-xs">
        <span>{label}</span>
        {hint && (
          <Tooltip label={hint}>
            <IconInfo className="text-ink-soft/70 hover:text-ink-soft shrink-0" />
          </Tooltip>
        )}
      </div>
      <div className="text-ink font-extrabold text-[26px] tracking-tight mt-2 mb-0.5">{value}</div>
      {delta && <div className={`text-xs font-semibold ${trendColor}`}>{delta}</div>}
    </div>
  );
}
