#!/usr/bin/env bash
# Publish a Know Your Tokens release from a Mac, in one go.
#
#   curl -fsSL https://raw.githubusercontent.com/sarveshtalele/knowyourtokens/main/scripts/release-macos.sh | bash
#   # or, inside a clone:
#   bash scripts/release-macos.sh [--dry-run] [--dir PATH] [--no-tag] [--pypi] [--yes]
#
# What it does (each step is skipped when it's already done, so re-running is safe):
#   1. checks git, Node >= 18 and npm
#   2. clones the repo (default ~/knowyourtokens) or updates it to the latest main
#   3. checks every package has the same version
#   4. logs you in to npm if needed
#   5. publishes the JS SDK (knowyourtokens-client) and the CLI (knowyourtokens) to npm
#   6. waits until npm serves the new versions
#   7. pushes the vX.Y.Z tag, which runs the Release workflow (tests + GitHub release)
#   8. optionally publishes the Python SDK to PyPI (--pypi)
#   9. prints the checklist of things only you can do in a browser
set -euo pipefail

REPO_URL="https://github.com/sarveshtalele/knowyourtokens.git"
DIR="${KNOWYOURTOKENS_DIR:-$HOME/knowyourtokens}"
DRY=0 TAG=1 PYPI=0 YES=0

usage() { sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --dir) DIR="$2"; shift ;;
    --no-tag) TAG=0 ;;
    --pypi) PYPI=1 ;;
    --yes|-y) YES=1 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1 (see --help)"; exit 2 ;;
  esac
  shift
done

if [ -t 1 ]; then B=$'\033[1m' G=$'\033[32m' Y=$'\033[33m' R=$'\033[31m' D=$'\033[2m' N=$'\033[0m'; else B= G= Y= R= D= N=; fi
step() { printf '\n%s==> %s%s\n' "$B" "$1" "$N"; }
ok()   { printf '  %s✓%s %s\n' "$G" "$N" "$1"; }
warn() { printf '  %s!%s %s\n' "$Y" "$N" "$1"; }
die()  { printf '\n%s✗ %s%s\n' "$R" "$1" "$N" >&2; exit 1; }
confirm() {
  [ "$YES" = 1 ] && return 0
  local a; printf '  %s [y/N] ' "$1"; read -r a </dev/tty || a=n
  [[ "$a" =~ ^[Yy] ]]
}
published() { npm view "$1@$2" version --prefer-online >/dev/null 2>&1; }

[ "$(uname -s)" = "Darwin" ] || warn "Written for macOS; continuing anyway."
[ "$DRY" = 1 ] && warn "Dry run: nothing is published or pushed."

# 1 ─────────────────────────────────────────────────────────────────────────
step "1/9 Tools"
command -v git >/dev/null || die "git is missing. Run: xcode-select --install"
command -v node >/dev/null || die "Node.js is missing. Run: brew install node   (or get it from https://nodejs.org)"
command -v npm >/dev/null || die "npm is missing. Reinstall Node.js: brew install node"
node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge 18 ] || die "Node $node_major is too old; need 18+. Run: brew upgrade node"
ok "git $(git --version | awk '{print $3}'), node $(node -v), npm $(npm -v)"

# 2 ─────────────────────────────────────────────────────────────────────────
step "2/9 Repository ($DIR)"
# Already inside a clone? Use it.
if top="$(git rev-parse --show-toplevel 2>/dev/null)" && git -C "$top" remote get-url origin 2>/dev/null | grep -Eq 'sarveshtalele/(knowyourtokens|tokentelemetry)'; then
  DIR="$top"
fi
if [ ! -d "$DIR/.git" ]; then
  git clone "$REPO_URL" "$DIR"
  ok "cloned"
fi
cd "$DIR"
[ -z "$(git status --porcelain)" ] || die "$DIR has uncommitted changes. Commit or stash them (git stash), then re-run."
git checkout -q main
git pull -q --ff-only origin main
ok "on main at $(git log -1 --format='%h %s')"

# 3 ─────────────────────────────────────────────────────────────────────────
step "3/9 Versions"
V="$(node -p "require('./cli/package.json').version")"
v_sdk="$(node -p "require('./sdk/js/package.json').version")"
v_tel="$(sed -n 's/^__version__ = "\(.*\)"/\1/p' telemetry/__init__.py)"
v_py="$(sed -n 's/^version = "\(.*\)"/\1/p' sdk/python/pyproject.toml)"
[ "$V" = "$v_sdk" ] && [ "$V" = "$v_tel" ] && [ "$V" = "$v_py" ] \
  || die "Versions differ: cli $V, js sdk $v_sdk, telemetry $v_tel, python sdk $v_py"
[ -d telemetry/sources ] || die "main doesn't have the multi-agent work yet. Merge the open release PR first: https://github.com/sarveshtalele/knowyourtokens/pulls"
ok "everything is $V"

# 4 ─────────────────────────────────────────────────────────────────────────
step "4/9 npm login"
if ! who="$(npm whoami 2>/dev/null)"; then
  warn "not logged in; a browser window opens to sign in"
  npm login
  who="$(npm whoami)"
