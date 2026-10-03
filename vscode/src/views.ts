// The four sidebar views: Overview, Projects, Sessions and Recent requests.
import * as vscode from 'vscode';
import { Summary } from './api';
import { formatTokens, percent, timeAgo } from './format';
import { Store } from './store';

/** What "Open in Dashboard" needs to know about a row. */
export interface OpenTarget {
  kind: 'project' | 'request' | 'session' | 'page';
  id?: string;
  path?: string;
}

class Item extends vscode.TreeItem {
  constructor(
    label: string,
    opts: {
      description?: string;
      tooltip?: string | vscode.MarkdownString;
      icon?: string;
      contextValue?: string;
      target?: OpenTarget;
    } = {},
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = opts.description;
    this.tooltip = opts.tooltip;
    if (opts.icon) this.iconPath = new vscode.ThemeIcon(opts.icon);
    this.contextValue = opts.contextValue;
    if (opts.target) {
      this.command = { command: 'knowyourtokens.openItem', title: 'Open in Dashboard', arguments: [opts.target] };
    }
  }
}

abstract class View implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;

  constructor(protected readonly store: Store) {
    store.onDidChange(() => this.changed.fire());
  }

  getTreeItem(item: vscode.TreeItem): vscode.TreeItem {
    return item;
  }

  getChildren(): vscode.TreeItem[] {
    // Not connected: the Overview shows its welcome view (Start / Install); the others stay empty.
    if (!this.store.connected) return [];
    return this.items();
  }

  protected abstract items(): vscode.TreeItem[];
}

function totals(label: string, s: Summary | undefined, icon: string): Item {
  if (!s) return new Item(label, { description: 'no data', icon });
  const tip = new vscode.MarkdownString(
    `**${label}: ${s.total_tokens.toLocaleString()} tokens** in ${s.total_requests.toLocaleString()} requests\n\n` +
      `| | tokens |\n|---|---:|\n` +
      `| Input | ${s.input_tokens.toLocaleString()} |\n` +
      `| Output | ${s.output_tokens.toLocaleString()} |\n` +
      `| Cache read | ${s.cache_read_tokens.toLocaleString()} |\n` +
      `| Cache write | ${s.cache_write_tokens.toLocaleString()} |`,
  );
  return new Item(label, {
    description: `${formatTokens(s.total_tokens)} tokens · ${s.total_requests.toLocaleString()} requests`,
    tooltip: tip,
    icon,
    target: { kind: 'page', path: '/' },
  });
}

export class OverviewView extends View {
  protected items(): vscode.TreeItem[] {
    const { today, week, all, updatedAt } = this.store.data;
    const rows: vscode.TreeItem[] = [
      totals('Today', today, 'calendar'),
      totals('Last 7 days', week, 'history'),
      totals('All time', all, 'graph'),
    ];
    if (all) {
      const cache = all.cache_read_tokens;
      rows.push(
        new Item('Cache reads', {
          description: `${percent(cache, all.total_tokens)} of all tokens`,
          tooltip: 'Reused context. A high share is healthy: cached tokens cost a fraction of fresh input.',
          icon: 'database',
        }),
        new Item('Top model', { description: all.top_model || 'n/a', icon: 'hubot' }),
        new Item('Top agent', { description: all.top_client || 'n/a', icon: 'device-desktop' }),
        new Item('Average per request', { description: `${formatTokens(all.avg_tokens_per_request)} tokens`, icon: 'symbol-numeric' }),
      );
    }
    rows.push(
      new Item('Open the full dashboard', {
        description: this.store.dashboardUrl.replace('http://', ''),
        icon: 'link-external',
        target: { kind: 'page', path: '/' },
      }),
    );
    if (updatedAt) rows.push(new Item(`Updated ${timeAgo(updatedAt.toISOString())}`, { icon: 'clock' }));
    return rows;
  }
}

export class ProjectsView extends View {
  protected items(): vscode.TreeItem[] {
    const projects = [...this.store.data.projects].sort((a, b) => b.total_tokens - a.total_tokens);
    if (!projects.length) return [new Item('No projects yet', { description: 'use an agent, then refresh', icon: 'info' })];
    return projects.map(
      (p) =>
        new Item(p.project, {
          description: `${formatTokens(p.total_tokens)} · ${p.requests.toLocaleString()} requests`,
          tooltip: new vscode.MarkdownString(
            `**${p.project}**\n\n${p.total_tokens.toLocaleString()} tokens · ${p.requests.toLocaleString()} requests · ` +
              `${p.sessions.toLocaleString()} sessions\n\nLast activity: ${p.last_activity ? timeAgo(p.last_activity) : 'n/a'}\n\n\`${p.project_key}\``,
          ),
          icon: 'folder',
          contextValue: 'kyt-project',
          target: { kind: 'project', id: p.project },
        }),
    );
  }
}

export class SessionsView extends View {
  protected items(): vscode.TreeItem[] {
    const sessions = this.store.data.sessions;
    if (!sessions.length) return [new Item('No sessions yet', { icon: 'info' })];
    return sessions.map(
      (s) =>
        new Item(`${s.project} · ${s.client}`, {
          description: `${formatTokens(s.total_tokens)} · ${s.interactions} req · ${timeAgo(s.last_active)}`,
          tooltip: new vscode.MarkdownString(
            `**${s.project}** with ${s.client}\n\nModel: ${s.model}\n\n${s.total_tokens.toLocaleString()} tokens over ${s.interactions} requests\n\n` +
              `Started ${timeAgo(s.started_at)}, last active ${timeAgo(s.last_active)}\n\n\`${s.session_id}\``,
          ),
          icon: 'comment-discussion',
          contextValue: 'kyt-session',
          target: { kind: 'session', id: s.session_id },
        }),
    );
  }
}

export class RequestsView extends View {
  protected items(): vscode.TreeItem[] {
    const rows = this.store.data.requests;
    if (!rows.length) return [new Item('No requests yet', { icon: 'info' })];
    return rows.map((r) => {
      const tip = new vscode.MarkdownString(
        `**${r.total_tokens.toLocaleString()} tokens** · ${r.model} · ${r.client}\n\n` +
          `Input ${r.input_tokens.toLocaleString()} · Output ${r.output_tokens.toLocaleString()} · ` +
          `Cache read ${r.cache_read_tokens.toLocaleString()} · Cache write ${r.cache_write_tokens.toLocaleString()}\n\n` +
          `${r.project} · ${new Date(r.event_time).toLocaleString()}`,
      );
      if (r.prompt_preview) {
        tip.appendMarkdown('\n\n---\n\n');
        tip.appendText(r.prompt_preview.slice(0, 280));
      }
      return new Item(`${formatTokens(r.total_tokens)} · ${r.model || 'unknown model'}`, {
        description: `${r.project} · ${timeAgo(r.event_time)}`,
        tooltip: tip,
        icon: r.total_tokens >= 200000 ? 'flame' : 'arrow-swap',
        contextValue: 'kyt-request',
        target: { kind: 'request', id: String(r.id) },
      });
    });
  }
}

/** Dashboard path for a row. */
export function dashboardPath(target: OpenTarget): string {
  switch (target.kind) {
    case 'project':
      return `/projects/${encodeURIComponent(target.id ?? '')}`;
    case 'request':
      return `/requests/${encodeURIComponent(target.id ?? '')}`;
    case 'session':
      return '/sessions';
    default:
      return target.path ?? '/';
  }
}
