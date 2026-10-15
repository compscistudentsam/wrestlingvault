# Wrestling Vault

A wrestling match library with cover art for Windows, built with Electron, React and TypeScript. This is **Phase 1: the visual foundation and desktop prototype**, not the complete archive.

## Run on Windows 10/11

Install [Node.js 24 LTS](https://nodejs.org/) and Git, then open PowerShell:

```powershell
git clone --branch feature/phase-1-ui https://github.com/compscistudentsam/wrestlingvault.git
cd wrestlingvault
npm.cmd ci
npm.cmd run dev
```

The first Electron launch downloads its runtime with checksum verification. Internet access is needed for installation. The app then browses its bundled sample data, fonts and artwork offline. No API keys, accounts, database service, or paid APIs are needed.

`npm run dev` builds the main/preload processes, starts Vite and opens the desktop window. Renderer changes reload automatically. Restart the command after main/preload changes. Closing Electron also stops Vite. Port 5173 must be free; the command fails instead of silently using another port.

To review the production frontend inside Electron:

```powershell
npm.cmd run build
npm.cmd start
```

This is a local application launch, **not an installer**. Windows installer configuration, Windows CI and distribution remain in Phase 6. No release is published automatically. Signing and Windows SmartScreen behaviour must be assessed during release work.

## Browse

Only match covers and browsing controls are shown. The top-centre **Random** button flicks through the sleeves, slowing to a randomly chosen match. With system reduced motion enabled, it selects immediately. Click a side cover to select it and the centre cover to open a larger view. Use the arrows, Left/Right, Home/End, horizontal trackpad gestures or touch swipes to browse. Enter opens the focused gallery’s selection; Back to covers or Escape returns to the same match.

There is no sidebar, search, filter, grid option, match table or settings screen. The operating system’s reduced-motion preference is respected. The twelve sample records, artwork and fonts work offline.

PowerShell users should use `npm.cmd` to avoid the script-wrapper execution-policy error without changing system policy.

## Data and artwork limitations

There are **12 sample records from 1989–2024**. They are not a complete historical archive. Rating references are linked to IWNerd or WrestlePurists, but their pages were blocked by the development environment's network policy. The expanded cover view labels verification as pending. Do not treat reference-linked records as independently verified. See [data provenance](docs/data-provenance.md) for the outstanding review.

All arena imagery is original vector artwork, not photography of the matches. It requires no third-party photograph licence. Each card preserves readable typography and a themed CSS backdrop if an asset fails. No copyrighted photo collection was scraped. Descriptions are original short summaries; no source article text is reproduced. Sources open in the system browser and require a connection. No verified viewing links are currently provided.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:ui
npm.cmd run test:desktop
npm.cmd run test:desktop -- --development
```

The desktop smoke tests open and close a real Electron window. The production smoke test requires `npm run build` first. On Linux, a working X11 display (or Xvfb) and Electron system libraries are required. `WV_CHROMIUM_PATH` can select an existing Chromium binary for browser tests; the default uses Playwright's browser. `npm run dev:web` starts the renderer alone for browser inspection and does not exercise Electron's preload.

On Linux, development and desktop smoke tests use Chromium's user-namespace sandbox via `--disable-setuid-sandbox`; they never pass `--no-sandbox`. The host must permit user namespaces. In this cloud executor, its outer filesystem sandbox makes `/proc/self/uid_map` read-only, so native desktop commands require execution outside that outer shell sandbox. This preserves Chromium's own renderer sandbox. Browser-only work remains available inside the ordinary shell sandbox. For a production Electron launch on Linux, use `npm start -- --disable-setuid-sandbox` under the same host requirements. Windows needs no Linux flags.

Screenshots and test reports are generated in ignored `artifacts/screenshots`, `test-results` and `playwright-report` folders. See [Phase 1 review](docs/phase-1-review.md) for the validation record and manual Windows checklist.

## Architecture

```text
electron/                 Main process and sandbox-compatible preload
src/shared/               Typed IPC contract and security validation
src/data/                 Local samples, provenance links and formatting
src/components/           Cover flow and portrait artwork
src/App.tsx               Cover browser and expanded match view
src/styles.css            Tailwind theme and responsive component styles
public/art/               Original, bundled vector arena illustrations
scripts/                  Development/build orchestration and Electron smoke test
tests/unit/               Data-integrity and security-boundary tests
tests/ui/                 Browser interaction, responsive and screenshot checks
```

Electron 44, React 19, Vite 8, TypeScript 5.9, Tailwind 4, Motion for React and Lucide are pinned in `package-lock.json`. The installed Node 24 runtime satisfies all engine requirements. Tailwind 4's CSS-first configuration lives in `src/styles.css`; there is no legacy Tailwind config file. Semantic native controls are used where a component library would add no benefit. Recharts and a SQLite driver are intentionally deferred until their phases. Electron-builder is available as development tooling; release configuration is deferred.

No installation step edits sample data or other source files. Dependencies and generated build outputs are ignored. Secrets, local databases and environment files must remain untracked.

## Approval gate

Work lives on `feature/phase-1-ui`. **Do not merge into `main` or begin Phase 2 without explicit user approval.** Passing checks does not supply approval. Visual revisions remain part of Phase 1. The full requested product direction is recorded in [the development brief](docs/development-brief.md).