fi
ok "logged in as $who"

# 5 ─────────────────────────────────────────────────────────────────────────
step "5/9 Publish to npm"
pub() { # <package> <dir>
  if published "$1" "$V"; then ok "$1@$V is already on npm"; return; fi
  printf '  publishing %s@%s from %s/ %s(npm may open the browser to confirm with 2FA)%s\n' "$1" "$V" "$2" "$D" "$N"
  ( cd "$2"
    if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; fi
    if [ "$DRY" = 1 ]; then npm publish --access public --dry-run; else npm publish --access public; fi )
  if [ "$DRY" = 1 ]; then ok "$1@$V packs cleanly (dry run, not published)"; else ok "$1@$V published"; fi
}
pub knowyourtokens-client sdk/js
pub knowyourtokens cli   # prepack builds the dashboard and bundles it (takes a minute)

# 6 ─────────────────────────────────────────────────────────────────────────
step "6/9 Check npm"
if [ "$DRY" = 1 ]; then warn "skipped (dry run)"; else
  for p in knowyourtokens-client knowyourtokens; do
    for i in $(seq 1 18); do published "$p" "$V" && break; sleep 10; done
    published "$p" "$V" && ok "npm serves $p@$V" \
      || warn "$p@$V isn't visible yet. npm can take a few minutes; check later with: npm view $p version --prefer-online"
  done
fi

# 7 ─────────────────────────────────────────────────────────────────────────
step "7/9 Git tag v$V (creates the GitHub release)"
if [ "$TAG" = 0 ]; then warn "skipped (--no-tag)"
elif git ls-remote --exit-code --tags origin "refs/tags/v$V" >/dev/null 2>&1; then ok "v$V already exists"
elif [ "$DRY" = 1 ]; then warn "would push tag v$V"
elif confirm "Push tag v$V? It runs the Release workflow, which re-runs the tests and creates the GitHub release."; then
  git tag -a "v$V" -m "v$V"
  if git push origin "v$V"; then
    ok "pushed. Watch it: https://github.com/sarveshtalele/knowyourtokens/actions/workflows/publish.yml"
  else
    git tag -d "v$V" >/dev/null
    warn "GitHub refused the push (not signed in to git?). Make the release in the browser instead:"
    warn "https://github.com/sarveshtalele/knowyourtokens/releases/new  → tag v$V, target main, Publish release"
  fi
else warn "not pushed. Later: git tag -a v$V -m v$V && git push origin v$V"; fi

# 8 ─────────────────────────────────────────────────────────────────────────
step "8/9 Python SDK on PyPI (optional)"
if [ "$PYPI" = 0 ]; then warn "skipped (add --pypi to publish knowyourtokens-client to PyPI)"
elif curl -fsS "https://pypi.org/pypi/knowyourtokens-client/$V/json" >/dev/null 2>&1; then ok "knowyourtokens-client $V is already on PyPI"
else
  command -v python3 >/dev/null || die "python3 is missing. Run: brew install python"
  venv="$(mktemp -d)/venv"
  python3 -m venv "$venv"
  "$venv/bin/pip" -q install --upgrade build twine
  rm -rf sdk/python/dist
  "$venv/bin/python" -m build -q sdk/python
  "$venv/bin/twine" check sdk/python/dist/*
  if [ "$DRY" = 1 ]; then warn "built; not uploaded (dry run)"; else
    echo "  Paste a PyPI API token when asked (https://pypi.org/manage/account/token/); the username is __token__."
    "$venv/bin/twine" upload -u __token__ sdk/python/dist/*
    ok "published to https://pypi.org/project/knowyourtokens-client/"
  fi
fi

# 9 ─────────────────────────────────────────────────────────────────────────
step "9/9 What's left (browser only)"
cat <<EOF
  [ ] Repo About: description, website, topics ........ https://github.com/sarveshtalele/knowyourtokens
  [ ] Social preview: docs/launch/social-preview-1280x640.png
                                    ........ https://github.com/sarveshtalele/knowyourtokens/settings
  [ ] Trusted publishing for both npm packages ........ https://www.npmjs.com/package/knowyourtokens-client/access
  [ ] Enable Discussions + private vulnerability reporting
  [ ] Protect main (require CI) ....................... https://github.com/sarveshtalele/knowyourtokens/settings/rules
  [ ] Google Search Console + submit sitemap.xml ...... https://search.google.com/search-console
  [ ] Post the launch reel, YouTube video and LinkedIn images (docs/launch/)
EOF
if [ "$DRY" = 0 ] && command -v open >/dev/null && confirm "Open these pages in the browser now?"; then
  open "https://github.com/sarveshtalele/knowyourtokens/releases"
  open "https://www.npmjs.com/package/knowyourtokens"
  open "https://github.com/sarveshtalele/knowyourtokens/settings"
fi
printf '\n%sDone.%s Test it: npx knowyourtokens@%s --version\n' "$G" "$N" "$V"
