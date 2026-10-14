# WRESTLING VAULT
## Master Development Brief — Windows Desktop Application

**Project:** Wrestling Vault\
**Repository:** `wrestling-vault`\
**Platform:** Windows 10/11\
**Application type:** Native-installable desktop application built with Electron\
**Primary objective:** A cinematic, Netflix-inspired archive of professional wrestling matches rated five stars or higher by Dave Meltzer.

---

# 1. YOUR ROLE

Act as the lead software engineer, technical architect, UI/UX designer and QA engineer for Wrestling Vault.

Your responsibility is to design and develop a polished, maintainable and fully functional Windows desktop application.

You should:

- Make reasonable technical decisions independently.
- Write production-quality code.
- Build working features, not static mockups.
- Test your work and resolve errors.
- Follow the design direction precisely.
- Maintain a clean GitHub development history.
- Work through development phases sequentially.
- Stop at mandatory approval checkpoints.
- Clearly identify limitations rather than fabricating completed functionality.

Do not ask unnecessary implementation questions. Choose sensible defaults and document important decisions.

**Critical instruction: Begin with Phase 1 only. Do not implement subsequent phases until I explicitly approve them.**

---

# 2. PROJECT VISION

Build a desktop application called **Wrestling Vault**.

It is a premium visual archive dedicated to the greatest matches in professional wrestling history, specifically those rated **5.0 stars or higher by Dave Meltzer in the Wrestling Observer Newsletter**.

The user should be able to discover, browse, research and track these matches in an experience resembling a modern streaming platform.

Think:

**Netflix's visual discovery experience + IMDb's information depth + a comprehensive wrestling-history archive.**

The application should feel cinematic, immersive and professional.

It must not feel like a conventional spreadsheet, basic web form or generic admin dashboard.

The archive should eventually cover qualifying matches across all promotions and eras, including WWE/WWF, NJPW, AEW, AJPW, NOAH, ROH, WCW and other applicable organisations.

The eventual application should support:

- Detailed match information.
- Match photography and artwork where appropriately licensed.
- Animated horizontal carousels.
- Browsing by year, decade, promotion and wrestler.
- Meltzer rating comparisons.
- Historical rankings.
- Personal watchlists.
- Watched/unwatched tracking.
- Personal match ratings.
- Statistics and visual analytics.
- Offline access to imported records.
- Controlled import of new match information.

The historical database must be expandable without major changes to the application.

---

# 3. TECHNICAL STACK

Use the following preferred stack.

| Component | Technology |
|---|---|
| Desktop framework | Electron |
| Frontend framework | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui where appropriate |
| Animations | Motion for React |
| Icons | Lucide React |
| Local database | SQLite |
| Database driver | Maintained Electron-compatible SQLite driver |
| Charts | Recharts |
| Build tool | Vite |
| Packaging | electron-builder |
| Package manager | npm |
| Source control | GitHub |
| Windows CI/CD | GitHub Actions |

Use mutually compatible stable versions.

Structure the application into separate layers for UI, Electron IPC, database access and data import.

### Electron security requirements

- Enable context isolation.
- Disable renderer Node.js integration.
- Use a minimal, strongly typed preload API.
- Validate all IPC request payloads.
- Do not expose unrestricted filesystem or shell access to the renderer.
- Do not execute arbitrary remote code.
- Restrict navigation to trusted application pages.
- Open external links through the system browser after URL validation.
- Use appropriate content security policies.

The application must not depend on any paid AI API or hosted backend for its core functionality.

---

# 4. DESIGN DIRECTION

## 4.1 Visual identity

The application's design is one of the highest priorities.

Create a premium, cinematic dark-themed desktop application.

The aesthetic should combine:

- Netflix-style browsing.
- Modern sports broadcasting.
- Elegant movie-poster presentation.
- Smooth transitions.
- Rich visual hierarchy.
- Carefully placed gold accents.
- High-quality match imagery where licensed.

The interface should be engaging even before users interact with it.

### Colour palette

| Element | Hex colour |
|---|---|
| Primary background | `#10131B` |
| Secondary background | `#1B2130` |
| Card background | `#222938` |
| Hover background | `#30394A` |
| Main text | `#FFFFFF` |
| Secondary text | `#A8B0C0` |
| Accent gold | `#E8B95B` |
| Borders | `#343A49` |
| Success green | `#33B783` |

