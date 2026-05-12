import Cover from '../components/Cover';
import type { ViewProps } from './_shared';

export default function BrowseView({ library, type, navigate, goBack }: ViewProps & { type: 'genre' | 'artist' | 'album' }) {
  const data = type === 'genre' ? library.autoPlaylists.byGenre
    : type === 'artist' ? library.autoPlaylists.byArtist
    : library.autoPlaylists.byAlbum;
  const title = type === 'genre' ? 'Generi' : type === 'artist' ? 'Artisti' : 'Album';

  return (
    <div>
      <header className="mb-6">
        <button onClick={goBack} className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 font-mono">← indietro</button>
        <h1 className="text-3xl font-serif font-light text-zinc-100">{title}</h1>
        <p className="text-xs text-zinc-500 mt-1 font-mono uppercase tracking-wider">auto-generato dal filesystem</p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(data).map(([key, ids]) => {
          const [name, sub] = type === 'album' ? key.split('|') : [key, ''];
          return (
            <button
              key={key}
              onClick={() => navigate({ kind: 'list', title: name, subtitle: sub || `${ids.length} tracce`, trackIds: ids, seed: key, kind2: type })}
              className="flex items-center gap-3 bg-zinc-900/50 hover:bg-zinc-800/80 rounded-md overflow-hidden transition border border-zinc-800/50 text-left"
            >
              <Cover seed={key} label={name} size="lg" rounded={type === 'artist' ? 'full' : 'md'} />
              <div className="min-w-0 pr-3">
                <p className="text-sm text-zinc-200 font-medium truncate">{name}</p>
                <p className="text-xs text-zinc-500 truncate">{sub || `${ids.length} tracce`}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
