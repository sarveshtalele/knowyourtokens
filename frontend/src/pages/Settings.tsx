import { useApi } from '../hooks/useApi';
import { getSettings, triggerReconcile } from '../api/settings';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { fmt } from '../lib/format';
import { PageHead, ErrorPanel } from './GlobalDashboard';

export function Settings() {
  const { data: s, loading, error, reload } = useApi((signal) => getSettings(signal), []);
  if (error) return <ErrorPanel message={error.message} />;
  if (loading || !s) return <div className="p-10 text-center text-ink-soft">Loading settings…</div>;

  const handleReconcile = async () => {
    await triggerReconcile();
    reload();
  };

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Operations"
        title="Settings"
        subtitle="Collector, database, and integration status. Everything here stays on this machine."
        actions={
          <Button variant="primary" onClick={handleReconcile}>
            Reconcile now
          </Button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-line rounded-lg p-4">
          <div className="font-bold text-sm mb-3">Collector</div>
          <KV k="Version" v={s.version ? `v${s.version} · schema v${s.schema_version}` : '—'} />
          <KV k="Database" v={<span className="font-mono text-xs">{s.db_path}</span>} />
          <KV k="DB size" v={`${fmt(s.db_size)} bytes`} />
          <KV k="Poll interval" v={`${s.env.CLAUDE_TELEMETRY_INTERVAL || '5'} seconds`} />
          <KV k="Last reconcile" v={s.last_reconcile || '—'} />
        </div>
        <div className="bg-surface border border-line rounded-lg p-4">
          <div className="font-bold text-sm mb-3">Data semantics</div>
          <KV k="Request usage" v={<Badge tone="success">Exact</Badge>} />
          <KV k="Tool/path attribution" v={<Badge tone="warning">Estimated</Badge>} />
          <KV k="Skills" v={<Badge tone="info">Tracked</Badge>} />
        </div>
      </div>
      {s.exporters && (
        <div className="bg-surface border border-line rounded-lg p-4">
          <div className="font-bold text-sm mb-3">Integrations</div>
          {s.exporters.map((e) => (
            <KV
              key={e.name}
              k={e.name === 'otlp' ? 'OpenTelemetry (OTLP)' : 'Webhook'}
              v={
                e.enabled ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="success">On</Badge>
                    <span className="font-mono text-xs break-all">{e.target}</span>
                    <span className="text-ink-soft text-xs">{fmt(e.pending_rows)} rows pending</span>
                  </span>
                ) : (
                  <span className="text-ink-soft text-xs">
                    Off — set {e.name === 'otlp' ? 'KNOWYOURTOKENS_OTLP_ENDPOINT' : 'KNOWYOURTOKENS_WEBHOOK_URL'} to
                    enable
                  </span>
                )
              }
            />
          ))}
        </div>
      )}
      <div className="bg-surface border border-line rounded-lg p-4">
        <div className="font-bold text-sm mb-3">Table counts</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(s.table_counts).map(([k, v]) => (
            <div key={k} className="bg-surface-muted rounded-lg p-3.5">
              <div className="text-ink-soft text-[11px]">{k}</div>
              <div className="font-extrabold text-lg">{fmt(v)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-line last:border-0 text-sm">
      <span className="text-ink-soft">{k}</span>
      <span>{v}</span>
    </div>
  );
}
