# Windows installer and release

The first release is an unsigned, per-user Windows x64 NSIS installer. Download `Wrestling-Vault-Setup-0.1.0-x64.exe` from GitHub Releases and run it. It installs Electron and the app together, adds desktop/Start Menu shortcuts and an uninstaller, and allows choosing an install directory. No developer tools are needed on the destination PC.

## Identity and data

The application ID is `com.wrestlingvault.app`; the product name is Wrestling Vault. Data stays in `%APPDATA%\wrestling-vault`, matching the source app's existing profile. Upgrades and uninstall preserve that profile. Videos and the selected folder's `images` directory stay outside the installation. No videos, user data, tokens or development environment files are packaged.

On a different PC choose its video folder and reconnect GitHub inside the app to obtain saved personal matches. Windows credential encryption is tied to the Windows user, so copying the encrypted credential is not a portable login method.

GitHub library sync continues to use `feature/phase-1-ui`. It syncs catalogue/artwork only; application updates require running a newer installer. Packaging code lives on `feature/phase-6-release`; no merge into main is implied by creating a release tag.

## Build and publish

On Windows with Node 24 and Git:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run dist:win
```

The installer appears in `release/`. `npm run pack:dir` builds an unpacked app for checking packaged file layout. Generated outputs are ignored by Git.

The `Windows installer` GitHub Actions workflow validates/tests/builds on `windows-latest`, launches the actual packaged executable, and uploads the installer/checksum and a packaged-app screenshot. A matching `v<package.json version>` tag publishes the verified assets as a GitHub prerelease. Packaging-branch pushes touching the workflow/config/scripts build artifacts without publishing. Publishing uses GitHub's job-scoped token; no PAT or signing key is embedded.

The Windows smoke test uses an isolated CI account/profile and checks startup, production preload/IPC, folder restoration, catalogue/grid rendering, details and the edit dialog. It refuses to replace an existing profile and is intentionally restricted to Windows CI. Artifact checks and an automated app launch do not establish that an installer has been interactively exercised.

## Signing and manual checks

The initial build has no code-signing certificate. Windows may show SmartScreen/Unknown Publisher. The release includes a SHA-256 checksum generated from the installer; verify the file came from this repository's release before running it. No certificate is required for a personal unsigned build. A future signed public release needs a signing identity/service and separate validation.

On the destination PC verify installation, desktop/Start Menu launch, playing/seeking/fullscreen with a real local video, live CAGEMATCH/Google import, GitHub sync, upgrade and uninstall. This cloud task does not claim manual Windows validation. Retain a backup of `%APPDATA%\wrestling-vault` before moving PCs or removing personal data.
