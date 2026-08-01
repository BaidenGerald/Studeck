import { useState } from 'react';
import { Link } from '@/components/Link';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Spinner } from '@/components/Spinner';
import { GraduationCap, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export function ResetPasswordPage() {
  const { updatePassword, passwordRecovery, user } = useAuth();
  const { navigate } = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // A valid recovery link establishes a temporary session (user is set) and fires
  // the PASSWORD_RECOVERY auth event. If neither is true, the link is missing,
  // expired, or already used.
  const linkValid = passwordRecovery || !!user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    setDone(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-secondary-200/40 blur-3xl" />
      </div>

      <div className="container-app flex min-h-screen items-center justify-center py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
          <Link to="/" className="mb-6 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold text-slate-900">StuDeck</span>
          </Link>

          {done ? (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-success-50 text-success-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Password updated</h1>
              <p className="mt-2 text-sm text-slate-500">
                Your password has been changed. You can now use it to sign in.
              </p>
              <button onClick={() => navigate('/dashboard')} className="btn-primary mt-6 w-full">
                Continue to dashboard <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : !linkValid ? (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-error-50 text-error-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Link expired or invalid</h1>
              <p className="mt-2 text-sm text-slate-500">
                This password reset link is no longer valid. Request a new one to continue.
              </p>
              <Link to="/forgot-password" className="btn-primary mt-6 w-full">
                Request a new link
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
              <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="label">New password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      className="input pl-10"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Confirm password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      className="input pl-10"
                      placeholder="Re-enter your new password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? <Spinner className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  {submitting ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
