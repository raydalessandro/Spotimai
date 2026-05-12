import { useEffect, useState } from 'react';
import { Compass, Search, Library as LibraryIcon, Tag, Mic2, Disc3 } from 'lucide-react';
import { NavItem, BottomNavItem } from './components/Nav';
import MiniPlayer from './components/MiniPlayer';
import FullPlayer from './components/FullPlayer';
import HomeView from './views/HomeView';
import BrowseView from './views/BrowseView';
import ListView from './views/ListView';
import SearchView from './views/SearchView';
import PlaylistsView from './views/PlaylistsView';
import CreatePlaylistModal from './views/CreatePlaylistModal';
import AddToPlaylistModal from './views/AddToPlaylistModal';
import Logo from './components/Logo';
import { loadLibrary } from './lib/library';
import { usePlayer } from './state/usePlayer';
import { useFavorites } from './state/useFavorites';
import { useCustomPlaylists } from './state/useCustomPlaylists';
import { useHistory } from './state/useHistory';
import type { Library, View } from './lib/types';

export default function App() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: 'home' });
  const [history, setHistory] = useState<View[]>([]);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [addToPlaylistTrackId, setAddToPlaylistTrackId] = useState<string | null>(null);

  const player = usePlayer(library);
  const { favorites, toggle: toggleFav } = useFavorites();
  const playlists = useCustomPlaylists(library);
  const playHistory = useHistory();

  useEffect(() => {
    loadLibrary()
      .then(setLibrary)
      .catch(err => setLoadError(err.message || 'Errore sconosciuto'));
  }, []);

  const navigate = (v: View) => {
    if (view.kind !== 'home') setHistory(h => [...h, view]);
    setView(v);
  };

  const goBack = () => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory(h => h.slice(0, -1));
      setView(prev);
    } else {
      setView({ kind: 'home' });
    }
  };

  const handlePlay = (trackId: string, contextIds?: string[]) => {
    const isFirstPlay = player.currentTrackId === null;
    playHistory.push(trackId);
    player.playTrack(trackId, contextIds);
    if (isFirstPlay && typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => setShowFullPlayer(true), 80);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest mb-3">errore</p>
          <p className="text-zinc-200 mb-2">Impossibile caricare la libreria</p>
          <p className="text-zinc-500 font-mono text-sm">{loadError}</p>
          <p className="text-zinc-600 font-mono text-xs mt-6">prova a lanciare <code className="text-zinc-400">pnpm ingest</code></p>
        </div>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Logo size={48} animated className="text-emerald-400" />
      </div>
    );
  }

  const viewProps = {
    library,
    onPlay: handlePlay,
    currentTrackId: player.currentTrackId,
    isPlaying: player.isPlaying,
    favorites,
    toggleFav,
    navigate,
    goBack,
    openCreatePlaylist: () => setShowCreatePlaylist(true),
    openAddToPlaylist: (trackId: string) => setAddToPlaylistTrackId(trackId),
    drafts: playlists.drafts,
    recentlyPlayed: playHistory.history,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="flex">
        <aside className="hidden md:flex md:flex-col w-60 h-screen sticky top-0 border-r border-zinc-900 p-4 gap-1">
          <div className="px-3 py-4 mb-2">
            <div className="flex items-center gap-2 mb-1">
              <Logo size={20} className="text-emerald-400" />
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-600 font-mono">EAR LAB</p>
            </div>
            <h1 className="text-2xl font-serif font-light text-zinc-100">own·music</h1>
          </div>
          <NavItem icon={<Compass size={16} strokeWidth={1.5} />} label="Home" active={view.kind === 'home'} onClick={() => { setView({ kind: 'home' }); setHistory([]); }} />
          <NavItem icon={<Search size={16} strokeWidth={1.5} />} label="Cerca" active={view.kind === 'search'} onClick={() => { setView({ kind: 'search' }); setHistory([]); }} />
          <NavItem icon={<LibraryIcon size={16} strokeWidth={1.5} />} label="Playlist" active={view.kind === 'playlists'} onClick={() => { setView({ kind: 'playlists' }); setHistory([]); }} />

          <div className="mt-6 px-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-600 font-mono mb-3">Sfoglia</p>
            <div className="space-y-0.5">
              <NavItem small icon={<Tag size={14} strokeWidth={1.5} />} label="Generi" onClick={() => { setView({ kind: 'browse', type: 'genre' }); setHistory([]); }} />
              <NavItem small icon={<Mic2 size={14} strokeWidth={1.5} />} label="Artisti" onClick={() => { setView({ kind: 'browse', type: 'artist' }); setHistory([]); }} />
              <NavItem small icon={<Disc3 size={14} strokeWidth={1.5} />} label="Album" onClick={() => { setView({ kind: 'browse', type: 'album' }); setHistory([]); }} />
            </div>
          </div>

          <div className="mt-auto px-3 pt-4 border-t border-zinc-900">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-700 font-mono">v0.1 · {library.tracks.length} tracce</p>
          </div>
        </aside>

        <main className="flex-1 min-w-0 pb-32 md:pb-24">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8">
            {view.kind === 'home' && <HomeView {...viewProps} />}
            {view.kind === 'browse' && <BrowseView {...viewProps} type={view.type} />}
            {view.kind === 'list' && <ListView {...viewProps} title={view.title} subtitle={view.subtitle} trackIds={view.trackIds} seed={view.seed} kind2={view.kind2} />}
            {view.kind === 'search' && <SearchView {...viewProps} />}
            {view.kind === 'playlists' && (
              <PlaylistsView
                {...viewProps}
                drafts={playlists.drafts}
                exportJSON={playlists.exportJSON}
                removeDraft={playlists.remove}
              />
            )}
          </div>
        </main>
      </div>

      {player.currentTrack && !showFullPlayer && (
        <MiniPlayer
          track={player.currentTrack}
          isPlaying={player.isPlaying}
          progress={player.progress}
          duration={player.duration}
          onExpand={() => setShowFullPlayer(true)}
          onTogglePlay={player.togglePlay}
          onSkipNext={player.skipNext}
          onSkipPrev={player.skipPrev}
        />
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-900 grid grid-cols-3 z-30">
        <BottomNavItem icon={<Compass size={20} strokeWidth={1.5} />} label="Home" active={view.kind === 'home'} onClick={() => { setView({ kind: 'home' }); setHistory([]); }} />
        <BottomNavItem icon={<Search size={20} strokeWidth={1.5} />} label="Cerca" active={view.kind === 'search'} onClick={() => { setView({ kind: 'search' }); setHistory([]); }} />
        <BottomNavItem icon={<LibraryIcon size={20} strokeWidth={1.5} />} label="Playlist" active={view.kind === 'playlists'} onClick={() => { setView({ kind: 'playlists' }); setHistory([]); }} />
      </nav>

      {showFullPlayer && player.currentTrack && (
        <FullPlayer
          track={player.currentTrack}
          isPlaying={player.isPlaying}
          progress={player.progress}
          duration={player.duration}
          shuffle={player.shuffle}
          repeat={player.repeat}
          isFav={favorites.has(player.currentTrack.id)}
          onClose={() => setShowFullPlayer(false)}
          onTogglePlay={player.togglePlay}
          onSkipNext={player.skipNext}
          onSkipPrev={player.skipPrev}
          onToggleShuffle={player.toggleShuffle}
          onCycleRepeat={player.cycleRepeat}
          onToggleFav={() => toggleFav(player.currentTrack!.id)}
          onSeek={player.seek}
          onAddToPlaylist={() => setAddToPlaylistTrackId(player.currentTrack!.id)}
        />
      )}
      {showCreatePlaylist && (
        <CreatePlaylistModal
          onClose={() => setShowCreatePlaylist(false)}
          onCreate={playlists.create}
        />
      )}
      {addToPlaylistTrackId && (
        <AddToPlaylistModal
          trackId={addToPlaylistTrackId}
          library={library}
          drafts={playlists.drafts}
          onClose={() => setAddToPlaylistTrackId(null)}
          onCreate={playlists.create}
          onAddTrack={playlists.addTrack}
        />
      )}
    </div>
  );
}
