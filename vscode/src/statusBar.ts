// "$(pulse) 1.2M tokens today" in the status bar; "Know Your Tokens: offline" with a one-click start.
import * as vscode from 'vscode';
import { formatTokens } from './format';
import { Store } from './store';

type Period = 'today' | '7d' | 'all' | 'off';

export class StatusBar implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem('knowyourtokens.status', vscode.StatusBarAlignment.Right, 100);

  constructor(
    private readonly store: Store,
    private readonly period: () => Period,
  ) {
    this.item.name = 'Know Your Tokens';
    store.onDidChange(() => this.render());
    this.render();
  }

  render(): void {
    const period = this.period();
    if (period === 'off') {
      this.item.hide();
      return;
    }
    if (!this.store.connected) {
      this.item.text = '$(debug-disconnect) Tokens: offline';
      this.item.tooltip = `Know Your Tokens isn't running (${this.store.lastError ?? 'not reachable'}).\nClick to start it.`;
      this.item.command = 'knowyourtokens.start';
      this.item.backgroundColor = undefined;
      this.item.show();
      return;
    }
    const { today, week, all } = this.store.data;
    const s = period === '7d' ? week : period === 'all' ? all : today;
    const label = period === '7d' ? 'tokens · 7 days' : period === 'all' ? 'tokens · all time' : 'tokens today';
    this.item.text = `$(pulse) ${formatTokens(s?.total_tokens ?? 0)} ${label}`;
    const md = new vscode.MarkdownString(
      `**Know Your Tokens**\n\n` +
        `Today: **${(today?.total_tokens ?? 0).toLocaleString()}** tokens in ${today?.total_requests ?? 0} requests\n\n` +
        `Last 7 days: ${(week?.total_tokens ?? 0).toLocaleString()} tokens\n\n` +
        `All time: ${(all?.total_tokens ?? 0).toLocaleString()} tokens\n\n` +
        `Click to open the dashboard.`,
    );
    this.item.tooltip = md;
    this.item.command = 'knowyourtokens.openDashboard';
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