Gold should identify ratings, featured matches, selected navigation items and important actions.

Do not overuse gold or gradients.

Typography should use Inter or a similar clean modern font.

## 4.2 Layout

Use a desktop-first layout designed primarily for 1920×1080 screens, while adapting smoothly to smaller Windows laptop displays.

Create a persistent navigation system containing:

- Discover
- All Matches
- Promotions
- Wrestlers
- Timeline
- Statistics
- My Watchlist
- Settings

Use a premium sidebar or horizontal navigation layout.

Ensure the active page is clearly indicated.

Use strong spacing, consistent typography, restrained shadows and subtle borders.

## 4.3 Visual design requirements

Implement:

- Cinematic hero artwork.
- Smooth horizontal scrolling.
- Hover enlargement on match cards.
- Elegant image overlays.
- Polished navigation transitions.
- Skeleton loading states.
- Clean empty states.
- Responsive card grids.
- Accessible focus indicators.
- Keyboard navigation.
- Reduced-motion support.

Animations should enhance the experience without sacrificing performance.

## 4.4 Images

**Match imagery is a central part of the design.**

The intended aesthetic relies on visually rich cards featuring wrestling action and historic moments.

However:

- Do not assume images found online are free to reuse.
- Do not automatically scrape copyrighted wrestling photographs.
- Use appropriately licensed, authorised or user-provided assets.
- Support images being added later through the database.
- Provide attractive visual fallback artwork when images are unavailable.

Fallback cards should still look cinematic, using typography, gradients, wrestler names, dates, star ratings and tasteful design elements.

Do not make the design dependent on acquiring copyrighted photographs.

Build a reusable image system capable of supporting hero images, landscape thumbnails, portrait posters and wrestler profile images.

---

# 5. DISCOVER PAGE

The Discover page is the application's main visual experience.

It must feel like the home screen of a premium streaming platform.

## 5.1 Featured match hero

Create a large, cinematic featured-match banner at the top.

It should display:

- Match artwork or premium fallback.
- Wrestler names.
- Promotion.
- Event.
- Match date.
- Meltzer star rating.
- Brief factual description.
- View Match button.
- Add to Watchlist button.

Example:

**Kenny Omega vs. Kazuchika Okada**

NJPW — Dominion 6.9 — 2018\
Dave Meltzer Rating: ★ 7.0

The image should occupy most of the banner, with an elegant dark gradient helping the text remain readable.

Include previous/next controls for featured matches.

Optional autoplay should be subtle and configurable.

## 5.2 Horizontal carousels

Below the hero, implement horizontally scrollable match collections.

Suggested sections:

1. Greatest Matches of All Time
2. Recently Added
3. The 1980s
4. The Golden Age: 1990s
5. The 2000s
6. The 2010s
7. Modern Classics
8. New Japan Pro Wrestling Classics
9. WWE / WWF Classics
10. All Elite Wrestling
11. Six Stars and Beyond
12. Hidden Gems
13. Continue Your Wrestling Journey

Each carousel should:

- Display approximately 3–5 cards depending on screen size.
- Support arrow-based horizontal navigation.
- Support touchpad scrolling and practical mouse interaction.
- Animate smoothly.
- Use landscape images.
- Display a gold star rating.
- Show the match title, promotion and year.
- Provide hover effects.
- Open match details when selected.

Do not hardcode collection contents.

Derive carousel contents from the database.

Hide empty collections.

If a collection uses a subjective title such as "Hidden Gems", define and document its selection criteria.

## 5.3 Match cards

Create a reusable `MatchCard` component.

Cards must support:

- Artwork or visual fallback.
- Match title.
- Promotion and event.
- Year.
- Meltzer rating.
- Hover expansion or emphasis.
- Quick watchlist action.
- Click-through navigation.

Cards should feel like movie thumbnails rather than table rows.

Use sensible title truncation for long multi-person match names.

---

# 6. MATCH DETAILS PAGE

Clicking a match opens a full match profile.

This page should resemble a streaming platform's film-details page.

## Hero area

Display:

- Large landscape artwork.
- Wrestler names.
- Event name.
- Promotion.
- Match date.
- Meltzer star rating.
- Match type.
- Championship and stipulation where relevant.

## Match information

Include:

- Wrestlers and teams.
- Promotion.
- Event.
- Date.
- Location or venue.
- Match duration.
- Stipulation.
- Championship.
- Verified historical background.
- Source of rating.

