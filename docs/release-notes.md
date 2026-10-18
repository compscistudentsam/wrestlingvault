First Windows desktop installer for Wrestling Vault.

Download `Wrestling-Vault-Setup-0.1.0-x64.exe` and run it. No Node.js, Git or separate Electron installation is needed. This is a per-user Windows x64 installation with desktop/Start Menu shortcuts and an uninstaller.

Includes the match catalogue, cover/grid layouts, filters, search, local video playback, match editing, automatic CAGEMATCH and artwork import, batch imports and optional GitHub library sync. Videos are not included. Choose your video folder on first launch. Connect GitHub in the app to sync your personal additions; no token is included in the installer.

This initial personal-use release is unsigned. Windows may show an Unknown Publisher or SmartScreen warning. The accompanying `.sha256` file identifies the installer built by the release workflow. Upgrade installers and the uninstaller preserve the app's local profile; back it up before changing PCs. There is no automatic application updater yet: newer installers are downloaded from GitHub Releases.

The release workflow builds the installer and smoke-tests the packaged executable on Windows. Installation, uninstallation, video codecs, fullscreen behaviour and live website imports still need a manual check on your own PC. Live websites may change or require access checks.
