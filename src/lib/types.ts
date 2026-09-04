export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
  year?: number;
  path: string;
  cover?: string;
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt?: string;
};

export type Library = {
  schemaVersion: number;
  generatedAt: string;
  tracks: Track[];
  autoPlaylists: {
    byGenre: Record<string, string[]>;
    byArtist: Record<string, string[]>;
    byAlbum: Record<string, string[]>;
  };
  customPlaylists: Playlist[];
};

/** Stato di lavorazione di una versione, nella sezione di selezione NVLL CLICK. */
export type NvllStatus = 'definitivo' | 'provvisorio' | 'scartato';

export type View =
  | { kind: 'home' }
  | { kind: 'browse'; type: 'genre' | 'artist' | 'album' }
  | { kind: 'list'; title: string; subtitle?: string; trackIds: string[]; seed: string; kind2?: 'playlist' | 'album' | 'artist' | 'genre' }
  | { kind: 'search' }
  | { kind: 'playlists' }
  | { kind: 'nvll' };

export type RepeatMode = 'off' | 'all' | 'one';
