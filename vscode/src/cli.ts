// Runs the Know Your Tokens CLI in an integrated terminal, so its prompts (like "Install uv now?") and
// its error messages are visible and answerable.
import * as vscode from 'vscode';

let terminal: vscode.Terminal | undefined;

export function runCli(subcommand: string): void {
  const cli = vscode.workspace.getConfiguration('knowyourtokens').get<string>('cliCommand') || 'npx knowyourtokens@latest';
  if (!terminal || terminal.exitStatus !== undefined) {
    terminal = vscode.window.createTerminal({
      name: 'Know Your Tokens',
      // The extension opens the dashboard in a tab itself; don't also open a browser window.
      env: { KNOWYOURTOKENS_NO_OPEN: '1' },
      iconPath: new vscode.ThemeIcon('pulse'),
    });
  }
  terminal.show(true);
  terminal.sendText(`${cli} ${subcommand}`.trim());
}

export function disposeTerminal(): void {
  terminal?.dispose();
  terminal = undefined;
}
