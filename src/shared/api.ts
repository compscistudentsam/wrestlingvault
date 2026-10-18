import type { LibrarySnapshot, ChosenArtwork, MatchDraft } from './imports';
export interface VaultAPI {
  chooseVideoFolder(): Promise<{ name: string } | null>;
  getMatchVideos(id: string): Promise<{ name: string; url: string }[]>;
  getVideoAvailability(): Promise<string[]>;
  getVersion(): Promise<string>;
  getLibrary(): Promise<LibrarySnapshot>;
  lookupMatch(url: string): Promise<Partial<MatchDraft>>;
  chooseMatchArtwork(): Promise<ChosenArtwork | null>;
  addMatch(draft: MatchDraft, artworkToken: string): Promise<LibrarySnapshot>;
  connectGitHub(token: string): Promise<LibrarySnapshot>;
  disconnectGitHub(): Promise<LibrarySnapshot>;
  syncLibrary(): Promise<LibrarySnapshot>;
  openExternal(url: string): Promise<void>;
}

declare global {
  interface Window {
    vault?: VaultAPI;
  }
}
