# Wrestling Vault development instructions

- Read `docs/development-brief.md` and `README.md` before development.
- The current visual direction is a compact media library with cover flow, portrait match sleeves and a linked match list, following the user’s reference. Keep library text minimal; see `docs/architecture.md`.
- Only Phase 1 is authorized. Do not implement SQLite, import pipelines, personal collections, analytics, Windows release CI or subsequent phases until the user explicitly approves that phase. Visual revisions remain Phase 1.
- Use the existing checkout. Cloud tasks are already isolated; do not create a Git worktree unless requested.
- Develop on the appropriate feature branch. Do not merge phase work into `main` without explicit user approval.
- Use npm and preserve the lockfile for reproducible installs. Run meaningful affected tests and `npm run typecheck`; rebuild before production Electron checks.
- Keep Node integration disabled and context isolation/sandboxing enabled. Keep IPC narrow, validate sender and payload, and allow only approved HTTPS reference destinations.
- Never fabricate data verification, historical completeness, Windows testing, or release results. Reference-linked samples are not verified until sources are actually checked.
- Preserve the distinction between original arena art and real match photography. Never scrape or bundle unauthorised photographs.
- Keep secrets, local databases, node_modules, build outputs and test artifacts out of Git.
