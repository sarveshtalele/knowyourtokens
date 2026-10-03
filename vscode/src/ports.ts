// Find the ports the local app is using, the same way the CLI does: an explicit setting, then the
// KNOWYOURTOKENS_* environment variables, then the port "knowyourtokens start" picked when the default
// was taken (saved in <app folder>/ports.json), then the defaults. No vscode import (unit-tested).
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const DEFAULT_BACKEND_PORT = 8000;
export const DEFAULT_DASHBOARD_PORT = 5173;

type Env = Record<string, string | undefined>;

function validPort(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : null;
}

/** The app folder: KNOWYOURTOKENS_HOME, else ~/.knowyourtokens, else a pre-rename ~/.tokentelemetry. */
export function appFolder(env: Env = process.env, home: string = os.homedir()): string {
  const explicit = env.KNOWYOURTOKENS_HOME || env.TOKENTELEMETRY_HOME;
  if (explicit) return explicit;
  const current = path.join(home, '.knowyourtokens');
  const legacy = path.join(home, '.tokentelemetry');
  return !fs.existsSync(current) && fs.existsSync(legacy) ? legacy : current;
}

export function savedPorts(folder: string): { backend?: number; dashboard?: number } {
  try {
    return JSON.parse(fs.readFileSync(path.join(folder, 'ports.json'), 'utf8'));
  } catch {
    return {};
  }
}

export interface Ports {
  backend: number;
  dashboard: number;
}

export function resolvePorts(
  settings: { backendPort?: number; dashboardPort?: number },
  env: Env = process.env,
  home: string = os.homedir(),
): Ports {
  const saved = savedPorts(appFolder(env, home));
  return {
    backend:
      validPort(settings.backendPort) ??
      validPort(env.KNOWYOURTOKENS_BACKEND_PORT ?? env.TOKENTELEMETRY_BACKEND_PORT) ??
      validPort(saved.backend) ??
      DEFAULT_BACKEND_PORT,
    dashboard:
      validPort(settings.dashboardPort) ??
      validPort(env.KNOWYOURTOKENS_DASHBOARD_PORT ?? env.TOKENTELEMETRY_DASHBOARD_PORT) ??
      validPort(saved.dashboard) ??
      DEFAULT_DASHBOARD_PORT,
  };
}
