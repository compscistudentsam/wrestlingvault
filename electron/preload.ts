import { contextBridge, ipcRenderer } from 'electron';
import type { VaultAPI } from '../src/shared/api';

const api: VaultAPI = Object.freeze({
  chooseVideoFolder: () => ipcRenderer.invoke('vault:choose-video-folder'),
  getMatchVideos: (id: string) => ipcRenderer.invoke('vault:match-videos', id),
  getVideoAvailability: () => ipcRenderer.invoke('vault:video-availability'),
  getVersion: () => ipcRenderer.invoke('vault:version'),
  openExternal: (url: string) => ipcRenderer.invoke('vault:open-reference', url),
});
contextBridge.exposeInMainWorld('vault', api);
