import { useEffect, useState } from 'react';
import { Link } from '@/components/Link';
import { MaterialCard } from '@/components/MaterialCard';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/lib/auth';
import {
  fetchRecommendations,
  fetchRecentMaterials,
  fetchMyUploads,
  fetchMyDownloads,
} from '@/lib/queries';
import type { MaterialWithRelations, RecommendedMaterial } from '@/types/database';
import {
  Sparkles, TrendingUp, Upload, Download, FileText, ArrowRight, BookMarked,
} from 'lucide-react';

export function DashboardPage() {
  const { user, profile } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendedMaterial[]>([]);
  const [recent, setRecent] = useState<MaterialWithRelations[]>([]);
  const [myUploads, setMyUploads] = useState<MaterialWithRelations[]>([]);
  const [myDownloads, setMyDownloads] = useState<MaterialWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    Promise.all([
      fetchRecommendations(user.id, 6),
      fetchRecentMaterials(6),
      fetchMyUploads(user.id),
      fetchMyDownloads(user.id),
    ])
      .then(([recs, recents, uploads, downloads]) => {
        if (!active) return;
        setRecommendations(recs);
        setRecent(recents);
        setMyUploads(uploads);
        setMyDownloads(downloads);
      })
      .catch((e) => console.error('Dashboard load failed', e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="container-app py-10">
      {/* Greeting */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-slate-600">
          Here's what's happening with your study materials.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile icon={Upload} label="Your uploads" value={myUploads.length} tone="primary" />
        <StatTile icon={Download} label="Your downloads" value={myDownloads.length} tone="secondary" />
        <StatTile icon={FileText} label="Recent items" value={recent.length} tone="accent" />
        <StatTile
          icon={Sparkles}
          label="Recommendations"
          value={recommendations.length}
          tone="primary"
        />
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <Spinner className="h-8 w-8 text-primary-500" />
        </div>
      ) : (
        <div className="mt-12 space-y-12">
          {/* AI Recommendations */}
          <section>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-100 text-secondary-700">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Recommended for you</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  AI picks based on your downloads, department, and topics you care about.
                </p>
              </div>
            </div>

            {recommendations.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((m) => (
                  <MaterialCard key={m.id} material={m} reason={m.reason} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Sparkles className="h-7 w-7" />}
                title="No recommendations yet"
                description="Download a few materials and our AI will start suggesting resources matched to your courses and interests."
                action={
                  <Link to="/browse" className="btn-primary">
                    Browse the library <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
            )}
          </section>

          {/* Recent uploads */}
          <section>
            <div className="mb-5 flex items-end justify-between">
              <h2 className="text-xl font-bold text-slate-900">Recently added</h2>
              <Link to="/browse" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                View all →
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recent.slice(0, 6).map((m) => (
                <MaterialCard key={m.id} material={m} />
              ))}
            </div>
          </section>

          {/* My uploads + downloads */}
          <div className="grid gap-10 lg:grid-cols-2">
            <section>
              <div className="mb-5 flex items-end justify-between">
                <h2 className="text-xl font-bold text-slate-900">Your uploads</h2>
                <Link to="/profile/uploads" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                  Manage →
                </Link>
              </div>
              {myUploads.length > 0 ? (
                <div className="grid gap-4">
                  {myUploads.slice(0, 3).map((m) => (
                    <MaterialCard key={m.id} material={m} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Upload className="h-7 w-7" />}
                  title="No uploads yet"
                  description="Share your first lecture note or past question to help your peers."
                  action={
                    <Link to="/upload" className="btn-primary">
                      <Upload className="h-4 w-4" /> Upload a resource
                    </Link>
                  }
                />
              )}
            </section>

            <section>
              <div className="mb-5 flex items-end justify-between">
                <h2 className="text-xl font-bold text-slate-900">Your downloads</h2>
                <Link to="/profile/favorites" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                  View favorites →
                </Link>
              </div>
              {myDownloads.length > 0 ? (
                <div className="grid gap-4">
                  {myDownloads.slice(0, 3).map((m) => (
                    <MaterialCard key={m.id} material={m} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Download className="h-7 w-7" />}
                  title="No downloads yet"
                  description="Materials you download will show up here for quick access."
                  action={
                    <Link to="/browse" className="btn-secondary">
                      <BookMarked className="h-4 w-4" /> Browse library
                    </Link>
                  }
                />
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  tone: 'primary' | 'secondary' | 'accent';
}) {
  const tones = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    accent: 'bg-accent-50 text-accent-600',
  };
  return (
    <div className="card animate-fade-in-up p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
