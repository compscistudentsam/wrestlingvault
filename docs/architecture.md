# Phase 1 decisions

## Process boundary

Electron loads only the bundled frontend or, during local development, `http://127.0.0.1:5173/`. The renderer has no Node access. Context isolation, sandboxing and web security are enabled. It cannot open new windows, attach webviews, request device permissions or navigate to unrelated pages. All production HTTP, HTTPS and WebSocket requests from the default renderer session are blocked. Local fonts/images/JSON need no network.

The context bridge exposes exactly `getVersion(): Promise<string>` and `openExternal(url): Promise<void>`. Main-process handlers validate the sender's web contents, main frame, exact trusted document URL and argument count. External references accept only HTTPS on the exact sample-reference hosts, with no credentials or nonstandard ports. Invalid IPC requests reject. The external action opens the system browser, never a remote Electron window.

On Linux, development and desktop smoke launches select Chromium's user-namespace sandbox using `--disable-setuid-sandbox`, avoiding a root-owned SUID helper inside `node_modules`. This does not disable the renderer sandbox. The host must allow user namespaces; this cloud executor's outer shell filesystem sandbox requires an approved escalation for native desktop launches. Playwright's implicit sandbox-disabling default is explicitly overridden with `chromiumSandbox: true` and tested by checking the real application switches.

The CSP restricts scripts, fonts and images to bundled assets, denies plugins and forms, and allows only the local Vite WebSocket during development. Inline styles are allowed for Motion transforms and dynamic styles; inline scripts are not. A hash router keeps navigation local and supports `file:` builds without a server. Browser history works, and unknown routes provide a recovery action.

## UI/data separation

Pure functions own catalogue filtering and collection membership. Components receive records; UI code performs no filesystem or database operations. The JSON shape is an intentionally small view model, not the future SQLite schema. Duplicate match titles use stable unique IDs incorporating the event/year. Quarter-star ratings use exact binary-representable increments of 0.25, and display preserves precision.

Session UI state stays in React. A future persistence adapter can replace the sample provider without exposing SQL or arbitrary filesystem access to the renderer. There is no mock watchlist presented as persistent functionality.

The artwork component shares one pipeline between hero and landscape cards. Bundled original illustration variants use the match's palette; image failures fall back to CSS colour, texture and live text. Optional approved photography and portrait layouts can extend that component after asset rights and product needs are established. No remote asset loading is implemented.

All sample data is synchronous and bundled, so the interface does not simulate loading with an artificial delay or show a misleading skeleton. Add meaningful skeletons when real asynchronous data is introduced. Fonts are bundled locally and use `font-display: swap` from Fontsource. Only Latin subsets needed by this prototype are imported. Images are lazy-loaded except the featured hero.

## Scope

No database, ingestion, personal collection, generated analytics, recommendation engine, backend, updater or release pipeline is present. The installed electron-builder package is reserved for the authorised release phase. shadcn/ui and Recharts are not added just to populate the dependency list; native semantic controls are sufficient for this phase.