Do not fabricate missing information.

Descriptions should avoid revealing the winner by default.

If spoiler information is included in future, display it behind a spoiler control.

## Actions

Include:

- Add to Watchlist.
- Mark as Watched.
- Add to Favourites.
- Give Personal Rating.
- Add Personal Notes.
- Open Verified Watch Link.

External watch links should point to legitimate viewing services or official sources.

If no verified viewing link exists, hide or disable that action with a clear explanation.

## Related matches

Display a carousel of related matches based on shared wrestlers, promotion, era and rating.

This recommendation system must function locally without AI APIs.

---

# 7. HISTORICAL MATCH DATABASE

The complete application should support an extensive archive of qualifying Meltzer-rated matches.

**Only actual Dave Meltzer ratings of at least 5.0 stars qualify for the primary archive.**

Do not substitute CAGEMATCH community ratings or other user-generated ratings.

## 7.1 Database entities

Implement a normalised SQLite schema with appropriate relationships.

Core entities should include:

- Matches
- Wrestlers
- Promotions
- Events
- Match participants
- Teams and team participants where needed
- Sources
- Artwork references
- User watchlists
- Personal ratings
- Watch history
- Personal notes

## 7.2 Match fields

Support:

| Field | Purpose |
|---|---|
| ID | Unique match identifier |
| Title | Display match name |
| Wrestlers | Participants |
| Teams | Team associations |
| Promotion | Wrestling organisation |
| Event | Event name |
| Date | Date match took place |
| Year | Derived from date |
| Meltzer rating | Official published star rating |
| Match type | Singles, tag, multi-person, etc. |
| Stipulation | Applicable special rules |
| Championship | Championship contested |
| Duration | Match duration |
| Venue | Location |
| Description | Verified synopsis |
| Image reference | Optional approved image |
| Watch URL | Official watch link |
| Source URL | Rating reference |
| Verification status | Verified, unverified or disputed |
| Date added | Import timestamp |

Use appropriate numeric handling for fractional ratings, including quarter-star ratings and ratings above five stars.

Store full rating provenance separately where useful.

Support historical promotion naming and wrestler aliases.

## 7.3 Sources to investigate

Potential reference sources include:

- WrestlePurists — Dave Meltzer Match Ratings Database\
  https://wrestlepurists.com/dave-meltzer-match-ratings-database/

- CAGEMATCH\
  https://www.cagematch.net/

- IWNerd — Dave Meltzer Five-Star Match Lists\
  https://www.iwnerd.com/dave-meltzer-5-star-matches-list/

These are candidate research sources, not approved bulk data APIs.

Before importing material automatically:

- Verify applicable website terms.
- Respect robots rules and rate limits.
- Do not bypass access controls.
- Check whether bulk extraction or redistribution is permitted.
- Preserve source attribution.
- Cross-check disputed records.
- Do not claim historical completeness without evidence.

## 7.4 Import system

Provide a local CSV and JSON import pipeline.

It must:

- Validate required fields.
- Preview pending imports.
- Identify duplicates.
- Detect existing wrestlers and promotions.
- Support record corrections.
- Flag unverified records.
- Preserve existing user data.
- Show import errors.
- Support idempotent re-importing.
- Store attribution.

Provide an example CSV and a schema reference.

Start with a small, historically verified dataset.

Never misrepresent sample data as the complete archive.

## 7.5 Offline support

After records have been imported, users must be able to browse and use the application offline.

No cloud database is required.

Persist the SQLite database in Electron's user-data directory.

Ensure database migrations preserve user data during upgrades.

---

# 8. ALL MATCHES PAGE

Create two browsing modes:

**Visual Grid View**

Default mode, featuring attractive match cards.

**Compact Table View**

An optional information-dense view for research.

Support instant search across:

- Wrestler names
- Event names
- Promotions
- Match titles
- Years

Provide filters for:

- Promotion
- Year
- Decade
- Wrestler
- Rating
- Match type
- Watched status
- Favourite status
- Verification status

Sorting options:

- Highest rated
- Lowest rated
- Newest
- Oldest
- Recently added
- Alphabetical
- Personal rating

Support combined filters and a Reset Filters action.

Show the number of matching results.

Maintain fast performance using efficient database queries, pagination or virtualisation.

---

# 9. PROMOTIONS PAGE

Provide a visual directory of wrestling promotions represented in the database.

Examples include:

