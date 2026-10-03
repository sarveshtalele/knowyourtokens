// Know Your Tokens for VS Code: status bar, sidebar views and the dashboard in a tab, all reading the
// local app's REST API on 127.0.0.1. Nothing leaves the machine.
import * as vscode from 'vscode';
import { disposeTerminal, runCli } from './cli';
import { DashboardPanel } from './dashboard';
import { resolvePorts } from './ports';
import { StatusBar } from './statusBar';
import { Store } from './store';
import { OpenTarget, OverviewView, ProjectsView, RequestsView, SessionsView, dashboardPath } from './views';

const TROUBLESHOOTING = 'https://sarveshtalele.github.io/knowyourtokens/#troubleshooting';

function config() {
  return vscode.workspace.getConfiguration('knowyourtokens');
}

export function activate(context: vscode.ExtensionContext): void {
  const store = new Store(
    () => resolvePorts({ backendPort: config().get<number>('backendPort'), dashboardPort: config().get<number>('dashboardPort') }),
    () => Math.min(500, Math.max(5, config().get<number>('requestCount') ?? 50)),
  );
  const statusBar = new StatusBar(store, () => config().get('statusBar') ?? 'today');
  context.subscriptions.push(
    store,
    statusBar,
    vscode.window.registerTreeDataProvider('knowyourtokens.overview', new OverviewView(store)),
    vscode.window.registerTreeDataProvider('knowyourtokens.projects', new ProjectsView(store)),
    vscode.window.registerTreeDataProvider('knowyourtokens.sessions', new SessionsView(store)),
    vscode.window.registerTreeDataProvider('knowyourtokens.requests', new RequestsView(store)),
  );

  // Poll on an interval (the API is local and cheap). Restarted whenever the interval setting changes.
  let timer: NodeJS.Timeout | undefined;
  const schedule = () => {
    if (timer) clearInterval(timer);
    const seconds = Math.max(5, config().get<number>('refreshInterval') ?? 30);
    timer = setInterval(() => void store.refresh(), seconds * 1000);
  };
  schedule();
  context.subscriptions.push({ dispose: () => timer && clearInterval(timer) });
  void store.refresh();

  /** After Start/Install: refresh every 3 s for up to 3 minutes until the app answers. */
  async function waitUntilRunning(): Promise<void> {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: 'Know Your Tokens: waiting for the app to start' },
      async () => {
        const deadline = Date.now() + 180_000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 3000));
          await store.refresh();
          if (store.connected) return;
        }
      },
    );
    if (store.connected) {
      const pick = await vscode.window.showInformationMessage('Know Your Tokens is running.', 'Open Dashboard');
      if (pick) await vscode.commands.executeCommand('knowyourtokens.openDashboard');
    } else {
      const pick = await vscode.window.showWarningMessage(
        "Know Your Tokens didn't come up. The terminal shows what went wrong and how to fix it.",
        'Run Diagnostics',
        'Troubleshooting Guide',
      );
      if (pick === 'Run Diagnostics') runCli('doctor');
      if (pick === 'Troubleshooting Guide') await vscode.env.openExternal(vscode.Uri.parse(TROUBLESHOOTING));
    }
  }

  async function requireRunning(): Promise<boolean> {
    if (!store.connected) await store.refresh();
    if (store.connected) return true;
    const pick = await vscode.window.showWarningMessage(
      `Know Your Tokens isn't running (${store.lastError ?? 'not reachable'}).`,
      'Start',
      'Install',
      'Troubleshooting Guide',
    );
    if (pick === 'Start') await vscode.commands.executeCommand('knowyourtokens.start');
    if (pick === 'Install') await vscode.commands.executeCommand('knowyourtokens.install');
    if (pick === 'Troubleshooting Guide') await vscode.env.openExternal(vscode.Uri.parse(TROUBLESHOOTING));
    return false;
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('knowyourtokens.refresh', () => store.refresh()),
    vscode.commands.registerCommand('knowyourtokens.openDashboard', async () => {
      if (await requireRunning()) await DashboardPanel.show(store.dashboardUrl);
    }),
    vscode.commands.registerCommand('knowyourtokens.openInBrowser', async () => {
      if (await requireRunning()) await vscode.env.openExternal(vscode.Uri.parse(store.dashboardUrl));
    }),
    vscode.commands.registerCommand('knowyourtokens.openItem', async (target: OpenTarget | undefined) => {
      if (target && (await requireRunning())) await DashboardPanel.show(store.dashboardUrl, dashboardPath(target));
    }),
    vscode.commands.registerCommand('knowyourtokens.start', async () => {
      runCli('start');
      await waitUntilRunning();
    }),
    vscode.commands.registerCommand('knowyourtokens.install', async () => {
      runCli('');
      await waitUntilRunning();
    }),
    vscode.commands.registerCommand('knowyourtokens.stop', async () => {
      runCli('stop');
      setTimeout(() => void store.refresh(), 3000);
    }),
    vscode.commands.registerCommand('knowyourtokens.doctor', () => runCli('doctor')),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('knowyourtokens')) return;
      if (e.affectsConfiguration('knowyourtokens.refreshInterval')) schedule();
      statusBar.render();
      void store.refresh();
    }),
    { dispose: disposeTerminal },
  );
}

export function deactivate(): void {
  /* subscriptions clean up */
}
