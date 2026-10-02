# GitHub & npm setup guide (maintainers)

A one-time checklist for the repository owner. Each step says **where to click** and **what to enter**.
None of this can be done from a pull request: these are repository, organization or npm settings.

Work through it in order. Steps 1–5 get v2.2.0 published and the project discoverable; the rest
harden the repository and set it up for contributors.

| # | Step | Time | Status |
|---|---|---|---|
| 1 | [Description, website, topics](#1-description-website-and-topics) | 2 min | ☐ |
| 2 | [Social preview image](#2-social-preview-image) | 1 min | ☐ |
| 3 | [GitHub Pages](#3-github-pages) | 1 min | ☐ |
| 4 | [npm token + trusted publishing](#4-npm-publishing-credentials) | 5 min | ☐ |
| 5 | [Publish the v2.2.0 release](#5-publish-the-v220-release) | 2 min | ☐ |
| 6 | [Security features](#6-security-features) | 3 min | ☐ |
| 7 | [Protect `main`](#7-protect-the-main-branch) | 5 min | ☐ |
| 8 | [Community features & labels](#8-community-features-and-labels) | 5 min | ☐ |
| 9 | [Actions permissions](#9-actions-permissions) | 2 min | ☐ |
| 10 | [Dependabot PR triage](#10-triage-the-open-dependabot-prs) | 10 min | ☐ |
| 11 | [Optional: Python SDK on PyPI](#11-optional-publish-the-python-sdk-to-pypi) | 10 min | ☐ |
| 12 | [Final verification](#12-final-verification) | 3 min | ☐ |

---

## 1. Description, website and topics

1. Open https://github.com/sarveshtalele/tokentelemetry.
2. On the right side of the repo home page, click the **⚙ gear** next to **About**.
3. Fill in:
   - **Description:**
     `Local-first token observability for every AI coding agent — Claude Code, Codex, Gemini CLI, OpenCode and more. Debug prompts, context and cost.`
   - **Website:** `https://sarveshtalele.github.io/tokentelemetry/`
     (or tick **Use your GitHub Pages website**, which fills in the same URL)
   - **Topics** (press Enter after each):
     `ai-agents` `llm` `observability` `tokens` `claude-code` `codex` `gemini-cli` `opencode`
     `mcp` `opentelemetry` `developer-tools` `local-first` `llm-observability` `token-usage`
4. Under **Include in the home page**, keep **Releases** and **Packages** ticked and untick
   **Deployments** (optional; the Pages deployment badge is noise).
5. **Save changes**.

Topics are what make the repo show up in GitHub search and on topic pages such as
`github.com/topics/claude-code` or `github.com/topics/ai-agents`. Keep the description and topics
neutral: Token Telemetry is an independent project, not affiliated with Anthropic, OpenAI, Google or
any agent vendor, so avoid vendor names that read as an endorsement (such as `anthropic` or
`openai` on their own).

## 2. Social preview image

This image shows up when the repo link is shared on Slack, X, LinkedIn and similar sites.

1. **Settings → General → Social preview → Edit → Upload an image…**
2. Upload [`docs/launch/social-preview-1280x640.png`](launch/social-preview-1280x640.png) (1280×640,
   GitHub's recommended size), or [`site/public/og.png`](../site/public/og.png) (1200×630).

## 3. GitHub Pages

You've already done this. To check it:

1. **Settings → Pages → Build and deployment → Source** = **GitHub Actions**.
2. **Custom domain:** leave empty (or see the note below).
3. Open https://sarveshtalele.github.io/tokentelemetry/ and confirm the landing page loads.

The site redeploys automatically whenever something under `site/` changes on `main`
(`.github/workflows/pages.yml`).

> **Custom domain later?** Add it in this settings page. Then, in a PR, change `base` in
> `site/vite.config.ts` to `'/'` (or build with `SITE_BASE=/`), and update the canonical and OG URLs in
> `site/index.html`, `site/public/sitemap.xml` and `site/public/robots.txt`.

## 4. npm publishing credentials

The release workflow (`.github/workflows/publish.yml`) publishes two npm packages:
`tokentelemetry` (CLI, already exists) and `tokentelemetry-client` (JS SDK, **new**).

### 4a. Create an npm token (needed for the new package's first publish)

1. Sign in at https://www.npmjs.com → avatar → **Access Tokens → Generate New Token →
   Granular Access Token**.
2. **Name:** `github-actions-tokentelemetry` · **Expiration:** 90 days (put a renewal reminder in your
   calendar).
3. **Packages and scopes → Permissions:** **Read and write**, **All packages** (needed because
   `tokentelemetry-client` doesn't exist yet; after the first publish you can narrow it to the two
   packages).
4. **Generate token** and copy it. It is shown only once.
5. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - **Name:** `NPM_TOKEN`
   - **Secret:** paste the token → **Add secret**.

> Never paste the token into an issue, a PR, a chat or a file. Only put it in the secret.

### 4a-alt. Or: publish the JS SDK once from your own machine

npm can't attach a trusted publisher to a package that doesn't exist yet, so the very first
`tokentelemetry-client` release has to be published with your own login. Do this **after** the
release PR is merged, so you publish exactly what's on `main`.

Run these **inside a local clone of the repository**. In any other folder (for example your home
directory) `git checkout main` fails with `fatal: not a git repository`. If you don't have a clone
yet:

```bash
git clone https://github.com/sarveshtalele/tokentelemetry.git && cd tokentelemetry
```

Then, from the repository root:

```bash
git checkout main && git pull
cd sdk/js
npm whoami                    # not logged in? run: npm login
npm ci                        # installs TypeScript; the build runs automatically on publish
npm publish --access public   # npm asks for your 2FA code (or add --otp=123456)
npm view tokentelemetry-client version   # should print the version in sdk/js/package.json
```

Then do step 4b for `tokentelemetry-client`. Future releases publish it from CI with no token, and
the Release workflow skips any version that is already on npm, so it goes green.

### 4b. Trusted publishing (tokenless, recommended long term)

Do this for **each** package on npmjs.com. For `tokentelemetry-client`, do it after its first
publish:

1. https://www.npmjs.com/package/tokentelemetry → **Settings → Trusted Publisher → GitHub Actions**.
2. **Organization or user:** `sarveshtalele` · **Repository:** `tokentelemetry` ·
   **Workflow filename:** `publish.yml` · **Environment:** leave empty → **Set up connection**.
3. Optional hardening: under **Publishing access**, choose
   **Require two-factor authentication and disallow tokens**. Only do this once both packages are
   on trusted publishing; after that, delete the `NPM_TOKEN` secret.

## 5. Publish the v2.2.0 release

**Fastest:** GitHub → **Actions → Release → Run workflow** → `patch` / `minor` / `major`. The workflow
bumps the versions, commits, publishes both npm packages and creates the release. It needs npm
Trusted Publishing (step 4b) or an `NPM_TOKEN` secret (step 4a). `bash scripts/release-macos.sh` does the
same from your Mac with your own npm login; the steps below are the manual alternative. The ticked overview is in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

1. **Releases → Draft a new release** (https://github.com/sarveshtalele/tokentelemetry/releases/new).
2. **Choose a tag:** type `v2.2.0` → **Create new tag: v2.2.0 on publish** · **Target:** `main`.
3. **Release title:** `v2.2.0`.
4. **Description:** paste the `## [2.2.0]` section of [`CHANGELOG.md`](../CHANGELOG.md), or click
   **Generate release notes** and put the changelog section above it.
5. Tick **Set as the latest release** → **Publish release**.
6. Open **Actions → Release** and watch the run:
   `verify` → `Publish CLI to npm` + `Publish JS SDK to npm` should all go green (about 3 minutes).
7. Check https://www.npmjs.com/package/tokentelemetry shows **2.2.0**, and that
   https://www.npmjs.com/package/tokentelemetry-client exists.

**If a publish job fails:**

| Error in the log | Fix |
|---|---|
| `403 ... OIDC permission denied for this action` | npm found a Trusted Publisher for the package but it doesn't match. On npmjs.com → package → **Settings → Trusted Publisher**, it must be exactly: user `sarveshtalele`, repository `tokentelemetry`, workflow filename `publish.yml` (just the file name, not a path or the workflow's display name), **environment empty**. Delete and re-add it if unsure, then **Re-run failed jobs** |
| `EOTP` / `This operation requires a one-time password` | `NPM_TOKEN` is a 2FA-protected token, which CI can't use. Either publish that package once from your machine (`cd sdk/js && npm ci && npm publish --access public`, then enter your OTP) and set up its Trusted Publisher, or replace the secret with a granular token that has **Bypass two-factor authentication** ticked |
| `ENEEDAUTH` / `401` / `404 Not Found - PUT` | `NPM_TOKEN` missing or wrong (step 4a), or trusted publisher not set up (4b) |
| `403 ... cannot publish over the previously published version` | That version is already on npm. Bump the version (see CONTRIBUTING → Releasing) |
| `version X does not match` | A package version differs from the tag. Fix it in a PR, then re-run |
| `fatal: not a git repository` (on your machine) | You ran the commands outside the repo. `git clone https://github.com/sarveshtalele/tokentelemetry.git && cd tokentelemetry`, then repeat |

Re-run a failed job with **Re-run failed jobs**. Jobs that already published skip themselves.

For future releases, follow [CONTRIBUTING.md → Releasing](../CONTRIBUTING.md#releasing-maintainers):
bump all versions in one PR, merge it, then publish a release (or push a `vX.Y.Z` tag) and the
workflow does the rest.

## 6. Security features

**Settings → Advanced Security** (on older UIs: **Code security and analysis**):

| Feature | Setting |
|---|---|
| **Private vulnerability reporting** | **Enable**. Makes the "Report a vulnerability" button in `SECURITY.md` work |
| **Dependency graph** | Enabled |
| **Dependabot alerts** | **Enable** |
| **Dependabot security updates** | **Enable** |
| **Grouped security updates** | Enable (fewer PRs) |
| **Secret Protection / secret scanning** | **Enable** |
| **Push protection** | **Enable**. Blocks pushes that contain credentials |
| **Code scanning → CodeQL** | Leave as **Advanced** (the repo ships `.github/workflows/codeql.yml`). **Do not switch to "Default setup"**: GitHub disables the workflow-based analysis when default setup is on, and the two conflict |

## 7. Protect the `main` branch

**Settings → Rules → Rulesets → New ruleset → New branch ruleset**

1. **Ruleset name:** `main` · **Enforcement status:** **Active**.
2. **Bypass list:** add **Repository admin** (so you can still fix things in an emergency).
3. **Target branches → Add target → Include default branch**.
4. Tick these rules:
   - **Restrict deletions**
   - **Block force pushes**
   - **Require linear history**: leave **off** (the project uses merge commits)
   - **Require a pull request before merging**
     - Required approvals: **0** while you're the only maintainer (raise to 1 when there are two)
     - **Dismiss stale pull request approvals when new commits are pushed**
     - **Require conversation resolution before merging**
   - **Require status checks to pass** → **Require branches to be up to date before merging** →
     **Add checks**, and add each of these (they appear after one CI run):
     - `Python lint, format, OpenAPI drift`
     - `Python 3.12 on ubuntu-latest`
     - `Python 3.12 on windows-latest`
     - `Python 3.12 on macos-latest`
     - `Dashboard (lint, format, typecheck, test, build)`
     - `JS SDK`
     - `CLI on ubuntu-latest (Node 22)`
     - `Package -> install -> start -> health (ubuntu-latest)`
     - `Package -> install -> start -> health (windows-latest)`
     - `Package -> install -> start -> health (macos-latest)`
     - `analyze (python)` and `analyze (javascript-typescript)`
5. **Create**.

**Settings → General → Pull Requests:**
- Allow merge commits ✅ · Allow squash merging ✅ · Allow rebase merging ☐
- **Always suggest updating pull request branches** ✅
- **Automatically delete head branches** ✅

## 8. Community features and labels

**Settings → General → Features:**
- **Issues** ✅
- **Discussions** ✅ → then on the **Discussions** tab create categories **Q&A** (question/answer
  format), **Ideas**, **Show and tell**, **Announcements** (maintainers only). `SUPPORT.md` and the
  issue-template chooser already point people to Discussions.
- **Wikis** ☐ (the docs live in `docs/`)
- **Sponsorships** (optional): needs GitHub Sponsors set up; then add `.github/FUNDING.yml` with
  `github: [sarveshtalele]`.

**Issues → Labels → New label.** Create any that are missing:

| Label | Color | Used for |
|---|---|---|
| `good first issue` | `#7057ff` | Small, well-scoped tasks for new contributors |
| `help wanted` | `#008672` | Maintainer would welcome a PR |
| `bug` | `#d73a4a` | Used by the bug template |
| `enhancement` | `#a2eeef` | Used by the feature template |
| `documentation` | `#0075ca` | Docs-only changes |
| `dependencies` | `#0366d6` | Dependabot PRs |
| `security` | `#b60205` | Hardening work (never vulnerability details) |
| `breaking-change` | `#e99695` | Needs a major version bump |

Then open 3–5 small issues labelled `good first issue` (ideas: server-side search on the Requests page,
Prometheus `/metrics`, more client detections, a new agent source, translations of the landing page). GitHub highlights
repos that have them to new contributors.

## 9. Actions permissions

**Settings → Actions → General:**
- **Actions permissions:** Allow all actions and reusable workflows (the workflows use
  `actions/*`, `github/codeql-action` and `softprops/action-gh-release`), or **Allow sarveshtalele,
  and select non-sarveshtalele, actions** and list those three.
- **Workflow permissions:** **Read repository contents and packages permissions** (each workflow
  requests anything more it needs explicitly).
- **Allow GitHub Actions to create and approve pull requests:** ☐

**Optional, to let Claude Code run releases for you:** the Claude GitHub App currently can't start
workflow runs or push tags (`403 Resource not accessible by integration`). If you want it to, update
the app's permissions under **Settings → GitHub Apps → Claude → Configure** to include
**Actions: Read and write**. Otherwise keep publishing releases yourself (step 5).

## 10. Triage the open Dependabot PRs

Merging PR #28 changed the dependency layout, so Dependabot opened a batch of update PRs.

1. **Pull requests** → filter `author:app/dependabot`.
2. For each PR: wait for CI. If it's **green**, merge it. If it's **red**, comment
   `@dependabot rebase` once. If it's still red, the update is genuinely breaking: close it with a
   comment, or ask Claude Code to fix it on that branch.
3. Major-version bumps (for example React 18 → 19 in `frontend/`) deserve a manual look at the
   changelog before merging, even when green.

## 11. Optional: publish the Python SDK to PyPI

The Python client (`sdk/python`) is ready to publish but has no workflow yet. If you want
`pip install tokentelemetry-client`:

1. Create an account at https://pypi.org and enable 2FA.
2. **Your account → Publishing → Add a new pending publisher**:
   PyPI project name `tokentelemetry-client`, owner `sarveshtalele`, repository `tokentelemetry`,
   workflow `publish.yml`, environment `pypi`.
3. Ask Claude Code (or open a PR) to add a `pypi` job to `publish.yml` using
   `pypa/gh-action-pypi-publish` with `environment: pypi`.

## 12. Final verification

- [ ] Repo page shows the description, the **website link**, topics, and the social image
- [ ] https://sarveshtalele.github.io/tokentelemetry/ loads (try it on your phone too)
- [ ] `npx tokentelemetry@latest --version` prints `2.2.0`
- [ ] https://www.npmjs.com/package/tokentelemetry-client exists
- [ ] **Releases** shows `v2.2.0` marked *Latest*
- [ ] **Security** tab: private reporting on, Dependabot alerts on, no open secret-scanning alerts
- [ ] Opening a test PR shows the required status checks
- [ ] README badges (npm version, CI) render with real values

Search engines usually pick up the site within a few days to a few weeks. To speed this up, add the
property in [Google Search Console](https://search.google.com/search-console) (URL-prefix property
`https://sarveshtalele.github.io/tokentelemetry/`), verify it with the HTML-tag method (add the
`<meta name="google-site-verification">` tag to `site/index.html` in a PR), and submit
`sitemap.xml`.
