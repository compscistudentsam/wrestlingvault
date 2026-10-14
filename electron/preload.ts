import { contextBridge, ipcRenderer } from 'electron';
import type { VaultAPI } from '../src/shared/api';

const api: VaultAPI = Object.freeze({
  getVersion: () => ipcRenderer.invoke('vault:version'),
  openExternal: (url: string) => ipcRenderer.invoke('vault:open-reference', url),
});
contextBridge.exposeInMainWorld('vault', api);
