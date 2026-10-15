# Phase 1 — covers only

The latest user request reduces Wrestling Vault to a clickable cover library. The window contains a small brand mark, full-width match covers, a top-centre Random button, previous/next arrows, the selected match’s short caption and its position. Clicking a side cover selects it; clicking the centre opens a larger cover with a title, event/date and rating-source link. Back or Escape returns to the same selection.

Sidebar panels, search, filters, sorting, grid options, match tables, settings and future-feature screens have been removed, along with unused components and query code. System reduced-motion preferences, keyboard browsing, trackpad/touch gestures, missing-image fallbacks and the secure Electron boundary remain.

Random selects uniformly from all twelve samples, flicks through at least one full pass and slows to a stop. Browsing controls are locked during the short animation. Reduced motion selects immediately, and leaving the library cancels pending flips.

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

The twelve samples remain reference-linked and unverified; see [data provenance](data-provenance.md). Covers use original illustrations, not actual match photography. No database, ingestion, personal persistence, analytics or installer is included.

Work remains on `feature/phase-1-ui`. Explicit approval is required before Phase 2 or a merge into `main`.