- NJPW
- WWE / WWF
- AEW
- AJPW
- NOAH
- ROH
- WCW
- ECW

Generate available promotion pages dynamically rather than using a fixed hardcoded list.

A promotion page should show:

- Promotion identity.
- Total verified 5+ matches.
- Highest-rated match.
- Oldest qualifying match.
- Most recent qualifying match.
- Featured wrestlers.
- All qualifying matches.

Support a combined WWF/WWE historical view while preserving the original recorded promotion identity.

---

# 10. WRESTLER PROFILES

Create dynamically generated profiles for wrestlers in the database.

Display:

- Name.
- Optional approved image.
- Number of five-star-and-above matches.
- Highest-rated match.
- Earliest qualifying match.
- Most recent qualifying match.
- Promotion history represented in the archive.
- Most frequent opponents within qualifying matches.
- Full qualifying match list.

Support aliases and historical ring names.

Do not generate fabricated wrestler biographies.

---

# 11. HISTORICAL TIMELINE

Create a visual timeline for browsing by year and decade.

Users should be able to select a decade, then explore individual years.

Each year should contain:

- Number of qualifying matches.
- Highest-rated match.
- Promotions represented.
- Chronological match cards.
- Month-based groupings where useful.

Implement a smooth horizontal year selector.

Only display decades for which records exist.

---

# 12. STATISTICS DASHBOARD

Create an attractive analytics experience with:

- Number of 5+ matches by year.
- Match totals by promotion.
- Wrestlers with the most qualifying matches.
- Highest-rated matches of all time.
- Match rating distribution.
- Qualifying matches by decade.
- Average rating of qualifying matches by promotion.

Use Recharts or an appropriate alternative.

All statistics must derive from real database records.

Where the imported archive is incomplete, clearly indicate that rankings and counts reflect the available dataset.

---

# 13. PERSONAL WATCHLIST

Provide a local personal collection system requiring no login.

Users should be able to:

- Add matches to a watchlist.
- Mark matches as watched.
- Favourite matches.
- Rate matches personally.
- Write notes.
- Record watched dates.

Create collection sections such as:

- Up Next
- Recently Watched
- My Favourites
- My Highest Rated

Display personal statistics:

- Total matches watched.
- Total unwatched.
- Watchlist count.
- Collection completion percentage.

Ensure all user information persists between launches.

Provide backup and restore functionality.

---

# 14. SURPRISE ME

Include a **Surprise Me** button for random match discovery.

By default, favour matches the user has not watched.

Allow optional filters for:

- Promotion.
- Decade.
- Minimum star rating.

Display the selected match in a cinematic discovery card with a button to open its details.

---

# 15. SETTINGS

Implement settings for:

**Appearance**
- Default dark theme.
- Animation preferences.
- Compact display mode.
- Reduced motion.

**Data**
- Import CSV/JSON.
- Export database.
- Database statistics.
- Backup and restore.
- Last import information.

**Personal Information**
- Export watchlist.
- Restore watchlist.
- Clear watch history with confirmation.

**About**
- Application version.
- Data sources.
- Image attribution.
- Licences.
- Disclaimer about the subjective nature of Meltzer ratings.

---

# 16. PERFORMANCE AND QUALITY

The application should:

- Start quickly.
- Scroll smoothly.
- Remain responsive during filtering.
- Use image lazy-loading.
- Cache thumbnails appropriately.
- Avoid unnecessary network requests.
- Handle missing records and assets gracefully.
- Support Windows display scaling.
- Work at common desktop and laptop resolutions.
- Provide keyboard accessibility.
- Respect operating-system reduced-motion preferences.

Do not preload every image in the archive.

Use error boundaries, input validation and useful diagnostic logging.

---

# 17. GITHUB DEVELOPMENT WORKFLOW

This project will use GitHub as its source-of-truth repository.

Repository name:

`wrestling-vault`

The default branch is:

`main`

Do not develop major features directly on `main`.

Instead, create development branches for each phase.

Suggested structure:

- `feature/phase-1-ui`
- `feature/phase-2-database`
- `feature/phase-3-browsing`
- `feature/phase-4-watchlist`
- `feature/phase-5-analytics`
- `feature/phase-6-release`

At the end of each phase:

1. Commit completed work to the relevant branch.
2. Run available checks and tests.
3. Provide a development summary.
4. Create a pull request if repository permissions support it.
5. Provide instructions for reviewing the application.
6. Stop and await explicit approval.

