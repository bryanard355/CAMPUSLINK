import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, GraduationCap, ArrowRight } from 'lucide-react';
import { hasSupabaseConfig, getSupabaseForAuthRedirect } from './lib/supabaseClient';

const styles = `
  @keyframes ec-spin { to { transform: rotate(360deg); } }
  .ec-spin { animation: ec-spin 0.9s linear infinite; }
  .ec-icon-ring {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 22px;
  }
  .ec-icon-ring.success { background: #e7f6ee; color: #1f7a4d; }
  .ec-icon-ring.error { background: #fdeceb; color: #c23a2e; }
  .ec-icon-ring.checking { background: var(--login-surface-soft); color: var(--login-accent); }
`;

// Supabase's confirmation link either lands here with a real session already
// established (tokens in the URL hash, consumed automatically because this
// page's client opts into detectSessionInUrl), or with an ?error= param if
// the link was already used / has expired.
export default function EmailConfirmedPage() {
  const navigate = useNavigate();
  const [state, setState] = useState('checking'); // 'checking' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const urlError = params.get('error_description') || hashParams.get('error_description') || params.get('error') || hashParams.get('error');

    if (urlError) {
      setErrorMessage(decodeURIComponent(urlError.replace(/\+/g, ' ')));
      setState('error');
      return;
    }

    if (!hasSupabaseConfig) {
      // Nothing to verify against, but don't leave the visitor on a stuck
      // spinner — treat it as confirmed since there's no backend to check.
      setState('success');
      return;
    }

    const client = getSupabaseForAuthRedirect();
    if (!client) {
      setState('success');
      return;
    }

    let settled = false;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (settled) return;
      if (session?.user) {
        settled = true;
        setUserName(session.user.user_metadata?.full_name || '');
        setState('success');
      }
    });

    // In case the session was already present/processed before this
    // listener attached (or there was nothing in the URL to process at
    // all — e.g. the visitor already confirmed and is just re-opening the
    // link), fall back to a direct check after giving detectSessionInUrl a
    // brief moment to run.
    const fallback = setTimeout(async () => {
      if (settled) return;
      const { data } = await client.auth.getSession();
      settled = true;
      if (data?.session?.user) {
        setUserName(data.session.user.user_metadata?.full_name || '');
        setState('success');
      } else {
        setState('success'); // no explicit error param — assume it worked
      }
    }, 1800);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div className="login-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{styles}</style>
      <div className="login-bg-wave" aria-hidden="true">
        <svg viewBox="0 0 400 600" preserveAspectRatio="none">
          <defs>
            <linearGradient id="confirmHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop className="login-stop-a" offset="0%" />
              <stop className="login-stop-b" offset="100%" />
            </linearGradient>
          </defs>
          <path
            d="M170,0 C60,90 230,150 150,260 C70,370 240,430 160,540 C120,590 200,600 260,600 L400,600 L400,0 Z"
            fill="url(#confirmHeroGrad)"
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
            <div className="ec-icon-ring checking">
              <Loader2 size={32} className="ec-spin" />
            </div>
            <h2 style={{ marginBottom: 8 }}>Confirming your email…</h2>
            <p className="auth-subtitle" style={{ margin: 0 }}>Just a moment while we verify your link.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="ec-icon-ring success">
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ marginBottom: 8 }}>Email confirmed!</h2>
            <p className="auth-subtitle" style={{ margin: '0 0 26px' }}>
              {userName ? `You're all set, ${userName}. ` : "You're all set. "}
              Your CampusLink account is active — log in to start booking sessions, messaging mentors, and more.
            </p>
            <button className="primary-button" type="button" onClick={() => navigate('/login')} style={{ width: '100%' }}>
              Continue to log in <ArrowRight size={16} />
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="ec-icon-ring error">
              <XCircle size={36} />
            </div>
            <h2 style={{ marginBottom: 8 }}>This link didn't work</h2>
            <p className="auth-subtitle" style={{ margin: '0 0 26px' }}>
              {errorMessage || 'This confirmation link is invalid or has expired'}. If you already confirmed your
              email, you can just log in — otherwise, sign up again to get a fresh link.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="primary-button" type="button" onClick={() => navigate('/login')} style={{ flex: 1 }}>
                Log in
              </button>
              <button className="social-button" type="button" onClick={() => navigate('/signup')} style={{ flex: 1 }}>
                Sign up again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
