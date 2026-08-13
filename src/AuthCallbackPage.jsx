import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, XCircle, GraduationCap, BookOpen, Users, ArrowRight } from 'lucide-react';
import {
	hasSupabaseConfig,
	getSupabase,
	getSupabaseForAuthRedirect,
	getRoleStorageKey,
	setTabAuthStorageKey,
} from './lib/supabaseClient';

const styles = `
	@keyframes ac-spin { to { transform: rotate(360deg); } }
	.ac-spin { animation: ac-spin 0.9s linear infinite; }
	.ac-icon-ring {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 22px;
	}
	.ac-icon-ring.checking { background: var(--login-surface-soft); color: var(--login-accent); }
	.ac-icon-ring.error { background: #fdeceb; color: #c23a2e; }
	.ac-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
	.ac-role-card {
		border: 1px solid var(--login-border);
		background: var(--login-surface);
		border-radius: 16px;
		padding: 20px 14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
	}
	.ac-role-card:hover { border-color: var(--login-accent); background: var(--login-surface-soft); }
	.ac-role-card:active { transform: translateY(1px); }
	.ac-role-card:disabled { opacity: 0.6; cursor: default; }
	.ac-role-icon {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		background: var(--login-surface-soft);
		color: var(--login-accent-strong);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ac-role-card strong { font-size: 14px; color: var(--login-accent-strong); }
	.ac-role-card span { font-size: 12px; color: var(--login-muted); text-align: center; }
`;

// normalizes whatever role string is already on a profile row — signup and
// login both keep a version of this local (no shared util module for it yet)
function normalizeRole(roleValue) {
	const role = String(roleValue || '').trim();
	if (!role) return '';
	if (role.toLowerCase() === 'student' || role.toLowerCase() === 'mentee') return 'Mentee';
	if (role.toLowerCase() === 'tutor' || role.toLowerCase() === 'mentor') return 'Mentor';
	return role;
}

