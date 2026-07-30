import { useEffect, useState } from 'react';
import { Link } from '@/components/Link';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { fetchDepartments, updateProfile } from '@/lib/queries';
import { formatDate, initials, LEVELS } from '@/lib/utils';
import { getDepartmentIcon } from '@/components/icons';
import type { Department } from '@/types/database';
import {
  User as UserIcon, Mail, GraduationCap, BarChart3, Upload,
  Bookmark, Edit3, Save, X, CheckCircle2, AlertCircle,
} from 'lucide-react';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [departmentId, setDepartmentId] = useState(profile?.department_id ?? '');
  const [level, setLevel] = useState(profile?.level ?? '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(console.error);
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setBio(profile.bio ?? '');
      setDepartmentId(profile.department_id ?? '');
      setLevel(profile.level ?? '');
    }
  }, [profile]);

  if (!user || !profile) {
    return (
      <div className="container-app py-20">
        <Spinner className="mx-auto h-8 w-8 text-primary-500" />
      </div>
    );
  }

  const dept = departments.find((d) => d.id === profile.department_id);
  const DeptIcon = getDepartmentIcon(dept?.icon);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(user.id, {
        full_name: fullName.trim(),
        bio: bio.trim(),
        department_id: departmentId || null,
        level: level || null,
      });
      await refreshProfile();
      setEditing(false);
      setToast({ type: 'success', msg: 'Profile updated.' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error(e);
      setToast({ type: 'error', msg: 'Could not save profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-app py-10">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-slate-900">Your profile</h1>
        <p className="mt-1 text-slate-600">Manage your account details and study preferences.</p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Profile card */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            {/* Header banner */}
            <div className="h-28 bg-gradient-to-r from-primary-600 to-secondary-600" />
            <div className="px-6 pb-6">
              <div className="-mt-12 flex items-end justify-between">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-primary-100 text-2xl font-bold text-primary-700 shadow-sm">
                  {initials(profile.full_name)}
                </div>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="btn-secondary">
                    <Edit3 className="h-4 w-4" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="btn-ghost">
                      <X className="h-4 w-4" /> Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary">
                      {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save
                    </button>
                  </div>
                )}
              </div>

              {!editing ? (
                <div className="mt-4">
                  <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
                  <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {profile.email}</p>
                    {dept && (
                      <p className="flex items-center gap-2">
                        <DeptIcon className="h-4 w-4 text-slate-400" /> {dept.name}
                      </p>
                    )}
                    {profile.level && (
                      <p className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-slate-400" /> Level {profile.level}</p>
                    )}
                    <p className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-slate-400" /> Joined {formatDate(profile.created_at)}</p>
                  </div>
                  {profile.bio && (
                    <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {profile.bio}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="label">Full name</label>
                    <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Bio</label>
                    <textarea className="input min-h-[80px] resize-y" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell other students about yourself…" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Department</label>
                      <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                        <option value="">Select department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Level</label>
                      <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
                        <option value="">Select level</option>
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>Level {l}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick links + stats */}
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BarChart3 className="h-4 w-4 text-primary-500" /> Quick links
            </h3>
            <div className="space-y-2">
              <Link to="/profile/uploads" className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-primary-50 hover:text-primary-700">
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> My uploads</span>
                <span>→</span>
              </Link>
              <Link to="/profile/favorites" className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-primary-50 hover:text-primary-700">
                <span className="flex items-center gap-2"><Bookmark className="h-4 w-4" /> Favorites</span>
                <span>→</span>
              </Link>
              <Link to="/upload" className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-primary-50 hover:text-primary-700">
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Upload new</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <GraduationCap className="h-4 w-4 text-secondary-500" /> Study info
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Department</dt>
                <dd className="font-medium text-slate-800">{dept?.name ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Level</dt>
                <dd className="font-medium text-slate-800">{profile.level ? `Level ${profile.level}` : '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Member since</dt>
                <dd className="font-medium text-slate-800">{formatDate(profile.created_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slide-down">
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-success-600 text-white' : 'bg-error-600 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
