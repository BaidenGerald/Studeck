import { useEffect, useState } from 'react';
import { Link } from '@/components/Link';
import { MaterialCard } from '@/components/MaterialCard';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/lib/auth';
import { fetchMyUploads, deleteMaterial } from '@/lib/queries';
import { MATERIAL_TYPE_LABELS } from '@/lib/utils';
import type { MaterialWithRelations } from '@/types/database';
import {
  Upload, Trash2, AlertCircle, FileStack, ArrowRight, Loader2,
} from 'lucide-react';

export function MyUploadsPage() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<MaterialWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchMyUploads(user.id)
      .then((u) => active && setUploads(u))
      .catch((e) => console.error(e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user]);

  const handleDelete = async (m: MaterialWithRelations) => {
    setDeleting(m.id);
    try {
      await deleteMaterial(m);
      setUploads((prev) => prev.filter((u) => u.id !== m.id));
      setToast({ type: 'success', msg: 'Material deleted.' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error(e);
      setToast({ type: 'error', msg: 'Could not delete material.' });
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  };

  if (!user) return null;

  return (
    <div className="container-app py-10">
      <div className="animate-fade-in-up flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My uploads</h1>
          <p className="mt-1 text-slate-600">
            Manage the materials you've shared with the community.
          </p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Upload className="h-4 w-4" /> Upload new
        </Link>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-primary-500" />
          </div>
        ) : uploads.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {uploads.map((m) => (
              <div key={m.id} className="relative">
                <MaterialCard material={m} />
                <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-500">
                    {MATERIAL_TYPE_LABELS[m.type]} · {m.download_count} downloads
                  </span>
                  {confirming === m.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Delete?</span>
                      <button
                        onClick={() => handleDelete(m)}
                        disabled={deleting === m.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-error-600 px-2 py-1 text-xs font-semibold text-white hover:bg-error-700"
                      >
                        {deleting === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(m.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-error-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileStack className="h-7 w-7" />}
            title="No uploads yet"
            description="Share your first lecture note, past question, or textbook to help your peers."
            action={
              <Link to="/upload" className="btn-primary">
                <Upload className="h-4 w-4" /> Upload a resource <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slide-down">
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-success-600 text-white' : 'bg-error-600 text-white'
          }`}>
            {toast.type === 'success' ? <AlertCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