// Where Google (or any future OAuth provider) redirects back to after the
// visitor approves sign-in. Supabase puts the session in the URL; this page
// consumes it, makes sure a profiles row exists (asking for Mentor/Mentee
// once if it's a brand-new account), then hands off into the normal
// tab-scoped session storage the rest of the app expects.
export default function AuthCallbackPage() {
	const navigate = useNavigate();
	const [state, setState] = useState('checking'); // 'checking' | 'choose-role' | 'finishing' | 'error'
	const [errorMessage, setErrorMessage] = useState('');
	const [pendingUser, setPendingUser] = useState(null);
	const [pendingSession, setPendingSession] = useState(null);

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
			setErrorMessage('Supabase is not configured.');
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

		async function handleSession(session) {
			if (settled || !session?.user) return;
			settled = true;

			const { data: existingProfile, error: profileError } = await client
				.from('profiles')
				.select('full_name, email, role, university, course')
				.eq('id', session.user.id)
				.maybeSingle();

			// A failed lookup must NOT fall through to "new account" — that path
			// re-upserts the profile and would silently wipe a returning user's
			// real university/course back to blank on a merely transient error.
			if (profileError) {
				console.error('Failed to load profile after Google sign-in:', profileError.message);
				setErrorMessage('We could not load your account. Please try signing in again.');
				setState('error');
				return;
			}

			const existingRole = normalizeRole(existingProfile?.role);
			if (existingRole) {
				await finishLogin(client, session, {
					full_name: existingProfile?.full_name,
					role: existingRole,
					university: existingProfile?.university,
					course: existingProfile?.course,
				});
				return;
			}

			// New account (or one that somehow never got a role) — ask once.
			setPendingUser(session.user);
			setPendingSession(session);
			setState('choose-role');
		}

		const {
			data: { subscription },
		} = client.auth.onAuthStateChange((_event, session) => {
			handleSession(session);
		});

		const fallback = setTimeout(async () => {
			if (settled) return;
			const { data } = await client.auth.getSession();
			if (data?.session?.user) {
				handleSession(data.session);
			} else {
				settled = true;
				setErrorMessage('We could not find a session for this sign-in attempt.');
				setState('error');
			}
		}, 2000);

		return () => {
			subscription?.unsubscribe();
			clearTimeout(fallback);
		};
	}, []);

	// Persists the session under the same tab-scoped storage key every other
	// login path uses, caches the display user, and sends them into the app —
	// the same handoff LoginPage/SignUpPage do after a password sign-in.
	async function finishLogin(client, session, profile) {
		setState('finishing');
		const role = normalizeRole(profile?.role) || 'Mentee';
		const displayName =
			profile?.full_name ||
			session.user.user_metadata?.full_name ||
			session.user.user_metadata?.name ||
			session.user.email?.split('@')[0] ||
			'CampusLink user';

		setTabAuthStorageKey(getRoleStorageKey(role));
		const appClient = getSupabase();
		if (appClient) {
			await appClient.auth.setSession({
				access_token: session.access_token,
				refresh_token: session.refresh_token,
			});
		}

		sessionStorage.setItem('campuslink-auth', 'true');
		sessionStorage.setItem(
			'campuslink-user',
			JSON.stringify({
				id: session.user.id,
				name: displayName,
				email: session.user.email,
				role,
				university: profile?.university || '',
				course: profile?.course || '',
			})
		);

		navigate('/home', { replace: true });
	}

	async function chooseRole(role) {
		if (!pendingUser || !pendingSession) return;
		setState('finishing');
		const client = getSupabaseForAuthRedirect();
		const fullName =
			pendingUser.user_metadata?.full_name || pendingUser.user_metadata?.name || pendingUser.email?.split('@')[0] || 'CampusLink user';

		// university/course are deliberately omitted here rather than sent as
		// '' — this path only reaches a genuinely new account in the normal
		// case, but as a fallback for the profile-lookup-failed case, an
		// upsert's ON CONFLICT only overwrites columns actually present in the
		// payload, so leaving these out preserves any real values already on
		// the row instead of blanking them.
		const { error } = await client.from('profiles').upsert(
			{
				id: pendingUser.id,
				full_name: fullName,
				email: pendingUser.email,
				role,
			},
			{ onConflict: 'id' }
		);

		if (error) {
			console.warn('Failed to save profile after Google sign-in:', error.message);
		}

		await finishLogin(client, pendingSession, { full_name: fullName, role, university: '', course: '' });
	}

	return (
		<div className="login-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
			<style>{styles}</style>
			<div className="login-bg-wave" aria-hidden="true">
				<svg viewBox="0 0 400 600" preserveAspectRatio="none">
					<defs>
						<linearGradient id="callbackHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
							<stop className="login-stop-a" offset="0%" />
							<stop className="login-stop-b" offset="100%" />
						</linearGradient>
					</defs>
					<path
						d="M170,0 C60,90 230,150 150,260 C70,370 240,430 160,540 C120,590 200,600 260,600 L400,600 L400,0 Z"
						fill="url(#callbackHeroGrad)"
						opacity="0.4"
					/>
				</svg>
			</div>
			<div className="login-cube login-cube-teal login-cube-1" aria-hidden="true" />
			<div className="login-cube login-cube-dark login-cube-2" aria-hidden="true" />
			<div className="login-cube login-cube-teal login-cube-3" aria-hidden="true" />

			<div className="auth-card" style={{ position: 'relative', zIndex: 1, maxWidth: 460, width: '100%', textAlign: 'center' }}>
				<button
					type="button"
					className="brand-badge"
					onClick={() => navigate('/')}
					style={{ cursor: 'pointer', margin: '0 auto 28px' }}
				>
					<GraduationCap size={18} />
					Campus Link
				</button>

				{(state === 'checking' || state === 'finishing') && (
					<>
						<div className="ac-icon-ring checking">
							<Loader2 size={32} className="ac-spin" />
						</div>
						<h2 style={{ marginBottom: 8 }}>{state === 'finishing' ? 'Setting up your account…' : 'Signing you in…'}</h2>
						<p className="auth-subtitle" style={{ margin: 0 }}>Just a moment.</p>
					</>
				)}

				{state === 'choose-role' && (
					<>
						<h2 style={{ marginBottom: 8 }}>Welcome to CampusLink</h2>
						<p className="auth-subtitle" style={{ margin: '0 0 4px' }}>
							One quick thing — how will you be using CampusLink?
						</p>
						<p className="auth-subtitle" style={{ margin: '0 0 20px', fontSize: 12.5 }}>
							You can fill in your university and course from your profile afterward.
						</p>
						<div className="ac-role-grid">
							<button type="button" className="ac-role-card" onClick={() => chooseRole('Mentee')}>
								<div className="ac-role-icon">
									<BookOpen size={20} />
								</div>
								<strong>I'm a Mentee</strong>
								<span>Looking for tutors and help with courses</span>
							</button>
							<button type="button" className="ac-role-card" onClick={() => chooseRole('Mentor')}>
								<div className="ac-role-icon">
									<Users size={20} />
								</div>
								<strong>I'm a Mentor</strong>
								<span>Here to tutor and help other students</span>
							</button>
						</div>
					</>
				)}

				{state === 'error' && (
					<>
						<div className="ac-icon-ring error">
							<XCircle size={36} />
						</div>
						<h2 style={{ marginBottom: 8 }}>Sign-in didn't go through</h2>
						<p className="auth-subtitle" style={{ margin: '0 0 26px' }}>
							{errorMessage || 'Something went wrong finishing your sign-in'}. You can try again from the login page.
						</p>
						<button className="primary-button" type="button" onClick={() => navigate('/login')} style={{ width: '100%' }}>
							Back to log in <ArrowRight size={16} />
						</button>
					</>
				)}
			</div>
		</div>
	);
}
