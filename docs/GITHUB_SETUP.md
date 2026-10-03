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

1. Open https://github.com/sarveshtalele/knowyourtokens.
2. On the right side of the repo home page, click the **⚙ gear** next to **About**.
3. Fill in:
   - **Description:**
     `Local-first token observability for every AI coding agent — Claude Code, Codex, Gemini CLI, OpenCode and more. Debug prompts, context and cost.`
   - **Website:** `https://sarveshtalele.github.io/knowyourtokens/`
     (or tick **Use your GitHub Pages website**, which fills in the same URL)
   - **Topics** (press Enter after each):
     `ai-agents` `llm` `observability` `tokens` `claude-code` `codex` `gemini-cli` `opencode`
     `mcp` `opentelemetry` `developer-tools` `local-first` `llm-observability` `token-usage`
4. Under **Include in the home page**, keep **Releases** and **Packages** ticked and untick
   **Deployments** (optional; the Pages deployment badge is noise).
5. **Save changes**.

Topics are what make the repo show up in GitHub search and on topic pages such as
`github.com/topics/claude-code` or `github.com/topics/ai-agents`. Keep the description and topics
neutral: Know Your Tokens is an independent project, not affiliated with Anthropic, OpenAI, Google or
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
3. Open https://sarveshtalele.github.io/knowyourtokens/ and confirm the landing page loads.

The site redeploys automatically whenever something under `site/` changes on `main`
(`.github/workflows/pages.yml`).

> **Custom domain later?** Add it in this settings page. Then, in a PR, change `base` in
> `site/vite.config.ts` to `'/'` (or build with `SITE_BASE=/`), and update the canonical and OG URLs in
> `site/index.html`, `site/public/sitemap.xml` and `site/public/robots.txt`.

## 4. npm publishing credentials

The release workflow (`.github/workflows/publish.yml`) publishes two npm packages, `knowyourtokens`
(CLI) and `knowyourtokens-client` (JS SDK). It needs **one** `NPM_TOKEN` secret, created once:

1. Sign in at https://www.npmjs.com → avatar → **Access Tokens → Generate New Token →
   Granular Access Token**.
2. **Name:** `github-actions-knowyourtokens` · **Expiration:** 90 days (put a renewal reminder in
   your calendar).
3. Tick **Bypass two-factor authentication (2FA)**. Without it every CI publish fails with `EOTP`,
   because CI can't type a one-time code.
4. **Packages and scopes → Permissions:** **Read and write**, **All packages** (the packages don't
   exist until the first publish; afterwards you can narrow it to the two packages).
5. **Generate token** and copy it. It is shown only once.
6. On GitHub: **Settings → Secrets and variables → Actions** → `NPM_TOKEN` → **Update** (or **New
   repository secret**) → paste the token → **Save**.

> Never paste the token into an issue, a PR, a chat or a file. Only put it in the secret.

### Trusted Publisher (tokenless, recommended)

Once both packages exist on npm (they do since 2.3.0), CI can publish with a short-lived identity
from GitHub instead of a stored token. Nothing to renew, nothing to leak. Do this once per package:

1. Open https://www.npmjs.com/package/knowyourtokens/access (signed in as the package owner).
2. Scroll to **Trusted Publisher** → **GitHub Actions**, and fill in exactly:

   | Field | Value |
   |---|---|
   | Organization or user | `sarveshtalele` |
   | Repository | `knowyourtokens` |
   | Workflow filename | `publish.yml` (file name only, no path) |
   | Environment name | leave empty |

3. **Set up connection**. npm may ask for your 2FA code.
4. Repeat steps 1–3 on https://www.npmjs.com/package/knowyourtokens-client/access.
5. Optional hardening, on each package's **access** page: **Publishing access → Require two-factor
   authentication and disallow tokens** → **Update package settings**. Tokens then can't publish at
   all; only this workflow can.
6. Delete the token: GitHub → **Settings → Secrets and variables → Actions** → `NPM_TOKEN` →
   **Remove**. Also revoke it on npm (avatar → **Access Tokens** → delete).

The workflow already has what it needs (`id-token: write` and npm ≥ 11.5.1), so there's nothing to
change in the code. The next release publishes through the Trusted Publisher automatically. If it
fails with `403 ... OIDC`, re-check the four fields above.

## 5. Releases are automatic

There is nothing to run on your machine.

