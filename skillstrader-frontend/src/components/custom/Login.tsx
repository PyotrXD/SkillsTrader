import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { pb } from '../../lib/pocketbase/pb';
import { Icon } from '@iconify/react';
import Toast from '../ui/Toast';
import { useRateLimit } from '../../hooks/useRateLimit';

function getErrorMessage(err: unknown): string {
  const maybeError = err as { response?: { message?: unknown } } | null | undefined;
  const responseMessage = maybeError?.response?.message;
  if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
    if (responseMessage.toLowerCase().includes('failed to authenticate')) {
      return 'Incorrect email or password. Please try again.';
    }
    return responseMessage;
  }
  if (err instanceof Error && err.message) {
    if (err.message.toLowerCase().includes('failed to authenticate')) {
      return 'Incorrect email or password. Please try again.';
    }
    return err.message;
  }
  return 'Login failed. Please check your credentials.';
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Use custom rate limit hook
  const {
    attempts,
    locked,
    addAttempt,
    resetAttempts,
    maxAttempts,
    windowMs,
  } = useRateLimit(email);

  if (pb.authStore.isValid) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (locked) {
      setError(`Too many failed attempts. Please try again in 5 minutes.`);
      return;
    }

    setLoading(true);
    try {
      const identity = email.trim();
      const requestKeyBase = `login-${Date.now()}`;
      try {
        await pb.collection('users').authWithPassword(identity, password, {
          requestKey: `${requestKeyBase}-users`,
        });
      } catch (err: unknown) {
        const status = (err as { status?: unknown } | null | undefined)?.status;
        const message = getErrorMessage(err).toLowerCase();
        const likelyBadIdentity = status === 400 && message.includes('authenticate');
        if (!likelyBadIdentity) throw err;

        await pb.collection('_superusers').authWithPassword(identity, password, {
          requestKey: `${requestKeyBase}-superusers`,
        });
      }

      setSuccess('Signed in successfully!');
      resetAttempts();
      setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      addAttempt();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex justify-center items-center min-h-screen bg-gray-50/50 px-4">
      <div className="w-full max-w-md">
        <section 
          className="bg-white border border-(--border) rounded-2xl p-8 shadow-xl shadow-gray-200/50" 
          aria-label="Sign in"
        >
          <div className="text-center mb-8">
            <p className="text-sm font-bold uppercase tracking-wider text-(--primary) mb-1">
              Welcome back
            </p>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Sign in to account
            </h1>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="group relative flex items-center">
                <div className="absolute left-4 text-gray-400 group-focus-within:text-(--primary) transition-colors">
                  <Icon icon="ic:outline-email" width="20" />
                </div>
                <input
                  type="email"
                  id="email"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between mb-2">
                <label htmlFor="password" text-sm className="text-sm font-semibold text-gray-700">
                  Password
                </label>
              </div>
              <div className="group relative flex items-center">
                <div className="absolute left-4 text-gray-400 group-focus-within:text-(--primary) transition-colors">
                  <Icon icon="ic:outline-lock" width="20" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowPassword((s) => !s); }}
                  className="absolute right-4 text-gray-400 hover:text-(--primary) transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon icon={showPassword ? 'mdi:eye' : 'mdi:eye-off'} width="20" />
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="group relative w-full flex justify-center items-center gap-2 rounded-xl bg-(--primary) py-3.5 px-4 text-white text-sm font-bold shadow-lg shadow-(--primary)/20 hover:bg-(--primary)/90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100" 
              disabled={loading || locked}
            >
              {loading ? (
                <Icon icon="line-md:loading-twotone-loop" width="20" />
              ) : (
                " "
              )}
              {locked ? 'Locked (wait 5 min)' : loading ? 'Signing in...' : 'Sign In'}
            </button>
            {locked && (
              <p className="text-xs text-red-500 text-center mt-2">Too many failed attempts. Please try again in 5 minutes.</p>
            )}
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Don't have an account?{' '}
              <a 
                href="#" 
                className="font-bold text-(--primary) hover:text-(--primary)/80 transition-colors" 
                onClick={(e) => e.preventDefault()}
              >
                Contact the developer
              </a>
            </p>
          </div>
        </section>

        {error && (
          <Toast
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        {success && (
          <Toast
            type="success"
            message={success}
            onClose={() => setSuccess(null)}
          />
        )}

        <p className="mt-6 text-center text-xs text-gray-400 font-medium">
          &copy; {new Date().getFullYear()} SkilsTrader. All rights reserved.
        </p>
      </div>
    </main>
  );
}