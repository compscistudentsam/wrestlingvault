# Phase 1 decisions

## Process boundary

Electron loads only the bundled frontend or, during local development, `http://127.0.0.1:5173/`. The renderer has no Node access. Context isolation, sandboxing and web security are enabled. It cannot open new windows, attach webviews, request device permissions or navigate to unrelated pages. All production HTTP, HTTPS and WebSocket requests from the default renderer session are blocked. Local fonts/images/JSON need no network.

The context bridge exposes exactly `getVersion(): Promise<string>` and `openExternal(url): Promise<void>`. Main-process handlers validate the sender's web contents, main frame, exact trusted document URL and argument count. External references accept only HTTPS on the exact sample-reference hosts, with no credentials or nonstandard ports. Invalid IPC requests reject. The external action opens the system browser, never a remote Electron window.

On Linux, development and desktop smoke launches select Chromium's user-namespace sandbox using `--disable-setuid-sandbox`, avoiding a root-owned SUID helper inside `node_modules`. This does not disable the renderer sandbox. The host must allow user namespaces; this cloud executor's outer shell filesystem sandbox requires an approved escalation for native desktop launches. Playwright's implicit sandbox-disabling default is explicitly overridden with `chromiumSandbox: true` and tested by checking the real application switches.

The CSP restricts scripts, fonts and images to bundled assets, denies plugins and forms, and allows only the local Vite WebSocket during development. Inline styles are allowed for Motion transforms and dynamic styles; inline scripts are not. A hash router keeps navigation local and supports `file:` builds without a server. Browser history works, and unknown routes provide a recovery action.

## UI/data separation

The renderer reads fifty bundled supplied matches and has two views: the full-width cover browser and an expanded cover with its title, event/date and source reference. Selection stays in React when navigating back. A top-centre Random button picks a target before animating through the sleeves, using a turning-page overlay and slowing timed steps. Navigation is locked during the animation; route changes and unmounting clear the timer. System reduced motion bypasses the animation. Hash routes support bundled `file:` loads, browser history and direct match links.

Artwork is shared between both views. Original SVG arena illustrations combine with live match typography; missing images retain the CSS backdrop and text. Nearby covers load eagerly and others lazily. The operating system’s reduced-motion preference controls transitions.

## Current scope

The latest user request explicitly reduces the product to clickable match covers. Sidebar navigation, search, filtering, sorting, collection shortcuts, grid/table views, settings and future-feature screens are removed along with their unused components and query code. The earlier development brief’s broader UI requirements are superseded by this request.

No database, ingestion, personal persistence, analytics, backend or release workflow has been added. This remains a Phase 1 visual revision; do not begin later phases or merge into main without explicit approval.

## Local video playback

The user additionally authorized a folder picker on startup and in-app video playback. The main process owns the selected directory for the session. A narrow IPC method accepts only bundled match IDs and enumerates video files in matching immediate subdirectories. Canonical paths must remain within the selected root; symbolic-link entries are excluded. The renderer receives display names and opaque `vault-video://local/` tokens, never arbitrary filesystem access. The protocol resolves only issued tokens, rechecks path containment and streams an opened file with explicit HTTP-style byte ranges, content type, length and range metadata for seeking. The CSP permits the media scheme without granting remote media access.

The renderer uses native video controls and stops playback by unmounting the player when returning to covers. Multiple files appear in a selector. Missing folders, cancellation, unreadable directories and unsupported media have recoverable messages. Selection is session-only; there is no database, persistence, transcoding or ingestion pipeline.

## Supplied catalogue update

The user authorized replacing the sample selection with their supplied top 50. `matches.json` preserves the CSV ranking, with one explicit local image path per match and image-type metadata. `cover-provenance.json` retains source metadata and content hashes. Event posters and wide match graphics are fitted in the cover rather than cropped; three-way matches display all three sides. Existing match IDs and prior folder aliases are retained where the date and participants identify the same match. The cover flow renders only the seven visible sleeves. Random scales frame durations for the larger catalogue and uses a 4.5-second elapsed-time limit to land on its selected target even under rendering load.

## Library controls and flat-folder indexing

The latest user request authorizes search suggestions and animated selection, company filtering, downloaded highlighting, browsing sounds, player skips and Google search links for missing videos. Suggestions are scoped to the company-filtered catalogue; selecting one animates to its exact match ID. Downloaded mode is visual highlighting, retaining missing covers in greyscale while restricting Random to available files.

`electron/video-index.ts` scans the user-selected global folder and optional existing nested directories. It recognizes exact IDs, prior directory aliases and filename participant/event/date clues. Ties remain unmatched. Symlinks are skipped and every canonical file path must remain inside the selected root. Availability IPC returns only matched IDs; file paths remain in the main process and playback continues through opaque media tokens. Rescanning updates the index on demand. Google links use the validated exact HTTPS search host and `/search` path. Synthesized Web Audio ticks require a user gesture and can be muted.

Netflix Sans is selected through local font names only, with bundled Inter as fallback. No proprietary font binary was supplied or downloaded. Keyboard seeking applies only in the player and leaves inputs and selectors alone; explicit buttons and double-click regions provide mouse seeking.

## Player seeking and resizing correction

`electron/video-response.ts` serves the authorized file through a Node file stream. It handles full GET, HEAD, explicit/open-ended/suffix byte ranges, HTTP 206 and unsatisfiable HTTP 416 responses, without reading an entire movie into memory. The protocol still accepts only issued tokens and canonical paths within the selected folder. Renderer playback has explicit play/pause and a seek timeline, duration/seekable metadata fallback, ten-second controls and mouse/keyboard seeking. The player fills the available content width and derives video height from the window rather than using the previous 1100px cap. The supplied WWF PNG is used unchanged for the header, browser favicon and Electron window icon.

`npm run test:player` launches the actual built main/preload/renderer with only the native folder chooser automated. It verifies exact byte-range payloads through Electron's protocol, playback controls and window resizing. `WV_HEADLESS=1` enables Linux headless execution with Chromium sandboxing retained.
