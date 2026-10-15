# Phase 1 — covers only

The latest user request reduces Wrestling Vault to a clickable cover library. The window contains a small brand mark, full-width match covers, a top-centre Random button, previous/next arrows, the selected match’s short caption and its position. Clicking a side cover selects it; clicking the centre opens a larger cover with a title, event/date and rating-source link. Back or Escape returns to the same selection.

Sidebar panels, search, filters, sorting, grid options, match tables, settings and future-feature screens have been removed, along with unused components and query code. System reduced-motion preferences, keyboard browsing, trackpad/touch gestures, missing-image fallbacks and the secure Electron boundary remain.

Random selects uniformly from all 50 supplied matches and flips through covers before landing on its target. Rendering is limited to seven visible sleeves, and the animation has a 4.5-second elapsed-time limit. Browsing controls are locked during the short animation. Reduced motion selects immediately, and leaving the library cancels pending flips.

## Review on Windows

Close the app, then run from the existing checkout:

```powershell
git pull --ff-only origin feature/phase-1-ui
npm.cmd run dev
```

Dependencies have not changed. A fresh checkout needs `npm.cmd ci` first. Click the sleeves, use Left/Right and Home/End, open the centre sleeve and return. Check laptop sizing and Windows display scaling.

## Validation

- TypeScript and production frontend/main/preload build passed.
- 17 unit tests passed, including all security tests; obsolete filtering/collection tests were removed with those features.
- 13 browser tests passed, covering navigation, selection retention, keyboard/wheel/swipe controls, local assets, missing images, reduced motion, random-pick landing/animation/cancellation and four viewports from 430×932 to 1920×1080.
- Real Electron production/development checks validate cover browsing, click-through, isolated preload, sandboxing and rejection of unsafe IPC. Production also checks CSP network denial.
- Actual interactive Windows testing remains outstanding.

Current screenshots are generated in ignored `artifacts/screenshots/discover-desktop.png`, `discover-laptop.png` and `match-details.png`. Desktop checks generate `electron-production.png` and `electron-development.png`. These are Linux captures.

The 50 supplied records remain reference-linked and independently unverified; see [data provenance](data-provenance.md). Covers use the 50 supplied photographs, graphics and event posters; their original mapping and provenance are preserved. No database, ingestion, personal persistence, analytics or installer is included.

Work remains on `feature/phase-1-ui`. Explicit approval is required before Phase 2 or a merge into `main`.

## Local player revision

Added the user-authorized session folder picker and in-app match video player. Validation: 19 unit tests, 15 browser tests (including generated-video playback and seeking), TypeScript and production build passed. The native Electron folder picker and custom media protocol still need interactive Windows validation; this environment has no desktop display.

## Supplied top 50 revision

The catalogue now follows all 50 rows of the user-supplied CSV, in exact rank order. Each image is copied unchanged and mapped by rank, event and date. Seven prior match IDs and video-folder aliases remain compatible. Three-way covers display all three sides. New catalogue tests validate ranking, unique IDs, metadata and every image digest; browser checks decode all 50 images and cover navigation, missing images, the final three-way match and Random landing.

Validation for this revision: 23 unit tests and 16 browser tests passed; TypeScript, production build, formatting and diff checks passed. All 50 supplied JPEGs decoded in the browser. Native Windows playback remains a manual validation step.

## Search, local library and player controls revision

The user authorized live search suggestions with animated selection, company filtering, downloaded-cover highlighting, synthesized shuffle/page ticks with mute, flat-folder video identification, mouse/keyboard player skipping, missing-video Google search links and Netflix Sans when available. Matching uses exact IDs or participant/event/year/date clues and leaves ambiguous rematches unmatched. Existing nested folders remain optional and compatible.

Validation: 29 unit checks passed, including flat matching, ambiguous filenames, symlink exclusion and Google search URL restrictions. All 19 browser checks passed across the full regression run and the focused player rerun after fixing the native double-click/fullscreen conflict. The checks exercise search/Enter, company filtering, downloaded greyscale, sound/mute, mouse/button/keyboard seeking, missing-video searches and four window sizes. TypeScript, production build, formatting and diff checks passed. Native Windows folder selection and playback remain manual validation steps. Netflix Sans font binaries were not provided; the exact font is used only if installed, with Inter as fallback.

## Seeking, scaling and supplied logo correction

Local media now uses explicit byte-range streaming (206/416, range length and MIME headers) in place of delegated file fetching. The player provides explicit Play/Pause and timeline controls, seekable-duration fallback and ten-second mouse/button/keyboard seeking. The video fills the available width and grows with the application window. Header, favicon and Electron window branding use the unchanged user-supplied WWF PNG.

Validation: 41 unit tests passed, including full, bounded, open-ended, suffix and invalid range requests plus HEAD behavior. Six affected browser checks passed for logo loading, playback, timeline/skip controls and four window sizes. The real Electron production player passed in Linux headless mode with Chromium sandboxing: the actual custom protocol returned an exact 100-byte 206 payload; play/pause, forward/back skips, timeline seeking and window enlargement passed. TypeScript, production build, formatting and diff checks passed. Interactive testing of the user's own video files on Windows remains separate.

## CAGEMATCH top 100 library replacement

The user-supplied 100-match CAGEMATCH snapshot replaces the previous 50 entries and their images. All images are associated by supplied rank/date/fixture/event and copied without altering their JPG/PNG/WebP bytes. The original index, source notes and per-image hashes are retained. CAGEMATCH scores and nullable WON star ratings are distinct; eight unmatched star ratings display Unrated. The requested exact-star dropdown composes with company filtering, search and Random, including an empty-filter reset. Twenty-seven existing match IDs and video aliases remain compatible. Original Vault branding replaces the WWF logo.

Validation: 44 unit tests passed for the new catalogue, image mappings/digests, nullable ratings, current video filenames, shared IDs, byte-range responses and URL boundaries. Browser checks cover all 100 decoded images, company/star filters (including Unrated and empty combinations), existing library/player interactions and the restored logo. The real Electron player passed its byte-range, seeking, play/pause and window-resize checks against the replacement catalogue. TypeScript and production build passed. No Windows interactive result is claimed.
