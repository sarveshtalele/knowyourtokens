import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getMcpServers } from '../api/mcp';
import { getPlugins } from '../api/plugins';
import { DataTable } from '../components/data/DataTable';
import { TabNav } from '../components/ui/TabNav';
import { fmt, ago } from '../lib/format';
import { PageHead, ErrorPanel } from './GlobalDashboard';

const TABS = ['MCP servers', 'Plugins & hooks'];

export function McpPlugins() {
  const [tab, setTab] = useState('MCP servers');
  const { data: mcp = [], loading: loadingMcp, error: errMcp } = useApi((signal) => getMcpServers(signal), []);
  const { data: plugins, loading: loadingPlugins, error: errPlugins } = useApi((signal) => getPlugins(signal), []);

  const error = errMcp || errPlugins;
  if (error) return <ErrorPanel message={error.message} />;

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Extension telemetry"
        title="MCP & Plugins"
        subtitle="MCP server activity, skill plugins, and Claude Code hook events."
      />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'MCP servers' &&
        (loadingMcp ? (
          <div className="p-10 text-center text-ink-soft">Loading…</div>
        ) : (
          <DataTable
            columns={[
              { key: 'server_name', label: 'Server' },
              { key: 'call_count', label: 'Calls', align: 'right', render: (v) => fmt(v as number) },
              { key: 'first_seen', label: 'First seen', render: (v) => String(v || '—') },
              { key: 'last_seen', label: 'Last seen', render: (v) => ago(v as string) },
            ]}
            data={mcp}
            emptyLabel="No MCP server activity recorded yet."
          />
        ))}

      {tab === 'Plugins & hooks' &&
        (loadingPlugins ? (
          <div className="p-10 text-center text-ink-soft">Loading…</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-surface border border-line rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-line font-bold text-sm">Skill plugins</div>
              <DataTable
                columns={[
                  { key: 'plugin_name', label: 'Plugin' },
                  { key: 'call_count', label: 'Calls', align: 'right', render: (v) => fmt(v as number) },
                  { key: 'skills', label: 'Skills', align: 'right', render: (v) => fmt(v as number) },
                  { key: 'last_used', label: 'Last used', render: (v) => ago(v as string) },
                ]}
                data={plugins?.plugins || []}
                emptyLabel="No plugin activity recorded yet."
              />
            </div>
            <div className="bg-surface border border-line rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-line font-bold text-sm">Hook events</div>
              <DataTable
                columns={[
                  { key: 'hook_name', label: 'Hook' },
                  { key: 'call_count', label: 'Calls', align: 'right', render: (v) => fmt(v as number) },
                ]}
                data={plugins?.hooks || []}
                emptyLabel="No hook events recorded yet."
              />
            </div>
          </div>
        ))}
    </div>
  );
}
