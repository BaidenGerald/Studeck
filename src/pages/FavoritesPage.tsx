import { useEffect, useState } from 'react';
import { Link } from '@/components/Link';
import { MaterialCard } from '@/components/MaterialCard';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/lib/auth';
import { fetchMyFavorites, fetchMyDownloads } from '@/lib/queries';
import type { MaterialWithRelations } from '@/types/database';
import { Bookmark, Download, Search } from 'lucide-react';

export function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<MaterialWithRelations[]>([]);
  const [downloads, setDownloads] = useState<MaterialWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'favorites' | 'downloads'>('favorites');

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([fetchMyFavorites(user.id), fetchMyDownloads(user.id)])
      .then(([favs, dls]) => {
        if (!active) return;
        setFavorites(favs);
        setDownloads(dls);
      })
      .catch((e) => console.error(e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  const items = tab === 'favorites' ? favorites : downloads;

  return (
    <div className="container-app py-10">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-slate-900">Saved & downloaded</h1>
        <p className="mt-1 text-slate-600">Quickly revisit materials you've bookmarked or downloaded.</p>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTab('favorites')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === 'favorites' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bookmark className="h-4 w-4" /> Favorites ({favorites.length})
        </button>
        <button
          onClick={() => setTab('downloads')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === 'downloads' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Download className="h-4 w-4" /> Downloads ({downloads.length})
        </button>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-primary-500" />
          </div>
        ) : items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={tab === 'favorites' ? <Bookmark className="h-7 w-7" /> : <Download className="h-7 w-7" />}
            title={tab === 'favorites' ? 'No favorites yet' : 'No downloads yet'}
            description={
              tab === 'favorites'
                ? 'Tap the bookmark icon on any material to save it here for quick access.'
                : 'Materials you download will appear here so you can find them again.'
            }
            action={
              <Link to="/browse" className="btn-primary">
                <Search className="h-4 w-4" /> Browse the library
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
