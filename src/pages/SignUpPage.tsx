import { useEffect, useState } from 'react';
import { Link } from '@/components/Link';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { fetchDepartments } from '@/lib/queries';
import { LEVELS } from '@/lib/utils';
import { Spinner } from '@/components/Spinner';
import { getDepartmentIcon } from '@/components/icons';
import type { Department } from '@/types/database';
import { GraduationCap, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

export function SignUpPage() {
  const { signUp, user } = useAuth();
  const { navigate } = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [level, setLevel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch((e) => console.error('Failed to load departments', e))
      .finally(() => setLoadingDepts(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('Please fill in all fields. Password must be at least 6 characters.');
      return;
    }
    if (!departmentId) {
      setError('Please select your department.');
      return;
    }
    if (!level) {
      setError('Please select your level.');
      return;
    }
    setSubmitting(true);
    const { error: signUpError } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      departmentId,
      level,
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute bottom-0 -right-24 h-80 w-80 rounded-full bg-secondary-200/40 blur-3xl" />
      </div>

      <div className="container-app flex min-h-screen items-center justify-center py-12">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
          {/* Left brand panel */}
          <div className="relative hidden flex-col justify-between bg-gradient-to-br from-primary-700 to-secondary-700 p-10 text-white lg:flex">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold">StuDeck</span>
            </Link>

            <div>
              <h2 className="text-3xl font-bold leading-tight">
                Join the student resource hub
              </h2>
              <p className="mt-3 text-primary-100">
                Upload lecture notes, find past questions, and get AI-powered
                recommendations tailored to your courses.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Free and secure student accounts',
                  'Organized by department and course',
                  'Smart search across every resource',
                  'AI auto-tagging on every upload',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-secondary-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-primary-200">
              Already have an account?{' '}
              <Link to="/signin" className="font-semibold text-white underline">
                Sign in
              </Link>
            </p>
          </div>

          {/* Right form panel */}
          <div className="p-8 sm:p-10">
            <div className="mb-6 lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="font-display text-lg font-bold text-slate-900">StuDeck</span>
              </Link>
            </div>

            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="mt-1 text-sm text-slate-500">
              Start sharing and discovering academic materials.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field label="Full name" icon={UserIcon}>
                <input
                  className="input pl-10"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </Field>

              <Field label="Email" icon={Mail}>
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>

              <Field label="Password" icon={Lock}>
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>

              <div>
                <label className="label">Department</label>
                {loadingDepts ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Spinner className="h-4 w-4" /> Loading departments…
                  </div>
                ) : (
                  <select
                    className="input"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    <option value="">Select your department</option>
                    {departments.map((d) => {
                      const Icon = getDepartmentIcon(d.icon);
                      void Icon;
                      return (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="label">Level</label>
                <select
                  className="input"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="">Select your level</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/signin" className="font-semibold text-primary-600 hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
    </div>
  );
}
