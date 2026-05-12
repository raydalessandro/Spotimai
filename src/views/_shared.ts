import type { Library, View } from '../lib/types';

export type ViewProps = {
  library: Library;
  onPlay: (trackId: string, contextIds?: string[]) => void;
  currentTrackId: string | null;
  isPlaying: boolean;
  favorites: Set<string>;
  toggleFav: (id: string) => void;
  navigate: (v: View) => void;
  goBack: () => void;
  openCreatePlaylist: () => void;
  openAddToPlaylist: (trackId: string) => void;
};
