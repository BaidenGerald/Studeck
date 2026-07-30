import { useEffect, useState } from 'react';
import { Link } from '@/components/Link';
import { MaterialCard } from '@/components/MaterialCard';
import { Spinner } from '@/components/Spinner';
import { getDepartmentIcon } from '@/components/icons';
import { fetchDepartments, fetchPopularMaterials } from '@/lib/queries';
import { useRouter } from '@/lib/router';
import type { Department, MaterialWithRelations } from '@/types/database';
import {
  Search, Upload, Sparkles, BookMarked, ShieldCheck, Users, ArrowRight,
  GraduationCap, FileText, Download, Tag,
} from 'lucide-react';

export function LandingPage() {
  const { navigate } = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [popular, setPopular] = useState<MaterialWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetchDepartments(), fetchPopularMaterials(6)])
      .then(([depts, mats]) => {
        if (!active) return;
        setDepartments(depts);
        setPopular(mats);
      })
      .catch((e) => console.error('Landing load failed', e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/browse${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-white">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl" />
          <div className="absolute top-40 -left-24 h-80 w-80 rounded-full bg-secondary-200/40 blur-3xl" />
        </div>

        <div className="container-app py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex animate-fade-in items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-1.5 text-sm font-medium text-primary-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              AI-powered academic resource hub
            </div>
            <h1 className="animate-fade-in-up text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Find and share{' '}
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                academic materials
              </span>{' '}
              that actually matter
            </h1>
            <p className="mx-auto mt-6 max-w-2xl animate-fade-in-up stagger-1 text-lg text-slate-600">
              Lecture notes, past questions, and textbooks — organized by course and
              department. Smart search and personalized recommendations help you
              reach the right resource in seconds.
            </p>

            {/* Search bar */}
            <form
              onSubmit={handleSearch}
              className="mx-auto mt-8 flex max-w-xl animate-fade-in-up stagger-2 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-primary-900/5"
            >
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for notes, past questions, topics…"
                  className="w-full bg-transparent py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
              <button type="submit" className="btn-primary">
                Search
              </button>
            </form>

            <div className="mt-6 flex animate-fade-in-up stagger-3 flex-wrap items-center justify-center gap-3 text-sm">
              <Link to="/browse" className="btn-secondary">
                <BookMarked className="h-4 w-4" /> Browse library
              </Link>
              <Link to="/signup" className="btn-primary">
                <Upload className="h-4 w-4" /> Share your notes
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-3xl animate-fade-in-up stagger-4 grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={BookMarked} value={`${departments.length || 8}`} label="Departments" />
            <StatCard icon={FileText} value="40+" label="Courses" />
            <StatCard icon={Download} value="1.2k+" label="Downloads" />
            <StatCard icon={Users} value="500+" label="Students" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Everything you need to study smarter
            </h2>
            <p className="mt-4 text-slate-600">
              From organizing resources to surfacing the right material at the right
              time — StuDeck does the heavy lifting.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={Sparkles}
              title="Smart AI search"
              description="Natural-language search across titles, descriptions, and tags. Type how you think and get ranked, relevant results instantly."
              tone="primary"
            />
            <FeatureCard
              icon={Tag}
              title="Automatic content tagging"
              description="When you upload, AI reads the title and description and suggests accurate topic tags — no manual sorting required."
              tone="secondary"
            />
            <FeatureCard
              icon={GraduationCap}
              title="Personalized recommendations"
              description="The more you download, the better StuDeck understands your courses and suggests materials you haven't seen yet."
              tone="accent"
            />
            <FeatureCard
              icon={BookMarked}
              title="Organized by course"
              description="Every resource is filed under a department and course, so you always find materials matched to your level."
              tone="primary"
            />
            <FeatureCard
              icon={Upload}
              title="Upload in seconds"
              description="Drop a PDF, DOCX, or slide deck, add a title, and let auto-tagging handle the rest. Your peers benefit immediately."
              tone="secondary"
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Secure student accounts"
              description="Email/password sign-in keeps your downloads, favorites, and uploads private to your account."
              tone="accent"
            />
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="section bg-slate-50">
        <div className="container-app">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Explore by department</h2>
              <p className="mt-2 text-slate-600">Find resources organized under your field of study.</p>
            </div>
            <Link to="/browse" className="btn-secondary">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {loading ? (
              <div className="col-span-full flex justify-center py-10">
                <Spinner className="h-8 w-8 text-primary-500" />
              </div>
            ) : (
              departments.map((dept, i) => {
                const Icon = getDepartmentIcon(dept.icon);
                return (
                  <Link
                    key={dept.id}
                    to={`/browse?dept=${dept.id}`}
                    className={`card-hover group flex items-center gap-4 p-5 stagger-${(i % 6) + 1}`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-primary-700">
                        {dept.name}
                      </h3>
                      <p className="text-xs text-slate-500">{dept.code}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Popular */}
      <section className="section">
        <div className="container-app">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Popular this week</h2>
              <p className="mt-2 text-slate-600">What other students are downloading right now.</p>
            </div>
            <Link to="/browse" className="btn-secondary">
              See all materials <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              [0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="card animate-pulse p-5">
                  <div className="h-4 w-20 rounded bg-slate-200" />
                  <div className="mt-3 h-5 w-3/4 rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                </div>
              ))
            ) : popular.length > 0 ? (
              popular.map((m) => <MaterialCard key={m.id} material={m} />)
            ) : (
              <p className="col-span-full py-10 text-center text-slate-500">
                No materials yet. Be the first to upload!
              </p>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-gradient-to-br from-primary-700 to-secondary-700 text-white">
        <div className="container-app text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to share your knowledge?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-primary-100">
            Join hundreds of students building a better, centralized library of
            academic resources. It's free to sign up and start sharing.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup" className="btn bg-white text-primary-700 hover:bg-primary-50 focus:ring-white">
              Create your account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/browse" className="btn border border-white/30 text-white hover:bg-white/10 focus:ring-white">
              Browse without signing in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, value, label }: { icon: typeof Search; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
      <Icon className="mx-auto h-6 w-6 text-primary-600" />
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: typeof Search;
  title: string;
  description: string;
  tone: 'primary' | 'secondary' | 'accent';
}) {
  const tones = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    accent: 'bg-accent-50 text-accent-600',
  };
  return (
    <div className="card-hover p-6">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
