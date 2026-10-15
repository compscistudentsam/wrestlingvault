export interface VaultAPI {
  chooseVideoFolder(): Promise<{ name: string } | null>;
  getMatchVideos(id: string): Promise<{ name: string; url: string }[]>;
  getVideoAvailability(): Promise<string[]>;
  getVersion(): Promise<string>;
  openExternal(url: string): Promise<void>;
}

declare global {
  interface Window {
    vault?: VaultAPI;
  }
}
