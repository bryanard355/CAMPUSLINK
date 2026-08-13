import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, GraduationCap, ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { hasSupabaseConfig, getSupabaseForAuthRedirect } from './lib/supabaseClient';

const styles = `
  @keyframes rp-spin { to { transform: rotate(360deg); } }
  .rp-spin { animation: rp-spin 0.9s linear infinite; }
  .rp-icon-ring {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 22px;
  }
  .rp-icon-ring.success { background: #e7f6ee; color: #1f7a4d; }
  .rp-icon-ring.error { background: #fdeceb; color: #c23a2e; }
  .rp-icon-ring.checking { background: var(--login-surface-soft); color: var(--login-accent); }
`;

// Supabase's "reset password" email links here with a recovery session
// already established (tokens in the URL hash, consumed automatically
// because this page's client opts into detectSessionInUrl — see
// getSupabaseForAuthRedirect), the same pattern EmailConfirmedPage and
// AuthCallbackPage use for their own email/OAuth redirect links.
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [state, setState] = useState('checking'); // 'checking' | 'ready' | 'saving' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const urlError =
      params.get('error_description') || hashParams.get('error_description') || params.get('error') || hashParams.get('error');

    if (urlError) {
      setErrorMessage(decodeURIComponent(urlError.replace(/\+/g, ' ')));
      setState('error');
      return;
    }

    if (!hasSupabaseConfig) {
      setErrorMessage('Password reset requires Supabase to be configured.');
      setState('error');
      return;
    }

    const client = getSupabaseForAuthRedirect();
    if (!client) {
      setErrorMessage('Unable to initialize Supabase.');
      setState('error');
      return;
    }

    let settled = false;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (settled) return;
      if (session?.user) {
        settled = true;
        setState('ready');
      }
    });

    // In case the recovery session was already processed before this
    // listener attached, fall back to a direct check after giving
    // detectSessionInUrl a brief moment to run.
    const fallback = setTimeout(async () => {
      if (settled) return;
      const { data } = await client.auth.getSession();
      settled = true;
      if (data?.session?.user) {
        setState('ready');
      } else {
        setErrorMessage('This reset link is invalid or has expired');
        setState('error');
      }
    }, 1800);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setState('saving');
    const client = getSupabaseForAuthRedirect();
    const { error } = await client.auth.updateUser({ password });

    if (error) {
      setFormError(error.message);
      setState('ready');
      return;
    }

    // Deliberately not signing the user straight into the app here — this
    // recovery client/session is a one-off scoped to this tab under a
    // different storage key than the app's normal per-role key (see
    // supabaseClient.js), so sending them back through the real Login page
    // is what actually establishes a proper session under the right key.
    setState('success');
  }

  return (
    <div className="login-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{styles}</style>
      <div className="login-bg-wave" aria-hidden="true">
        <svg viewBox="0 0 400 600" preserveAspectRatio="none">
          <defs>
            <linearGradient id="resetHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop className="login-stop-a" offset="0%" />
              <stop className="login-stop-b" offset="100%" />
            </linearGradient>
          </defs>
          <path
            d="M170,0 C60,90 230,150 150,260 C70,370 240,430 160,540 C120,590 200,600 260,600 L400,600 L400,0 Z"
            fill="url(#resetHeroGrad)"
            opacity="0.4"
          />
        </svg>
      </div>
      <div className="login-cube login-cube-teal login-cube-1" aria-hidden="true" />
      <div className="login-cube login-cube-dark login-cube-2" aria-hidden="true" />
      <div className="login-cube login-cube-teal login-cube-3" aria-hidden="true" />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1, maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <button
          type="button"
          className="brand-badge"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', margin: '0 auto 28px' }}
        >
          <GraduationCap size={18} />
          Campus Link
        </button>

        {state === 'checking' && (
          <>
            <div className="rp-icon-ring checking">
              <Loader2 size={32} className="rp-spin" />
            </div>
            <h2 style={{ marginBottom: 8 }}>Confirming your reset link…</h2>
            <p className="auth-subtitle" style={{ margin: 0 }}>Just a moment.</p>
          </>
        )}

        {(state === 'ready' || state === 'saving') && (
          <>
            <h2 style={{ marginBottom: 8 }}>Set a new password</h2>
            <p className="auth-subtitle" style={{ margin: '0 0 20px' }}>
              Choose a new password for your account.
            </p>

            {formError && (
              <div className="status-banner error" role="status" aria-live="polite" style={{ marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label className="field">
                <span>New password</span>
                <div className="input-shell">
                  <LockKeyhole size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label className="field">
                <span>Confirm password</span>
                <div className="input-shell">
                  <LockKeyhole size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </label>

              <button className="primary-button" type="submit" disabled={state === 'saving'} style={{ width: '100%' }}>
                {state === 'saving' ? 'Saving...' : 'Reset password'} <ArrowRight size={16} />
              </button>
            </form>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="rp-icon-ring success">
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ marginBottom: 8 }}>Password updated!</h2>
            <p className="auth-subtitle" style={{ margin: '0 0 26px' }}>
              Your password has been changed. Log in with your new password to continue.
            </p>
            <button className="primary-button" type="button" onClick={() => navigate('/login')} style={{ width: '100%' }}>
              Continue to log in <ArrowRight size={16} />
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="rp-icon-ring error">
              <XCircle size={36} />
            </div>
            <h2 style={{ marginBottom: 8 }}>This link didn't work</h2>
            <p className="auth-subtitle" style={{ margin: '0 0 26px' }}>
              {errorMessage || 'This reset link is invalid or has expired'}. Request a fresh one from the login page.
            </p>
            <button className="primary-button" type="button" onClick={() => navigate('/login')} style={{ width: '100%' }}>
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
