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

The first Electron launch downloads its runtime with checksum verification. Internet access is needed for installation. The app then browses its bundled sample data, fonts and artwork offline. No account is needed for offline browsing or local additions. Optional GitHub library sync requires a repository-scoped access token; no credentials are bundled with the app.

`npm run dev` builds the main/preload processes, starts Vite and opens the desktop window. Renderer changes reload automatically. Restart the command after main/preload changes. Closing Electron also stops Vite. Port 5173 must be free; the command fails instead of silently using another port.

To review the production frontend inside Electron:

```powershell
npm.cmd run build
npm.cmd start
```

This is a local application launch, **not an installer**. Windows installer configuration, Windows CI and distribution remain in Phase 6. No release is published automatically. Signing and Windows SmartScreen behaviour must be assessed during release work.

## Browse

Use the **Cover view / Grid view** buttons immediately left of search to switch layouts. Cover view is the default. Grid view shows the same ranked library as a responsive grid; click any tile to open its match. Selection, company/star filters and downloaded highlighting are shared, and returning from a match keeps your chosen layout. Search and Random reveal the selected tile in the grid. Arrow keys, Home/End and the Previous/Next buttons still browse matches.

The library contains 100 supplied match covers in CAGEMATCH rank order. Click a side cover to select it and the centre cover to play its local video. Left/Right, Home/End, trackpad gestures and touch swipes also browse the covers.

- **Search**, at the top right, suggests matches by wrestler, event, year or company. Use Up/Down to choose a suggestion and Enter to flip to it. Click a suggestion for the same animation. Escape closes suggestions. Search follows the selected company.
- **Star rating** filters by the supplied WON star rating, including **Unrated** for the eight entries without a matched rating. It combines with company filtering and scopes search/Random to the remaining records. It does not filter on CAGEMATCH scores out of ten.
- **Company**, at the top left, shows only that company's matches. Co-promoted events appear under each participating company. **All companies** restores the full catalogue.
- **Random** spins through covers with synthesized wheel ticks. Ordinary browsing uses a short click. The **speaker button beside the title** toggles both sounds and shows whether they are muted. Reduced motion jumps straight to the result.
- **Downloaded only** keeps all covers visible but greys out those without a matched local video. Random then chooses only matched videos. Pick a video folder to enable this control; **Rescan videos** updates availability after files are added or removed.

Netflix Sans is the preferred font when installed on the host. No Netflix Sans font files were supplied, so the app uses its bundled Inter fallback when that proprietary font is unavailable. Exact offline bundling requires supplied font files with appropriate reuse rights. No external font request is made.

## Add your own match

Use **Add match** in the toolbar, paste a CAGEMATCH match link, review the details and choose artwork. Unknown ratings can stay blank. The match appears immediately and is saved locally, with uploads queued until GitHub is connected and reachable. In **GitHub connection**, create a fine-grained token for this repository with **Contents: Read and write**, then connect in the app. Details and images sync to `library/` on `feature/phase-1-ui`; the app checks for additions at startup and every five minutes. **Sync now / retry** runs a check immediately. Videos remain local.

See [personal library sync](docs/library-sync.md) for setup, offline recovery, metadata lookup limits and validation. CAGEMATCH lookup uses desktop Chromium networking. Ordinary HTTPS redirects are handled, and repeated redirects or a JavaScript access check use an isolated background browser that runs the page’s JavaScript and fills the review automatically. No browser operation or import click is needed when details load normally. If verification is required or the page does not become readable within 12 seconds, the browser is shown; details are still imported automatically once they appear. You can also choose **Import in app browser** directly, including during the background lookup cooldown. Manual entry and pasted-page text remain available. New matches are appended after the original 100 rather than re-ranking that supplied snapshot.

## Local video playback

The desktop app asks for one global video folder on each launch. Put videos directly in it; **no match subfolders are required**. Existing subfolders remain supported. Match identification ignores punctuation/case, recognizes wrestler surnames, distinctive nicknames and alternate ring names, and uses event/year/date clues to distinguish repeated matchups. Examples:

```text
Wrestling Videos/
  Okada vs Omega - Dominion 6.9 - 2018.mp4
  Ospreay vs Bryan Danielson - Dynasty - 2024.mp4
  Rainmaker vs Cleaner - WK11 - 2017.mp4
  American Dragon vs Aerial Assassin - Dynasty - 2024.mp4
  omega-okada-wk11-2017.mp4
```

Known aliases include Rainmaker/Okada, Cleaner/Omega, American Dragon or Daniel Bryan/Danielson, Aerial Assassin/Ospreay, HBK/Michaels, Gunther/WALTER, and team names such as FTR, Young Bucks and Briscoes. WK, WM and BOSJ abbreviations are supported. Generic nicknames such as `Dragon` or `Ace` alone are not used to guess an identity.

For an exact, unambiguous match, name a file after the match ID shown in its missing-video message. Ambiguous files such as `Okada vs Omega.mp4` are left unmatched rather than assigned to the wrong event. Videos stay on your computer. The app scans within the chosen folder (up to eight nested levels), skips symbolic links and keeps filesystem access in Electron's main process. Availability means a recognized local file exists, not that its codec has been validated. Use **Rescan videos** after changing the files.

Click a cover to open the in-app player. Use its **← 10s / 10s →** buttons, Left/Right keys while the player is focused, or double-click the left/right side of the video to skip ten seconds. Videos start muted; native volume controls let you unmute. Tap the video to pause/resume, or use the explicit Play/Pause button and seek timeline. The fullscreen button fills the desktop with the player and its controls; press it again or Escape to leave fullscreen. The video scales with the app window, including when maximized. Local files are streamed with byte-range responses so forward and backward seeks can request the required portion of the file. Multiple files/parts appear in a selector, ordered by filename. Back, or Escape outside fullscreen, stops playback and returns to covers.

Missing-video descriptions include a Google search link using the match name, event, year and `watch online`. Searches open in the system browser; the app does not download videos itself.

MP4 (H.264/AAC) and WebM are recommended. M4V, MOV and MKV are discoverable, but playback depends on Electron's codecs; the app does not transcode. Browser previews cannot scan local folders. Folder choice and playback history are session-only.

## Data and artwork limitations

The library is the user's **CAGEMATCH top 100 snapshot from 16 October 2026**, replacing the previous 50-match selection. The supplied rank order is preserved. CAGEMATCH community scores out of ten and Wrestling Observer Newsletter star ratings are stored separately; star ratings are copied from the filename suffixes and checked against the supplied CSV. Eight entries have no matched star rating and remain explicitly **Unrated**, rather than being assigned zero or excluded.

Each of the 100 matches uses its own supplied image, with its original format and bytes retained. The images include event/tournament posters, match graphics, photographs, programme/DVD covers and other artwork. An event poster is not a claim that the image depicts the exact bout. Full source metadata and image notes are preserved in `docs/cagematch-top100/INDEX.csv`, the supplied collection notes and `src/data/cover-provenance.json`.

The supplied snapshot is not independently verified and rankings can change. CAGEMATCH match-record links are available in the player details. See [data provenance](docs/data-provenance.md) and [asset notices](docs/THIRD_PARTY_NOTICES.md). No match footage is included. Videos continue to come from the selected global folder, with no subfolders required.

Twenty-seven shared matches retain their previous match IDs and video-name aliases. Matches outside the new selection have been removed from the active catalogue. Newly added matches have stable IDs based on their supplied CAGEMATCH record IDs.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:ui
npm.cmd run test:desktop
npm.cmd run test:player
npm.cmd run test:desktop -- --development
```

The player smoke test automates folder selection with a generated test clip and exercises the real Electron media protocol, byte ranges, seeking, play/pause and resizing. On Linux it also runs without a display using `WV_HEADLESS=1 npm run test:player`. Build first. The desktop smoke tests open and close a real Electron window. Cancel the startup video-folder dialog when running these checks interactively. The production smoke test requires `npm run build` first. On Linux, a working X11 display (or Xvfb) and Electron system libraries are required. `WV_CHROMIUM_PATH` can select an existing Chromium binary for browser tests; the default uses Playwright's browser. `npm run dev:web` starts the renderer alone for browser inspection and does not exercise Electron's preload.

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

The original Vault mark and favicon are restored. The WWF logo has been removed.