- **Every push to `main`** (every merged PR) checks whether the version in `cli/package.json` is on
  npm yet. If not, the Release workflow runs the tests, publishes both packages, and creates the
  `vX.Y.Z` tag and GitHub release. If it is already out, the run stops after a few seconds.
- **New version:** **Actions → Release → Run workflow** → `patch` / `minor` / `major`. It bumps every
  version, moves the CHANGELOG's Unreleased notes under it, commits to `main` and publishes.
- Watch it at https://github.com/sarveshtalele/knowyourtokens/actions/workflows/publish.yml, then
  check https://www.npmjs.com/package/knowyourtokens.

**If a publish job fails:**

| Error in the log | Fix |
|---|---|
| `EOTP` / `This operation requires a one-time password` | The `NPM_TOKEN` token doesn't bypass 2FA. Create a new one with **Bypass two-factor authentication** ticked (step 4), update the secret, then **Re-run failed jobs** |
| `ENEEDAUTH` / `401` / `404 Not Found - PUT` | `NPM_TOKEN` missing, expired, or without write access to **All packages** (step 4) |
| `403 ... OIDC permission denied` | A Trusted Publisher is set but doesn't match: user `sarveshtalele`, repository `knowyourtokens`, workflow `publish.yml`, environment empty |
| `403 ... cannot publish over the previously published version` | That version was published (or unpublished) before; npm never reuses a version. Run the workflow with `patch` |
| `version X does not match` | A package version differs from the tag. Fix it in a PR, then re-run |

Re-run a failed job with **Re-run failed jobs**. Jobs that already published skip themselves.
`bash scripts/release-macos.sh` (inside your clone, whatever its folder is called) is a manual
fallback that publishes with your own npm login.

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
`pip install knowyourtokens-client`:

1. Create an account at https://pypi.org and enable 2FA.
2. **Your account → Publishing → Add a new pending publisher**:
   PyPI project name `knowyourtokens-client`, owner `sarveshtalele`, repository `knowyourtokens`,
   workflow `publish.yml`, environment `pypi`.
3. Ask Claude Code (or open a PR) to add a `pypi` job to `publish.yml` using
   `pypa/gh-action-pypi-publish` with `environment: pypi`.

## 12. Final verification

- [ ] Repo page shows the description, the **website link**, topics, and the social image
- [ ] https://sarveshtalele.github.io/knowyourtokens/ loads (try it on your phone too)
- [ ] `npx knowyourtokens@latest --version` prints the version in `cli/package.json`
- [ ] https://www.npmjs.com/package/knowyourtokens-client exists
- [ ] **Releases** shows the newest `vX.Y.Z` marked *Latest*
- [ ] **Security** tab: private reporting on, Dependabot alerts on, no open secret-scanning alerts
- [ ] Opening a test PR shows the required status checks
- [ ] README badges (npm version, CI) render with real values

## Search engines

The site is ready to be indexed: every page is pre-rendered (full text without JavaScript), has a
canonical URL, `index, follow`, structured data (app, FAQ, video), and a sitemap with the page, its
image and the demo video. Each deploy pings **IndexNow** (Bing, DuckDuckGo, Yandex) automatically.

**Google** (one time, about 5 minutes):

1. [Search Console](https://search.google.com/search-console) → property
   `https://sarveshtalele.github.io/knowyourtokens/` (URL prefix; verified by the HTML file
   `site/public/googlefef1b57b1438b8f1.html`, which every deploy keeps in place).
2. **Sitemaps** → type exactly `sitemap.xml` (no leading slash) → **Submit**. It should be listed as
   `/knowyourtokens/sitemap.xml`. An entry shown as `/sitemap.xml` points at
   `https://sarveshtalele.github.io/sitemap.xml`, which doesn't exist: remove it (⋮ → Remove sitemap).
   A fresh property can show "Couldn't fetch" for a day even when the sitemap is fine; it retries.
3. **URL inspection** → paste `https://sarveshtalele.github.io/knowyourtokens/` → **Request indexing**.
   This is the fastest way in, usually days.

**Bing** (also feeds DuckDuckGo, Yahoo and ChatGPT search): [Bing Webmaster Tools](https://www.bing.com/webmasters)
→ **Import from Google Search Console** (no extra verification), then submit the same sitemap.

**The GitHub repository** can't be submitted to Search Console (github.com isn't your site). Google
finds it through links, so it gets indexed faster the more places link to it: the website, npm,
Product Hunt, the YouTube description, LinkedIn/X posts. The repo's description, website and topics
(up to 20; they become github.com/topics pages) are what search shows.
