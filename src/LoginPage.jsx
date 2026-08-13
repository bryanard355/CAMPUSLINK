import React, { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CircleUserRound,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { hasSupabaseConfig, getSupabase, getRoleStorageKey, setTabAuthStorageKey } from './lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Verified access',
    text: 'University-grade sign in with secure session handling and clear account protection.',
  },
  {
    icon: BookOpen,
    title: 'Built for students',
    text: 'A focused entry point for bookings, tutor matching, and academic support workflows.',
  },
  {
    icon: Zap,
    title: 'Fast to use',
    text: 'Clean layout, strong contrast, and a clear call to action for quick sign in.',
  },
];

const metrics = [
  { value: '24/7', label: 'student access' },
  { value: '98%', label: 'session success' },
  { value: '1 min', label: 'average login' },
];

const socialOptions = ['Google', 'Microsoft', 'University Email'];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

const DEMO_ACCOUNT = {
  email: 'demo@campuslink.test',
  password: 'Demo1234!',
  fullName: 'Demo Student',
};

function isDemoCredentials(email, password) {
  return email.trim().toLowerCase() === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password;
}

function DetailRow({ icon: Icon, title, text }) {
  return (
    <div className="detail-row">
      <div className="detail-icon">
        <Icon size={16} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

function normalizeRole(roleValue) {
  const role = String(roleValue || '').trim();
  if (!role) return 'Mentee';
  if (role.toLowerCase() === 'student' || role.toLowerCase() === 'mentee') return 'Mentee';
  if (role.toLowerCase() === 'tutor' || role.toLowerCase() === 'mentor') return 'Mentor';
  return role;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState('Mentee');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [loading, setLoading] = useState(false);

  function isMissingProfilesTableError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes("could not find the table 'public.profiles'") || message.includes('table "public.profiles" does not exist');
  }

  async function loadProfile(client, userId) {
    if (!client) return null;

    const { data, error } = await client
      .from('profiles')
      .select('full_name, email, role, university, course')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (isMissingProfilesTableError(error)) {
        console.warn('Supabase profiles table missing during login; falling back to auth metadata.');
      } else {
        console.warn('Unable to load profile:', error);
      }
      return null;
    }

    return data;
  }

  async function ensureProfile(client, userId, emailAddress, name, roleValue) {
    if (!client || !userId) return null;

    const existingProfile = await loadProfile(client, userId);
    const cleanName = String(name || '').trim();
    const normalizedRole = normalizeRole(roleValue);

    if (existingProfile) {
      const needsUpdate =
        !existingProfile.full_name ||
        !existingProfile.role ||
        normalizeRole(existingProfile.role) !== normalizedRole ||
        !existingProfile.email ||
        !existingProfile.university ||
        !existingProfile.course;

      if (!needsUpdate) {
        return existingProfile;
      }
    }

    const fallbackName = String(emailAddress?.split('@')[0] || '').trim();
    const isFallbackName = cleanName && cleanName.toLowerCase() === fallbackName.toLowerCase();
    if (!cleanName || isFallbackName) {
      return existingProfile;
    }

    const { error } = await client
      .from('profiles')
      .upsert(
        {
          id: userId,
          full_name: cleanName,
          email: emailAddress,
          role: normalizedRole,
          university: existingProfile?.university || '',
          course: existingProfile?.course || '',
        },
        { onConflict: 'id' }
      );

    if (error) {
      if (isMissingProfilesTableError(error)) {
        console.warn('Supabase profiles table missing during login sync; using auth metadata only.');
      } else {
        console.warn('Login profile sync failed:', error);
      }
      return existingProfile;
    }

    return loadProfile(client, userId);
  }

  function isValidFullName(fullName, emailAddress) {
    const clean = String(fullName || '').trim();
    if (!clean) return false;
    const fallback = String(emailAddress?.split('@')[0] || '').trim();
    return clean.toLowerCase() !== fallback.toLowerCase();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!hasSupabaseConfig) {
      if (isDemoCredentials(email, password)) {
        setLoading(true);
        setStatus({ type: 'success', message: `Signed in demo user ${DEMO_ACCOUNT.fullName}.` });
        sessionStorage.setItem('campuslink-auth', 'true');
        sessionStorage.setItem(
          'campuslink-user',
          JSON.stringify({ id: 'demo-user', name: DEMO_ACCOUNT.fullName, email: DEMO_ACCOUNT.email })
        );
        navigate('/home', { replace: true });
        return;
      }

      setStatus({
        type: 'error',
        message:
          'Demo login is available with email demo@campuslink.test and password Demo1234!.',
      });
      return;
    }

    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    setTabAuthStorageKey(getRoleStorageKey(loginRole));
    const client = getSupabase();
    if (!client) {
      setLoading(false);
      setStatus({ type: 'error', message: 'Unable to initialize Supabase.' });
      return;
    }

    const currentSession = await client.auth.getSession();
    if (currentSession?.data?.session) {
      await client.auth.signOut();
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setStatus({ type: 'error', message: error.message });
      return;
    }

    const user = data.user;
    const savedProfile = user ? await loadProfile(client, user.id) : null;
    let profile = savedProfile;

    if (!profile && isValidFullName(user?.user_metadata?.full_name, email)) {
      profile = await ensureProfile(client, user.id, email, user.user_metadata.full_name, user?.user_metadata?.role || loginRole);
    }

    const actualRoleSource = profile?.role || user?.user_metadata?.role || '';
    // When nothing anywhere has a stored role (e.g. a profile row that could
    // never be created because the account has no valid full name — see
    // ensureProfile above), fall back to 'Mentee' rather than trusting
    // whatever role happens to be selected in the login dropdown. Without
    // this, the account's effective role could silently become whatever was
    // clicked each time, while a page reload re-derives it via
    // CampusLinkApp's own loader — which defaults to 'Mentee' the same way —
    // causing the same account's role to flip depending on how it was
    // reached.
    const actualRole = actualRoleSource ? normalizeRole(actualRoleSource) : 'Mentee';
    const requestedRole = normalizeRole(loginRole);

    if (actualRoleSource && actualRole !== requestedRole) {
      setLoading(false);
      setStatus({
        type: 'error',
        message: `This account is registered as ${actualRole} and cannot log in as ${requestedRole}.`,
      });
      return;
    }

    const displayName = profile?.full_name || String(user?.user_metadata?.full_name || email.split('@')[0]).trim();

    setLoading(false);
    setStatus({
      type: 'success',
      message: `Signed in successfully${displayName ? ` as ${displayName}` : email ? ` as ${email}` : ''}.`,
    });

    sessionStorage.setItem('campuslink-auth', 'true');
    sessionStorage.setItem(
      'campuslink-user',
      JSON.stringify({
        id: user?.id,
        name: displayName,
        email: user?.email || email,
        role: actualRole,
        university: profile?.university || '',
        course: profile?.course || '',
      })
    );
    navigate('/home');
    console.log('Logged in user role:', actualRole);
  }

  async function handleGoogleLogin() {
    if (!hasSupabaseConfig) {
      setStatus({ type: 'error', message: 'Google sign-in requires Supabase to be configured.' });
      return;
    }
    const client = getSupabase();
    if (!client) {
      setStatus({ type: 'error', message: 'Unable to initialize Supabase.' });
      return;
    }
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus({ type: 'error', message: error.message });
    }
    // On success the browser navigates to Google immediately — AuthCallbackPage
    // takes it from there once Google redirects back.
  }

  function handleDemoLogin() {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setStatus({ type: 'success', message: `Demo login ready: ${DEMO_ACCOUNT.email}` });
    if (!hasSupabaseConfig) {
      sessionStorage.setItem('campuslink-auth', 'true');
      sessionStorage.setItem(
        'campuslink-user',
        JSON.stringify({ id: 'demo-user', name: DEMO_ACCOUNT.fullName, email: DEMO_ACCOUNT.email, role: loginRole, university: '', course: '' })
      );
      navigate('/home');
    }
  }

  return (
    <div className="login-shell">
      <div className="login-bg-wave" aria-hidden="true">
        <svg viewBox="0 0 400 600" preserveAspectRatio="none">
          <defs>
            <linearGradient id="loginHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop className="login-stop-a" offset="0%" />
              <stop className="login-stop-b" offset="100%" />
            </linearGradient>
          </defs>
          <path
            d="M170,0 C60,90 230,150 150,260 C70,370 240,430 160,540 C120,590 200,600 260,600 L400,600 L400,0 Z"
            fill="url(#loginHeroGrad)"
            opacity="0.4"
          />
        </svg>
      </div>
      <div className="login-cube login-cube-teal login-cube-1" aria-hidden="true" />
      <div className="login-cube login-cube-dark login-cube-2" aria-hidden="true" />
      <div className="login-cube login-cube-teal login-cube-3" aria-hidden="true" />

      <div className="login-grid">
        <section className="brand-panel">
          <button
            type="button"
            className="brand-badge"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          >
            <GraduationCap size={18} />
            Campus Link
          </button>

          <p className="eyebrow">
            <Sparkles size={14} /> Professional student access
          </p>
          <h1>Welcome back.</h1>
          <p className="lead-copy">
            Sign in to continue to your dashboard, tutor matches, and upcoming sessions with a clean, confident first impression.
          </p>

          <div className="metrics-row" aria-label="platform highlights">
            {metrics.map((metric) => (
              <div key={metric.label} className="metric-card">
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>

          <div className="feature-list">
            {highlights.map((item) => (
              <DetailRow key={item.title} icon={item.icon} title={item.title} text={item.text} />
            ))}
          </div>

          <div className="quote-card">
            <div className="quote-header">
              <div className="quote-avatar">
                <CircleUserRound size={18} />
              </div>
              <div>
                <strong>Trusted by students</strong>
                <p>Designed to feel reliable from the first tap.</p>
              </div>
            </div>
            <div className="quote-body">
              <Star size={14} fill="currentColor" />
              <span>Simple, polished, and easy to use across desktop and mobile.</span>
            </div>
          </div>
        </section>

        <section className="form-panel" aria-labelledby="login-title">
          <div className="auth-card">
            <div className="auth-topline">
              <span className="pill">
                <BadgeCheck size={14} /> Secure sign in
              </span>
              <span className="mini-note">Student portal</span>
            </div>

            <h2 id="login-title">Sign in to your account</h2>
            <p className="auth-subtitle">
              Use your university email to continue. Your schedule, bookings, and saved tutors will be ready after login.
            </p>

            {status.type !== 'idle' && (
              <div className={`status-banner ${status.type}`} role="status" aria-live="polite">
                {status.message}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Email address</span>
                <div className="input-shell">
                  <Mail size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@university.edu"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className="field">
                <span>Password</span>
                <div className="input-shell">
                  <LockKeyhole size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
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
                <span>Login as</span>
                <div className="input-shell">
                  <CircleUserRound size={16} />
                  <select
                    value={loginRole}
                    onChange={(event) => setLoginRole(event.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'inherit' }}
                  >
                    <option value="Mentee">Mentee</option>
                    <option value="Mentor">Mentor</option>
                  </select>
                </div>
              </label>

              <div className="form-row">
                <label className="remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="link-button">
                  Forgot password?
                </button>
              </div>

              <button className="primary-button" type="submit">
                {loading ? 'Signing in...' : 'Continue'} <ArrowRight size={16} />
              </button>

              <div className="divider">
                <span>or continue with</span>
              </div>

              <div className="social-grid">
                {socialOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="social-button"
                    onClick={option === 'Google' ? handleGoogleLogin : undefined}
                    disabled={option !== 'Google'}
                    title={option === 'Google' ? undefined : 'Coming soon'}
                  >
                    {option === 'Google' && <GoogleIcon />}
                    {option}
                  </button>
                ))}
              </div>
            </form>

            {!hasSupabaseConfig && (
              <div className="demo-login-block" style={{ marginTop: '1rem' }}>
                <p className="demo-note" style={{ marginBottom: '0.75rem' }}>
                  Demo login credentials: <strong>{DEMO_ACCOUNT.email}</strong> / <strong>{DEMO_ACCOUNT.password}</strong>
                </p>
                <button type="button" className="primary-button" onClick={handleDemoLogin}>
                  Use demo account
                </button>
              </div>
            )}

            <p className="auth-footer">
              New here? <button type="button" className="link-button" onClick={() => navigate('/signup')}>Create an account</button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
