import { useState } from 'react';
import { Link } from '@/components/Link';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/Spinner';
import { GraduationCap, Mail, AlertCircle, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setSubmitting(true);
    const { error: reqError } = await requestPasswordReset(email.trim());
    setSubmitting(false);
    if (reqError) {
      setError(reqError);
      return;
    }
    setSent(true);
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

          {sent ? (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-success-50 text-success-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
              <p className="mt-2 text-sm text-slate-500">
                If an account exists for <span className="font-medium text-slate-700">{email.trim()}</span>,
                we've sent a link to reset your password. It may take a minute to arrive — check spam too.
              </p>
              <Link to="/signin" className="btn-secondary mt-6 w-full">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Forgot your password?</h1>
              <p className="mt-1 text-sm text-slate-500">
                Enter the email on your account and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      className="input pl-10"
                      placeholder="you@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
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
                  {submitting ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Remembered it?{' '}
                <Link to="/signin" className="font-semibold text-primary-600 hover:text-primary-700">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
