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

There is no sidebar, search, filter, grid option, match table or settings screen. The operating system’s reduced-motion preference is respected. All 50 match records, cover images and fonts work offline. Covers follow the supplied rank order, highest rating first.

PowerShell users should use `npm.cmd` to avoid the script-wrapper execution-policy error without changing system policy.

## Local video playback

The desktop app asks for your video folder on each launch. Cancel to browse covers without playing; use **Choose video folder** in the header to retry or switch folders. Clicking the centre cover opens the in-app player. Files stay on your computer.

Create one subfolder per match. Use the match ID shown in the missing-video screen, for example:

```text
Wrestling Videos/
  omega-okada-dominion-2018/
    match.mp4
  omega-okada-wk11-2017/
    part1.mp4
    part2.mp4
```

Full names such as `Kenny Omega vs. Kazuchika Okada - Dominion 6.9 in Osaka-jo Hall - 2018-06-09` also work. A title-only folder works, but use IDs for repeated opponents to avoid showing the same video for different events. Videos must be directly inside the match folder. Multiple parts appear in a selector, sorted by filename. Playback uses native controls for pause, volume, seeking and fullscreen; returning to covers stops playback.

MP4 (H.264/AAC) and WebM are recommended. M4V, MOV and MKV files are discoverable, but playback depends on Electron's supported codecs; the app does not transcode. Browser previews cannot select or play desktop-local videos. No video folder choice or playback history is persisted.

## Data and artwork limitations

The catalogue contains the **50 matches supplied in `Meltzer_Top_50_Match_Covers.zip`**, ordered exactly by its `sources.csv`: rating descending, then date ascending, with same-day ties ordered by match name. The supplied selection runs from 1989 to 2026 and stops partway through the matches tied at 5.5 stars. It is a supplied selection, not an independently verified or official ranked list.

Every card uses its corresponding supplied photo, match graphic or event poster. Full images are fitted inside the cover so landscape graphics and poster text are retained. The Flair/Steamboat illustration is a rivalry image, not a verified photograph of the exact Landover bout. The application retains readable names and a CSS backdrop if a cover fails to load.

Original CSV, collection notes and per-image provenance are preserved in `docs/top50/` and `src/data/cover-provenance.json`. Image ownership/licences were not supplied. See [data provenance](docs/data-provenance.md) and [asset notices](docs/THIRD_PARTY_NOTICES.md). No match footage is included; videos come from your selected local folder.

Seven existing matches retain their original IDs for video-folder compatibility. Their former title/event folder names also remain supported. The other five-star examples have been replaced by the supplied top 50. For new matches, use the folder ID shown by the player when a video is missing.

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

The desktop smoke tests open and close a real Electron window. Cancel the startup video-folder dialog when running these checks interactively. The production smoke test requires `npm run build` first. On Linux, a working X11 display (or Xvfb) and Electron system libraries are required. `WV_CHROMIUM_PATH` can select an existing Chromium binary for browser tests; the default uses Playwright's browser. `npm run dev:web` starts the renderer alone for browser inspection and does not exercise Electron's preload.

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
public/art/               Bundled supplied covers and arena fallbacks
scripts/                  Development/build orchestration and Electron smoke test
tests/unit/               Data-integrity and security-boundary tests
tests/ui/                 Browser interaction, responsive and screenshot checks
```

Electron 44, React 19, Vite 8, TypeScript 5.9, Tailwind 4, Motion for React and Lucide are pinned in `package-lock.json`. The installed Node 24 runtime satisfies all engine requirements. Tailwind 4's CSS-first configuration lives in `src/styles.css`; there is no legacy Tailwind config file. Semantic native controls are used where a component library would add no benefit. Recharts and a SQLite driver are intentionally deferred until their phases. Electron-builder is available as development tooling; release configuration is deferred.

No installation step edits sample data or other source files. Dependencies and generated build outputs are ignored. Secrets, local databases and environment files must remain untracked.

## Approval gate

Work lives on `feature/phase-1-ui`. **Do not merge into `main` or begin Phase 2 without explicit user approval.** Passing checks does not supply approval. Visual revisions remain part of Phase 1. The full requested product direction is recorded in [the development brief](docs/development-brief.md).