Do not merge a phase into `main` without approval.

Never commit:
- API keys.
- Credentials.
- `.env` secrets.
- Build caches.
- `node_modules`.
- Personal database files.
- Large unauthorised copyrighted image collections.

Maintain a suitable `.gitignore`.

Include a README documenting development, execution and packaging.

---

# 18. WINDOWS EXECUTABLE AND RELEASE PROCESS

The final application must be distributable as a Windows desktop executable.

Use electron-builder.

The release process should produce:

- A Windows installer `.exe`.
- Application files and dependencies.
- Versioned release artefacts.

Create a GitHub Actions workflow running on a Windows runner to build the application.

Configure the workflow so builds can run manually, without requiring automatic publication.

Where feasible, also support release builds from tagged versions.

### Packaging requirements

- No separate Node.js installation required for end users.
- Proper installation directory.
- Start Menu shortcut.
- Optional desktop shortcut.
- Uninstall support.
- Correct handling of writable SQLite data.
- User data preservation during application upgrades.
- Packaged asset paths must work correctly.

The CI pipeline should verify the application can be built.

Actual interactive testing on Windows should be documented separately.

Do not claim successful Windows desktop testing solely because a build command succeeded.

Unsigned installers may trigger Windows SmartScreen warnings. Document this limitation.

---

# 19. DEVELOPMENT PHASES

**The project must be implemented in six distinct phases.**

Do not attempt to complete all six phases in one Codex task.

## PHASE 1 — Visual Foundation and Desktop Prototype

**This is the only phase authorised initially.**

Build:

- Electron + React + TypeScript project.
- Tailwind configuration.
- Secure Electron main/preload setup.
- Premium dark-and-gold visual identity.
- Wrestling Vault branding.
- Navigation system.
- Cinematic Discover page.
- Featured match hero.
- Animated horizontal match carousels.
- Reusable match cards.
- Functional match detail pages.
- Search and basic visual filtering of sample records.
- Polished image/fallback system.
- Responsive desktop layout.
- Sample data stored locally in JSON or similar.
- Basic automated tests.
- Working local application launch.

The initial prototype should use a small selection of verified historical matches.

It does not yet require the complete SQLite archive.

Buttons shown during Phase 1 must work within the scope of the prototype. If a future feature is not implemented, show it as explicitly unavailable rather than displaying a misleading working control.

### Phase 1 visual acceptance requirements

The application must feel like a streaming platform.

The Discover page should include:

- Large hero image or cinematic fallback.
- Match details over a dark gradient.
- Prominent gold star ratings.
- Several attractive horizontal carousels.
- Clear navigation controls.
- Elegant transitions.
- High-quality typography.
- Consistent card styling.

Provide screenshots when the development environment supports screenshot capture.

Explain precisely how to launch the prototype locally.

**STOP AFTER PHASE 1.**

Do not start SQLite integration, full database ingestion or later phases until I personally approve the design.

I may request multiple rounds of visual revisions.

Treat those revisions as part of Phase 1.

## PHASE 2 — Database and Historical Data

After approval:

- Implement SQLite.
- Create migrations.
- Implement the database model.
- Build CSV/JSON import.
- Add duplicate checking.
- Build data validation.
- Implement source tracking.
- Populate permitted, verified historical records.
- Preserve sample data separation.
- Test database persistence.

Stop for approval.

## PHASE 3 — Complete Discovery and Browsing

After approval:

- Advanced search.
- Combined filters.
- All Matches grid and table.
- Promotion pages.
- Wrestler profiles.
- Timeline.
- Related-match recommendations.
- Database-driven carousels.

Stop for approval.

## PHASE 4 — Personal Collection

After approval:

- Persistent watchlist.
- Watched status.
- Favourites.
- Personal ratings.
- Personal notes.
- Progress tracking.
- User-data backups.
- Export and restore.

Stop for approval.

## PHASE 5 — Analytics and Final UX Polish

After approval:

- Statistics dashboard.
- Random match selection.
- Personal progress visualisation.
- UI refinements.
- Performance optimisation.
- Accessibility improvements.
- Loading and error states.
- Regression testing.

Stop for approval.

## PHASE 6 — Windows Release

After approval:

- Final installer configuration.
- GitHub Actions Windows build.
- Packaged-app validation.
- Versioning.
- Release documentation.
- Installation instructions.
- User acceptance testing checklist.
- Final bug fixes.

