import type { BatchState } from './batch-import';
import type { LibrarySnapshot, ChosenArtwork, MatchDraft } from './imports';
export interface VaultAPI {
  startBatchImport(urls: string): Promise<BatchState>;
  getBatchImport(): Promise<BatchState>;
  stopBatchImport(): Promise<BatchState>;
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
  editMatch(id: string, draft: MatchDraft, original: MatchDraft): Promise<LibrarySnapshot>;
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
