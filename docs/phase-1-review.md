# Phase 1 review

## Current design

The latest user reference changes the initial streaming homepage to a compact media library. Discover now opens a cover-flow browser: portrait match sleeves surround a large central selection, with a linked match list below. The interface removes the welcome copy, slogans, repeated descriptions and large future-action panels. No person/video overlay or music visualizer is included.

Side covers select a match; the centre cover and Details button open its profile. Arrow buttons, Left/Right, Home/End, horizontal trackpad gestures and touch swipes browse the covers. The table follows the selection; its row buttons and double-click open the corresponding event. A grid toggle presents the same results as portrait covers. Filters, view and selection survive a trip into match details.

The sidebar provides collection and promotion shortcuts. More contains clearly unavailable future destinations. Match descriptions and source attribution remain in the compact detail page. The footer keeps the sample/verification status visible. Artwork uses original illustrated sleeves, not actual match photographs.

## Validation — 15 October 2026

| Check                                                | Result                                  |
| ---------------------------------------------------- | --------------------------------------- |
| TypeScript                                           | Passed                                  |
| Production frontend, Electron main and preload build | Passed                                  |
| Unit tests                                           | 23 passed                               |
| Browser tests                                        | 17 passed                               |
| Production Electron on Linux Xvfb                    | Passed                                  |
| Development Electron on Linux Xvfb                   | Passed                                  |
| Formatting and Git whitespace                        | Passed                                  |
| Interactive Windows testing                          | Not performed in this Linux environment |

Browser tests exercise cover selection, linked rows, opening the correct event when match names repeat, returning with the same filters/view/selection, keyboard wrapping and focus, wheel/swipe gestures, combined filters, sorting, reset/empty results, a single-result gallery, grid navigation, future destinations, reduced motion, failed artwork, search shortcuts and rapid animated navigation. Cover flow, grid and details are checked at 1920×1080, 1366×768, 960×640 and 430×932.

Both Electron smoke modes open real windows, exercise navigation/search and assert context isolation, renderer sandboxing, no renderer Node access, the exact preload API and rejection of unsafe IPC. Production checks the actual CSP violation for a blocked remote request. Linux uses the Chromium user-namespace sandbox; `--no-sandbox` is never passed. Native checks run outside the cloud executor’s outer filesystem sandbox because that outer layer blocks the namespace’s `/proc/self/uid_map` write. Ordinary browser/build checks use normal permissions.

## Review on Windows

Close the running app. From your existing checkout in PowerShell:

```powershell
git pull --ff-only origin feature/phase-1-ui
npm.cmd run dev
```

No dependencies changed in this revision. For a fresh clone, run `npm.cmd ci` first. `npm.cmd` avoids PowerShell’s script-wrapper execution-policy error without changing system policy.

1. Click a side sleeve, then the centre sleeve. Return and confirm the same match remains selected.
2. Use the gallery arrows, keyboard arrows and the row list. Open two Omega/Okada matches from different events.
3. Switch between Covers and Grid. Search “Omega”, combine filters, and reset.
4. Try a laptop resolution and Windows scaling at 125%/150%; scroll the match list.
5. Check reduced motion in Settings and the OS. Browse offline after installation.

## Screenshots

Browser captures are generated in ignored `artifacts/screenshots/`:

- `discover-desktop.png` — cover flow and compact list at 1920×1080.
- `discover-laptop.png` — the same interface at 1366×768.
- `collection.png` — portrait cover grid.
- `match-details.png` — compact match profile.

Desktop smoke checks also capture `electron-production.png` and `electron-development.png`. These are Linux captures, not evidence of Windows testing. Screenshots and test outputs are not committed.

## Remaining limitations

The catalogue is still 12 manually authored, reference-linked samples. Independent historical verification remains outstanding; see [data provenance](data-provenance.md). The reference hosts were blocked during the original work. This visual revision does not claim source verification, completeness, photo licensing or access to match video.

Git push works. GitHub API access still returned `Forbidden` on 15 October 2026, so a PR cannot be created through the API. The feature branch is reviewable at [main...feature/phase-1-ui](https://github.com/compscistudentsam/wrestlingvault/compare/main...feature/phase-1-ui).

No database, imports, personal persistence, analytics, installer or later-phase functionality has been added. Work stays on `feature/phase-1-ui`.

**Explicit design approval is required before Phase 2 or merging into `main`.**
