// The full dashboard in an editor tab: a webview that frames the local dashboard (which allows being
// framed by vscode-webview: pages only). asExternalUri keeps it working in Remote/Codespaces setups.
import * as vscode from 'vscode';

export class DashboardPanel {
  private static current?: DashboardPanel;

  static async show(baseUrl: string, path = '/'): Promise<void> {
    const target = await vscode.env.asExternalUri(vscode.Uri.parse(new URL(path, baseUrl).toString()));
    if (DashboardPanel.current) {
      DashboardPanel.current.load(target);
      DashboardPanel.current.panel.reveal(vscode.ViewColumn.Active);
      return;
    }
    const panel = vscode.window.createWebviewPanel('knowyourtokens.dashboard', 'Know Your Tokens', vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });
    panel.iconPath = vscode.Uri.joinPath(vscode.Uri.file(__dirname), '..', 'media', 'icon.png');
    DashboardPanel.current = new DashboardPanel(panel);
    DashboardPanel.current.load(target);
  }

  private constructor(private readonly panel: vscode.WebviewPanel) {
    panel.onDidDispose(() => {
      DashboardPanel.current = undefined;
    });
    panel.webview.onDidReceiveMessage((msg) => {
      if (msg?.type === 'openExternal' && typeof msg.url === 'string') {
        void vscode.env.openExternal(vscode.Uri.parse(msg.url));
      }
    });
  }

  private load(url: vscode.Uri): void {
    const src = url.toString(true);
    const origin = `${url.scheme}://${url.authority}`;
    const nonce = Math.random().toString(36).slice(2);
    this.panel.webview.html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${origin}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: var(--vscode-editor-background); }
  iframe { border: 0; width: 100%; height: 100%; display: block; }
  .bar { position: fixed; right: 12px; bottom: 10px; font: 12px var(--vscode-font-family); opacity: .75; }
  .bar a { color: var(--vscode-textLink-foreground); cursor: pointer; }
</style>
</head>
<body>
<iframe src="${src}" title="Know Your Tokens dashboard" allow="clipboard-write"></iframe>
<div class="bar"><a id="ext">Open in browser</a></div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  document.getElementById('ext').addEventListener('click', () => vscode.postMessage({ type: 'openExternal', url: ${JSON.stringify(src)} }));
</script>
</body>
</html>`;
  }
}
