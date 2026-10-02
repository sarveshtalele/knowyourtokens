# Launch checklist

Everything left to do before and after launch, in order. Ticked items are done. Details for each
GitHub and npm setting are in [GITHUB_SETUP.md](GITHUB_SETUP.md).

## 1. Ship v2.2.0

- [x] Turn off GitHub's AI security detections (the `github-advanced-security` check that failed
      with "exceeded your monthly quota")
- [x] npm account set up and logged in (`npm whoami` prints `sarveshtalele`)
- [x] `tokentelemetry-client@2.1.0` published. It was built from `main` before the multi-agent work,
      so it has no `ingest()`. 2.2.0 replaces it.
- [ ] **Merge the release PR** (multi-agent support + v2.2.0) on GitHub
- [ ] **Run the release script** in Terminal on your Mac:

      ```bash
      cd ~/tokentelemetry && git checkout main && git pull
      bash scripts/release-macos.sh --dry-run   # rehearsal: builds and checks, publishes nothing
      bash scripts/release-macos.sh             # the real thing
      ```

      It publishes `tokentelemetry-client@2.2.0` and `tokentelemetry@2.2.0` to npm (npm opens the
      browser once per package to confirm with 2FA), waits until npm serves them, then pushes the
      `v2.2.0` tag so the Release workflow creates the GitHub release. Re-running it is safe: every
      step skips itself once done. Add `--pypi` to also publish the Python SDK.
- [ ] Check: `npx tokentelemetry@latest --version` prints `2.2.0`
- [ ] Check: https://github.com/sarveshtalele/tokentelemetry/releases shows `v2.2.0` as *Latest*

> Seeing `404 Not Found` from `npm view` right after `+ tokentelemetry-client@…`? The publish worked;
> npm's cache just hasn't caught up. Wait a minute and run
> `npm view tokentelemetry-client version --prefer-online`. (`tokentelemetry-publish` is the name of
> your access token, not a package, so `npm view tokentelemetry-publish` is always 404.)

## 2. GitHub repository settings

- [ ] **About** (gear next to About on the repo page): description, website, topics
      ([exact text](GITHUB_SETUP.md#1-description-website-and-topics))
- [ ] **Social preview**: Settings → General → Social preview → upload
      [`launch/social-preview-1280x640.png`](launch/social-preview-1280x640.png)
- [ ] **Discussions**: Settings → General → Features → tick Discussions
- [ ] **Private vulnerability reporting** and **Dependabot alerts**: Settings → Advanced Security
- [ ] **Protect `main`**: Settings → Rules → require a PR and the CI checks
      ([which checks](GITHUB_SETUP.md#7-protect-the-main-branch))

## 3. npm hygiene

- [ ] **Trusted publishing** for both packages, so CI can publish without a token: package page →
      Settings → Trusted Publisher → GitHub Actions → user `sarveshtalele`, repo `tokentelemetry`,
      workflow `publish.yml`, environment empty
- [ ] Then delete the `tokentelemetry-publish` access token (it bypasses 2FA, and npm is restricting
      those) and the `NPM_TOKEN` repository secret
- [ ] The short-lived `token` created by `npm login` expires by itself on Oct 9; nothing to do

## 4. Get found

- [ ] [Google Search Console](https://search.google.com/search-console): add the URL-prefix property
      `https://sarveshtalele.github.io/tokentelemetry/`, verify, submit `sitemap.xml`
- [ ] Optional: PyPI for the Python SDK (`bash scripts/release-macos.sh --pypi`, needs a PyPI token)

## 5. Launch posts

All assets are in [`docs/launch/`](launch/).

| Where | File | Tip |
|---|---|---|
| Instagram reel | [`video/launch-reel-1080x1920.mp4`](launch/video/launch-reel-1080x1920.mp4) (32s) | Silent: pick a trending track in Instagram. Cover: `launch-reel-poster.png` |
| Instagram reel / Stories / Shorts | [`video/teaser-reel-1080x1920.mp4`](launch/video/teaser-reel-1080x1920.mp4) (16s) | Post a day before or after the main reel |
| LinkedIn post | [`linkedin-1200x627.png`](launch/linkedin-1200x627.png) or [`linkedin-portrait-1080x1350.png`](launch/linkedin-portrait-1080x1350.png) | Portrait takes more of the feed |
| X / Slack / Discord | the repo link (uses the social preview) | |
| Product Hunt | [`PRODUCT_HUNT.md`](launch/PRODUCT_HUNT.md) | Copy, gallery order and first comment |

- [ ] Instagram launch reel
- [ ] Instagram teaser
- [ ] LinkedIn post
- [ ] Product Hunt
- [ ] Reply to early issues and Discussions in the first week
