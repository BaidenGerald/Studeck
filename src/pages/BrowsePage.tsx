import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from '@/components/Link';
import { MaterialCard } from '@/components/MaterialCard';
import { EmptyState } from '@/components/EmptyState';
import { useRouter } from '@/lib/router';
import { fetchDepartments, fetchCoursesByDepartment, smartSearch } from '@/lib/queries';
import { ALL_MATERIAL_TYPES, MATERIAL_TYPE_LABELS, LEVELS } from '@/lib/utils';
import { getDepartmentIcon } from '@/components/icons';
import type { Department, Course, SearchResult, MaterialType } from '@/types/database';
import {
  Search, SlidersHorizontal, X, FileText,
} from 'lucide-react';

export function BrowsePage() {
  const { route } = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state initialized from URL query params
  const initialQuery = route.query.get('q') ?? '';
  const initialDept = route.query.get('dept') ?? '';
  const initialCourse = route.query.get('course') ?? '';
  const initialType = route.query.get('type') ?? '';
  const initialLevel = route.query.get('level') ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [departmentId, setDepartmentId] = useState(initialDept);
  const [courseId, setCourseId] = useState(initialCourse);
  const [type, setType] = useState<MaterialType | ''>(initialType as MaterialType | '');
  const [level, setLevel] = useState(initialLevel);

  // Load departments once
  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch((e) => console.error('Failed to load departments', e));
  }, []);

  // Load courses whenever department changes
  useEffect(() => {
    if (!departmentId) {
      setCourses([]);
      return;
    }
    fetchCoursesByDepartment(departmentId)
      .then(setCourses)
      .catch((e) => console.error('Failed to load courses', e));
  }, [departmentId]);

  // Debounced smart search
  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await smartSearch({
        query,
        departmentId: departmentId || null,
        courseId: courseId || null,
        type: (type || null) as MaterialType | null,
        level: level || null,
        limit: 48,
      });
      setResults(res);
    } catch (e) {
      console.error('Search failed', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, departmentId, courseId, type, level]);

  useEffect(() => {
    const t = setTimeout(doSearch, 250);
    return () => clearTimeout(t);
  }, [doSearch]);

  // Sync filters to URL (without triggering reload loops)
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (departmentId) params.set('dept', departmentId);
    if (courseId) params.set('course', courseId);
    if (type) params.set('type', type);
    if (level) params.set('level', level);
    const newFull = `/browse${params.toString() ? `?${params.toString()}` : ''}`;
    if (route.full !== newFull) {
      window.history.replaceState(null, '', `#${newFull}`);
    }
  }, [query, departmentId, courseId, type, level, route.full]);

  const activeFilterCount = useMemo(
    () => [departmentId, courseId, type, level].filter(Boolean).length,
    [departmentId, courseId, type, level]
  );

  const clearFilters = () => {
    setDepartmentId('');
    setCourseId('');
    setType('');
    setLevel('');
  };

  return (
    <div className="container-app py-10">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-slate-900">Explore the library</h1>
        <p className="mt-1 text-slate-600">
          Search across every resource. Use natural language — try "calculus past question" or "organic chemistry notes".
        </p>
      </div>

      {/* Search bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search materials, topics, courses…"
            className="input pl-12 text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`btn-secondary ${showFilters ? 'border-primary-300 bg-primary-50' : ''}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mt-4 animate-slide-down rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Department</label>
              <select
                className="input"
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setCourseId('');
                }}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Course</label>
              <select
                className="input"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={!departmentId}
              >
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value as MaterialType | '')}
              >
                <option value="">All types</option>
                {ALL_MATERIAL_TYPES.map((t) => (
                  <option key={t} value={t}>{MATERIAL_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Level</label>
              <select
                className="input"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="">All levels</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>Level {l}</option>
                ))}
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {departmentId && (
                  <FilterChip
                    label={departments.find((d) => d.id === departmentId)?.name ?? 'Department'}
                    onClear={() => { setDepartmentId(''); setCourseId(''); }}
                  />
                )}
                {courseId && (
                  <FilterChip
                    label={courses.find((c) => c.id === courseId)?.code ?? 'Course'}
                    onClear={() => setCourseId('')}
                  />
                )}
                {type && (
                  <FilterChip label={MATERIAL_TYPE_LABELS[type as MaterialType]} onClear={() => setType('')} />
                )}
                {level && (
                  <FilterChip label={`Level ${level}`} onClear={() => setLevel('')} />
                )}
              </div>
              <button onClick={clearFilters} className="text-sm font-medium text-slate-500 hover:text-error-600">
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick department chips (when no dept filter) */}
      {!departmentId && !showFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs font-medium text-slate-400 self-center">Popular:</span>
          {departments.slice(0, 6).map((d) => {
            const Icon = getDepartmentIcon(d.icon);
            return (
              <button
                key={d.id}
                onClick={() => { setDepartmentId(d.id); setShowFilters(true); }}
                className="badge border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                <Icon className="h-3.5 w-3.5" /> {d.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {loading ? 'Searching…' : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
          {query && !loading && <> for "<span className="font-medium text-slate-700">{query}</span>"</>}
        </p>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="card animate-pulse p-5">
                <div className="flex gap-3">
                  <div className="h-11 w-11 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 rounded bg-slate-200" />
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="mt-4 h-3 w-full rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((m) => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search className="h-7 w-7" />}
            title="No materials found"
            description={
              query
                ? "We couldn't find anything matching your search. Try different keywords or clear your filters."
                : 'Be the first to upload a material to the library.'
            }
            action={
              <div className="flex gap-2">
                <Link to="/upload" className="btn-primary">
                  <FileText className="h-4 w-4" /> Upload a resource
                </Link>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="btn-secondary">
                    Clear filters
                  </button>
                )}
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
      {label}
      <button onClick={onClear} className="rounded-full p-0.5 hover:bg-primary-200">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
