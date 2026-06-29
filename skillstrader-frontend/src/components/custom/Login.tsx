import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { pb } from '../../lib/pocketbase/pb';
import { Icon } from '@iconify/react';
import Toast from '../ui/Toast';
import Modal from '../ui/Modal';

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

  // Modal state for Contact the Admin
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);



  if (pb.authStore.isValid) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);



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
      setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
    } catch (err: unknown) {
      // Handle backend rate limit error
      const errorLike = err as {
        status?: number;
        response?: { status?: number; message?: string };
        message?: string;
      };
      const status = errorLike.status || errorLike.response?.status;
      const message = (errorLike.response?.message || errorLike.message || '').toLowerCase();
      if (status === 429 || message.includes('too many') || message.includes('rate limit')) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(getErrorMessage(err));
      }
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
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
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
                <label htmlFor="password" className="text-sm font-semibold text-gray-700">
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
                  className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
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
              className="group relative w-full flex justify-center items-center gap-2 rounded-md bg-(--primary) py-3.5 px-4 text-white text-sm font-bold shadow-lg shadow-(--primary)/20 hover:bg-(--primary)/90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100" 
              disabled={loading}
            >
              {loading ? (
                <Icon icon="line-md:loading-twotone-loop" width="20" />
              ) : (
                " "
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Don't have an account?{' '}
              <a
                href="#"
                className="font-bold text-(--primary) hover:text-(--primary)/80 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  setShowContactModal(true);
                }}
              >
                Contact the Admin
              </a>
            </p>
          </div>
        </section>


        {/* Toasts for login */}
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

        {/* Modal for Contact the Admin */}
        <Modal open={showContactModal} onClose={() => {
          setShowContactModal(false);
          setContactEmail("");
          setContactNotes("");
          setContactError(null);
          setContactSuccess(null);
        }} title="Request an Account">
          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setContactError(null);
              setContactSuccess(null);
              setContactLoading(true);
              // TODO: Replace this with actual email sending logic (e.g. API call or EmailJS)
              try {
                // Simulate async email sending
                await new Promise((res) => setTimeout(res, 1200));
                setContactSuccess("Your request has been sent to the admin. Please wait for a response.");
                setContactEmail("");
                setContactNotes("");
              } catch {
                setContactError("Failed to send request. Please try again later.");
              } finally {
                setContactLoading(false);
              }
            }}
          >
            <div>
              <label htmlFor="contact-email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="contact-email"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-notes" className="block text-sm font-semibold text-gray-700 mb-2">
                Notes / Reason
              </label>
              <textarea
                id="contact-notes"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 outline-none transition-all text-gray-900 placeholder:text-gray-400 min-h-[80px]"
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                placeholder="Describe why you need an account"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 rounded-md bg-(--primary) py-3.5 px-4 text-white text-sm font-bold shadow-lg shadow-(--primary)/20 hover:bg-(--primary)/90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
              disabled={contactLoading}
            >
              {contactLoading ? (
                <Icon icon="line-md:loading-twotone-loop" width="20" />
              ) : null}
              {contactLoading ? 'Sending...' : 'Send Request'}
            </button>
            {contactError && (
              <p className="text-xs text-[var(--accent)] text-center mt-2">{contactError}</p>
            )}
            {contactSuccess && (
              <p className="text-xs text-green-600 text-center mt-2">{contactSuccess}</p>
            )}
          </form>
        </Modal>

        <p className="mt-6 text-center text-xs text-gray-400 font-medium">
          &copy; {new Date().getFullYear()} SkillsTrader. All rights reserved.
        </p>
      </div>
    </main>
  );
}
