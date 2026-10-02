// Claude Code hook wiring in ~/.claude/settings.json.
//
// Our entries are recognized by the hook script's file name rather than the
// exact command string, so an install moved to another directory (or a
// different venv path) is cleaned up/replaced instead of left orphaned.
const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const { readJson, writeFileAtomic } = require('./fsutil');

const HOOK_SCRIPT = 'claude-telemetry-hook.py';
const HOOK_EVENTS = [
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'Stop',
  'SubagentStop',
  'PreCompact',
];

function hookCommand() {
  const hookPath = path.join(paths.installDir(), 'hooks', HOOK_SCRIPT);
  return `"${paths.venvPython()}" "${hookPath}"`;
}

function isOurs(hook) {
  return hook && typeof hook.command === 'string' && hook.command.includes(HOOK_SCRIPT);
}

/** Remove every one of our hooks; drop matcher groups left empty. */
function stripOurHooks(cfg) {
  if (!cfg.hooks || typeof cfg.hooks !== 'object') return 0;
  let removed = 0;
  for (const evt of Object.keys(cfg.hooks)) {
    if (!Array.isArray(cfg.hooks[evt])) continue;
    cfg.hooks[evt] = cfg.hooks[evt]
      .map((group) => {
        if (!group || !Array.isArray(group.hooks)) return group;
        const kept = group.hooks.filter((h) => !isOurs(h));
        removed += group.hooks.length - kept.length;
        return { ...group, hooks: kept };
      })
      .filter((group) => !(group && Array.isArray(group.hooks) && group.hooks.length === 0));
    if (cfg.hooks[evt].length === 0) delete cfg.hooks[evt];
  }
  if (Object.keys(cfg.hooks).length === 0) delete cfg.hooks;
  return removed;
}

function backupOnce(file) {
  const backup = `${file}.bak-knowyourtokens`;
  if (fs.existsSync(file) && !fs.existsSync(backup)) fs.copyFileSync(file, backup);
}

/** Validate settings.json up front so a bad file fails before any other install step. */
function assertSettingsReadable() {
  readJson(paths.claudeSettingsPath());
}

function installHooks() {
  const file = paths.claudeSettingsPath();
  const cfg = readJson(file);
  backupOnce(file);
  stripOurHooks(cfg);
  cfg.hooks = cfg.hooks || {};
  const command = hookCommand();
  for (const evt of HOOK_EVENTS) {
    const groups = Array.isArray(cfg.hooks[evt]) ? cfg.hooks[evt] : [];
    groups.push({ hooks: [{ type: 'command', command, timeout: 10 }] });
    cfg.hooks[evt] = groups;
  }
  writeFileAtomic(file, JSON.stringify(cfg, null, 2) + '\n');
  return file;
}

function uninstallHooks() {
  const file = paths.claudeSettingsPath();
  if (!fs.existsSync(file)) return 0;
  const cfg = readJson(file);
  const removed = stripOurHooks(cfg);
  if (removed) writeFileAtomic(file, JSON.stringify(cfg, null, 2) + '\n');
  return removed;
}

function installedHookEvents() {
  const cfg = readJson(paths.claudeSettingsPath());
  if (!cfg.hooks) return [];
  return Object.keys(cfg.hooks).filter(
    (evt) => Array.isArray(cfg.hooks[evt]) && cfg.hooks[evt].some((g) => g && Array.isArray(g.hooks) && g.hooks.some(isOurs))
  );
}

module.exports = {
  HOOK_EVENTS,
  HOOK_SCRIPT,
  hookCommand,
  installHooks,
  uninstallHooks,
  installedHookEvents,
  stripOurHooks,
  assertSettingsReadable,
};