Do not publish or distribute a release automatically without explicit approval.

---

# 20. MANDATORY PHASE APPROVAL POLICY

**This is a strict requirement.**

At the end of every development phase:

1. Complete the planned phase.
2. Run tests and resolve known blocking issues.
3. Confirm what has actually been implemented.
4. Explain how I can review it.
5. Provide screenshots if available.
6. Identify any known limitations.
7. Create a reviewable GitHub change set or pull request when available.
8. Stop execution of further development work.

Only proceed after I explicitly confirm approval.

Do not interpret:
- Passing tests.
- Successful builds.
- Completed commits.
- A created pull request.
- An absence of feedback.

as permission to begin the next phase.

**My explicit approval is mandatory.**

For Phase 1, visual approval is particularly important.

Do not move on until I am happy with the appearance and interaction design.

---

# 21. PHASE 1 TESTING CHECKLIST

Before requesting Phase 1 approval, verify:

- Electron application launches in development mode.
- React renders correctly.
- All main navigation items render.
- Discover page appears as designed.
- Featured match displays sample data.
- Hero navigation works.
- Horizontal carousel arrows function.
- Card hover states work.
- Clicking a match opens its details.
- Search works against the sample dataset.
- No major layout overflow occurs.
- Missing images display beautiful fallbacks.
- Keyboard focus remains visible.
- Application logs contain no avoidable critical errors.
- TypeScript validation passes.
- Production frontend build passes.
- Any automated UI tests pass.

Where a check cannot be performed in the environment, state that explicitly.

Provide the commands necessary to run the prototype on my Windows PC.

---

# 22. FUTURE ENHANCEMENTS

These features are outside the initial six-phase scope but should be considered in architectural decisions.

### AI match discovery

Examples:

- "Show me the greatest 1990s wrestling matches."
- "Find matches similar to Omega vs Okada."
- "Which wrestler has the most five-star matches?"
- "Recommend an unwatched match from NJPW."
- "Show the highest-rated matches involving Bret Hart."

Start with deterministic search for these capabilities.

Optional LLM integration can be introduced later.

### Automated historical updates

Potentially ingest newly published ratings through authorised data feeds or approved import workflows.

Require verification before new records enter the historical archive.

### Community features

Potential future support for:

- Shareable lists.
- Community collections.
- Personal rating comparisons.
- Public wrestling recommendations.

These should not complicate the initial offline desktop architecture.

---

# 23. DEFINITION OF DONE

Wrestling Vault will eventually be considered complete when:

- The application launches on Windows.
- The interface meets the agreed cinematic design.
- The Discover page has functional carousels.
- Match detail pages work.
- Verified historical data is accessible.
- Search and filters function correctly.
- The archive supports multiple promotions and eras.
- Personal collections persist.
- Statistics are generated from real records.
- Data can be imported and exported.
- Core functionality works offline.
- The application can be packaged as a Windows installer.
- Basic automated and manual tests pass.
- Known limitations are documented.

The historical archive may still require future additions if a complete, properly licensed and verified dataset is not available.

Never present incomplete data coverage as complete.

---

# 24. FINAL EXECUTION INSTRUCTION

Begin working on **Phase 1 — Visual Foundation and Desktop Prototype** now.

Create a dedicated Git branch:

`feature/phase-1-ui`

Implement the actual application foundation and visually polished desktop interface.

Use the design palette and streaming-platform layout described in this brief.

Focus especially on:

1. A beautiful, cinematic Discover page.
2. A featured wrestling match hero section.
3. Image-rich horizontal match carousels.
4. Attractive match cards with gold star ratings.
5. Smooth navigation and hover animations.
6. Functional sample match detail pages.
7. Excellent fallback visuals where licensed images are unavailable.

Do not allow the absence of a complete dataset or external API access to delay Phase 1.

Use verified sample records and appropriately licensed visual assets or cinematic fallbacks.

Run the available checks, fix errors and commit the completed work.

If supported, create a pull request for review.

Provide:

- A summary of completed Phase 1 features.
- Screenshots or a preview when possible.
- Instructions for launching the application locally.
- Test and build results.
- Any outstanding issues.

**Then stop and wait for my explicit approval.**

Do not begin Phase 2.

The ultimate goal is a visually outstanding wrestling archive that makes exploring professional wrestling history feel like browsing a premium streaming service.
