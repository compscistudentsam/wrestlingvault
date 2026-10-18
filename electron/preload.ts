import { contextBridge, ipcRenderer } from 'electron';
import type { MatchDraft } from '../src/shared/imports';
import type { VaultAPI } from '../src/shared/api';

const api: VaultAPI = Object.freeze({
  chooseVideoFolder: () => ipcRenderer.invoke('vault:choose-video-folder'),
  getMatchVideos: (id: string) => ipcRenderer.invoke('vault:match-videos', id),
  getVideoAvailability: () => ipcRenderer.invoke('vault:video-availability'),
  getLibrary: () => ipcRenderer.invoke('vault:library'),
  lookupMatch: (url: string) => ipcRenderer.invoke('vault:lookup-match', url),
  chooseMatchArtwork: () => ipcRenderer.invoke('vault:choose-artwork'),
  addMatch: (draft: MatchDraft, artworkToken: string) =>
    ipcRenderer.invoke('vault:add-match', draft, artworkToken),
  connectGitHub: (token: string) => ipcRenderer.invoke('vault:connect-github', token),
  disconnectGitHub: () => ipcRenderer.invoke('vault:disconnect-github'),
  syncLibrary: () => ipcRenderer.invoke('vault:sync-library'),
  getVersion: () => ipcRenderer.invoke('vault:version'),
  openExternal: (url: string) => ipcRenderer.invoke('vault:open-reference', url),
});
contextBridge.exposeInMainWorld('vault', api);
