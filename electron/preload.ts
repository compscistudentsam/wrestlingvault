import { contextBridge, ipcRenderer } from 'electron';
import type { MatchDraft } from '../src/shared/imports';
import type { VaultAPI } from '../src/shared/api';

const api: VaultAPI = Object.freeze({
  getSavedVideoFolder: () => ipcRenderer.invoke('vault:saved-video-folder'),
  findMatchArtwork: (url: string) => ipcRenderer.invoke('vault:find-artwork', url),
  chooseVideoFolder: () => ipcRenderer.invoke('vault:choose-video-folder'),
  getMatchVideos: (id: string) => ipcRenderer.invoke('vault:match-videos', id),
  getVideoAvailability: () => ipcRenderer.invoke('vault:video-availability'),
  getLibrary: () => ipcRenderer.invoke('vault:library'),
  lookupMatchInBrowser: (url: string) => ipcRenderer.invoke('vault:lookup-browser', url),
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
