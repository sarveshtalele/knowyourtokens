import { Component, computed, signal } from '@angular/core';
import { ApiResource } from '../lib/api-resource';
import { getMcpServers } from '../api/mcp';
import { getPlugins } from '../api/plugins';
import { ago, fmt } from '../lib/format';
import { PageHeadComponent, ErrorPanelComponent } from './page-head.component';
import { DataTableComponent, type Column } from '../data/data-table.component';
import { TabNavComponent } from '../ui/tab-nav.component';

/** Port of pages/McpPlugins.tsx. */
@Component({
  selector: 'tt-mcp-plugins',
  standalone: true,
  imports: [PageHeadComponent, ErrorPanelComponent, DataTableComponent, TabNavComponent],
  host: { style: 'display: contents' },
  template: `
    @if (error(); as err) {
      <div ttErrorPanel [message]="err.message"></div>
    } @else {
      <div class="space-y-6">
        <div ttPageHead eyebrow="Extension telemetry" title="MCP & Plugins" subtitle="MCP server activity, skill plugins, and Claude Code hook events."></div>
        <div ttTabNav [tabs]="tabs" [active]="tab()" (change)="tab.set($event)"></div>
        @if (tab() === 'MCP servers') {
          @if (mcp.loading()) {
            <div class="p-10 text-center text-ink-soft">Loading…</div>
          } @else {
            <div ttDataTable [columns]="mcpColumns" [data]="mcp.data() ?? []" emptyLabel="No MCP server activity recorded yet."></div>
          }
        }
        @if (tab() === 'Plugins & hooks') {
          @if (plugins.loading()) {
            <div class="p-10 text-center text-ink-soft">Loading…</div>
          } @else {
            <div class="space-y-6">
              <div class="bg-surface border border-line rounded-lg overflow-hidden"><div class="px-4 py-3 border-b border-line font-bold text-sm">Skill plugins</div><div ttDataTable [columns]="pluginColumns" [data]="plugins.data()?.plugins || []" emptyLabel="No plugin activity recorded yet."></div></div>
              <div class="bg-surface border border-line rounded-lg overflow-hidden"><div class="px-4 py-3 border-b border-line font-bold text-sm">Hook events</div><div ttDataTable [columns]="hookColumns" [data]="plugins.data()?.hooks || []" emptyLabel="No hook events recorded yet."></div></div>
            </div>
          }
        }
      </div>
    }
  `,
})
export class McpPluginsComponent {
  readonly tabs = ['MCP servers', 'Plugins & hooks'];
  readonly tab = signal('MCP servers');
  readonly mcp = new ApiResource(() => getMcpServers());
  readonly plugins = new ApiResource(() => getPlugins());
  readonly error = computed(() => this.mcp.error() || this.plugins.error());
  readonly mcpColumns: Column[] = [
    { key: 'server_name', label: 'Server' },
    { key: 'call_count', label: 'Calls', align: 'right', render: (v) => fmt(v as number) },
    { key: 'first_seen', label: 'First seen', render: (v) => String(v || '—') },
    { key: 'last_seen', label: 'Last seen', render: (v) => ago(v as string) },
  ];
  readonly pluginColumns: Column[] = [
    { key: 'plugin_name', label: 'Plugin' },
    { key: 'call_count', label: 'Calls', align: 'right', render: (v) => fmt(v as number) },
    { key: 'skills', label: 'Skills', align: 'right', render: (v) => fmt(v as number) },
    { key: 'last_used', label: 'Last used', render: (v) => ago(v as string) },
  ];
  readonly hookColumns: Column[] = [
    { key: 'hook_name', label: 'Hook' },
    { key: 'call_count', label: 'Calls', align: 'right', render: (v) => fmt(v as number) },
  ];
}
