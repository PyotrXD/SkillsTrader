import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { pb } from '../pb';
import './login.css';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Login failed. Please check your credentials.';
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (pb.authStore.isValid) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await pb.collection('users').authWithPassword(email.trim(), password);
      setSuccess('Signed in successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage">
      <aside className="authLeft" aria-hidden="true">
        <div className="authLeftBg" />
        <div className="authLeftGrid" />
        <div className="authLeftContent">
          <div className="authBrand">
            <div className="authBrandMark" />
            <span className="authBrandName">SkillsTrader</span>
          </div>

          <div>
            <h2 className="authPanelHeadline">
              Trade skills.
              <br />
              Build <em>momentum</em>.
            </h2>
            <p className="authPanelTagline">
              Sign in to manage your account, track progress, and unlock more features.
            </p>
            <div className="authPanelPills">
              <span className="authPanelPill">Secure sign-in</span>
              <span className="authPanelPill">Mobile-first</span>
            </div>
          </div>

          <div className="authPanelFooter">© {new Date().getFullYear()} SkillsTrader</div>
        </div>
      </aside>

      <main className="authRight">
        <div className="authRightInner">
          <div className="authMobileBrand" aria-hidden="true">
            <div className="authMobileBrandMark" />
            <span className="authMobileBrandName">SkillsTrader</span>
          </div>

          <section className="authCard" aria-label="Sign in">
            {pb.authStore.isValid ? (
              <>
                <p className="authCardEyebrow">Welcome</p>
                <h1 className="authCardTitle">You are signed in</h1>
                <p className="authCardSub">
                  Logged in as <strong>{pb.authStore.record?.email ?? 'your account'}</strong>.
                </p>

                <div className="authForm">
                  <button type="button" className="authPrimaryButton" onClick={() => pb.authStore.clear()}>
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="authCardEyebrow">Welcome back</p>
                <h1 className="authCardTitle">Sign in to your account</h1>
                <p className="authCardSub">
                </p>

                <form className="authForm" onSubmit={handleSubmit}>
                  <div aria-live="polite">
                    {error && <div className="authAlert authAlertError">{error}</div>}
                    {success && <div className="authAlert authAlertSuccess">{success}</div>}
                  </div>

                  <div className="authField">
                    <div className="authLabelRow">
                      <label htmlFor="email">Email</label>
                    </div>
                    <div className="authInputWrap">
                      <svg
                        className="authInputIcon"
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        inputMode="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="authField">
                    <div className="authLabelRow">
                      <label htmlFor="password">Password</label>
                      <a href="#" className="authForgot" onClick={(e) => e.preventDefault()}>
                        Forgot password?
                      </a>
                    </div>
                    <div className="authInputWrap">
                      <svg
                        className="authInputIcon"
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="authPrimaryButton" disabled={loading}>
                    {loading && <span className="authSpinner" aria-hidden="true" />}
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>

                <p className="authSignupRow">
                  No account?{' '}
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    Contact the developer
                  </a>
                </p>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
