import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getUsageById } from '../api/usage';
import { Badge } from '../components/ui/Badge';
import { Tooltip } from '../components/ui/Tooltip';
import { IconInfo } from '../components/ui/Icons';
import { fmt, ago } from '../lib/format';
import { ErrorPanel } from './GlobalDashboard';

export function RequestFull() {
  const { id = '' } = useParams();
  const { data: row, loading, error } = useApi((signal) => getUsageById(id, signal), [id]);

  if (error) return <ErrorPanel message={error.message} />;
  if (loading || !row) return <div className="p-10 text-center text-ink-soft">Loading request…</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link to="/requests" className="text-sm text-accent-text hover:underline">
          ← Back to requests
        </Link>
      </div>

      <div className="flex items-start justify-between gap-5 flex-wrap">
        <div>
          <div className="text-accent-text text-[11px] font-extrabold uppercase tracking-wide">Full transcript</div>
          <h1 className="text-[27px] font-extrabold tracking-tight mt-1 mb-1.5">
            Request · {row.session_id.slice(0, 12)}
          </h1>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <Badge tone="accent">{row.model || '—'}</Badge>
            <Badge>{row.client || '—'}</Badge>
            <Badge>{row.project || '—'}</Badge>
            <span className="text-ink-soft text-xs">{ago(row.event_time)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric
          label="Input"
          value={fmt(row.input_tokens)}
          hint="Fresh, uncached tokens the API had to process for this request -- often small once a session's context is warm in the cache."
        />
        <Metric label="Output" value={fmt(row.output_tokens)} hint="Tokens the model generated in its response." />
        <Metric
          label="Cache read"
          value={fmt(row.cache_read_tokens)}
          hint="Tokens reused from cache: your system prompt, tool definitions, and earlier conversation history -- charged at a fraction of fresh-token cost. This is usually where a large total comes from, not a hidden input cost."
        />
        <Metric
          label="Cache write"
          value={fmt(row.cache_write_tokens)}
          hint="Tokens newly written into the cache on this turn, for the next turn to read back cheaply."
        />
        <Metric
          label="Total"
          value={fmt(row.total_tokens)}
          hint="Input + output + cache read + cache write -- exact, as reported by the agent."
        />
      </div>

      <ContextBreakdown row={row} />

      <div className="bg-surface border border-line rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide font-bold text-ink-soft">Full prompt</div>
          <CopyButton text={row.prompt_full || row.prompt_preview || ''} />
        </div>
        <p className="text-xs text-ink-soft mb-2">
          Every user message and tool result since this session's last reply, in order. The system prompt and tool
          definitions aren't shown here -- agents don't write them to their session logs -- but their exact token cost
          is fully accounted for above, under Cache read/write.
        </p>
        <pre className="bg-surface-code text-slate-300 rounded-lg p-4 text-xs whitespace-pre-wrap break-words leading-relaxed max-h-[60vh] overflow-y-auto">
          {row.prompt_full ||
            row.prompt_preview ||
            '(No new user message or tool result before this reply -- likely one step in a multi-tool sequence within the same turn.)'}
        </pre>
      </div>

      <div className="bg-surface border border-line rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide font-bold text-ink-soft">Full response</div>
          <CopyButton text={row.response_full || row.response_preview || ''} />
        </div>
        <pre className="bg-surface-code text-slate-300 rounded-lg p-4 text-xs whitespace-pre-wrap break-words leading-relaxed max-h-[60vh] overflow-y-auto">
          {row.response_full || row.response_preview || '(no response captured)'}
        </pre>
      </div>

      <div className="text-xs text-ink-soft">
        Session id: <span className="font-mono">{row.session_id}</span> · Event time: {row.event_time || '—'}
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface-muted rounded-lg p-3">
      <div className="flex items-center gap-1 text-[11px] text-ink-soft">
        <span>{label}</span>
        {hint && (
          <Tooltip label={hint}>
            <IconInfo className="text-ink-soft/70 hover:text-ink-soft shrink-0" width={12} height={12} />
          </Tooltip>
        )}
      </div>
      <div className="font-bold text-base">{value}</div>
    </div>
  );
}

const CONTEXT_SEGMENTS: {
  key: 'cache_read_tokens' | 'cache_write_tokens' | 'input_tokens' | 'output_tokens';
  label: string;
  color: string;
}[] = [
  { key: 'cache_read_tokens', label: 'Cache read (reused system prompt, tools, history)', color: 'bg-accent' },
  { key: 'cache_write_tokens', label: 'Cache write (newly cached this turn)', color: 'bg-info' },
  { key: 'input_tokens', label: 'Fresh input', color: 'bg-success' },
  { key: 'output_tokens', label: 'Model response', color: 'bg-warning' },
];

function ContextBreakdown({
  row,
}: {
  row: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    total_tokens: number;
  };
}) {
  const total = row.total_tokens || 1;
  const dominant = CONTEXT_SEGMENTS.reduce((a, b) => (row[a.key] >= row[b.key] ? a : b));

  return (
    <div className="bg-surface border border-line rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wide font-bold text-ink-soft mb-1">Where did these tokens go?</div>
      <p className="text-xs text-ink-soft mb-3">
        {row[dominant.key] > 0 ? (
          <>
            <b className="text-ink">{dominant.label}</b> makes up the largest share of this request's{' '}
            {fmt(row.total_tokens)} total tokens ({Math.round((row[dominant.key] / total) * 100)}%).{' '}
            {dominant.key === 'cache_read_tokens' &&
              "That's expected in a long session -- it's your system prompt, tool definitions, and prior conversation being reused from cache, not reprocessed from scratch."}
          </>
        ) : (
          'No token usage recorded for this request.'
        )}
      </p>
      <div className="flex h-3 rounded-full overflow-hidden bg-line">
        {CONTEXT_SEGMENTS.map((seg) => {
          const pct = (row[seg.key] / total) * 100;
          return pct > 0 ? (
            <div
              key={seg.key}
              className={seg.color}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${fmt(row[seg.key])}`}
            />
          ) : null;
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        {CONTEXT_SEGMENTS.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            <span className={`w-2 h-2 rounded-full shrink-0 ${seg.color}`} />
            <span className="truncate">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard?.writeText(text)}
      className="text-[11px] font-semibold text-accent-text hover:underline"
    >
      Copy
    </button>
  );
}
