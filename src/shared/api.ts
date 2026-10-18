import type { LibrarySnapshot, ChosenArtwork, MatchDraft } from './imports';
export interface VaultAPI {
  getSavedVideoFolder(): Promise<{ name: string } | null>;
  findMatchArtwork(url: string, details: Partial<MatchDraft>): Promise<ChosenArtwork | null>;
  chooseVideoFolder(): Promise<{ name: string } | null>;
  getMatchVideos(id: string): Promise<{ name: string; url: string }[]>;
  getVideoAvailability(): Promise<string[]>;
  getVersion(): Promise<string>;
  getLibrary(): Promise<LibrarySnapshot>;
  lookupMatchInBrowser(url: string): Promise<Partial<MatchDraft>>;
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
