import React, { useEffect, useState } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { hasSupabaseConfig, getSupabase, getRoleStorageKey, setTabAuthStorageKey } from './lib/supabaseClient';

const highlights = [
	{ icon: ShieldCheck, title: 'Verified access', text: 'University-grade accounts with secure session handling.' },
	{ icon: BookOpen, title: 'Student-first', text: 'Sign up to join tutor bookings, peer groups and resources.' },
	{ icon: Zap, title: 'Quick start', text: 'Minimal form and progressive onboarding for fast access.' },
];

const metrics = [
	{ value: 'Trusted', label: 'by campus' },
	{ value: 'Secure', label: 'privacy-first' },
	{ value: 'Fast', label: 'onboarding' },
];

export default function SignUpPage() {
	const navigate = useNavigate();
	const [fullName, setFullName] = useState('');
	const [university, setUniversity] = useState('');
	const [course, setCourse] = useState('');
	const [role, setRole] = useState('Mentee');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [status, setStatus] = useState({ type: 'idle', message: '' });
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e) {
		e.preventDefault();
		setStatus({ type: 'idle', message: '' });

		if (!email || !password || !fullName || !university || !course || !role) {
			setStatus({ type: 'error', message: 'Please complete all fields.' });
			return;
		}

		if (!hasSupabaseConfig) {
			// Demo fallback
			setLoading(true);
			setStatus({ type: 'success', message: 'Account created (demo). Redirecting to login…' });
			setTimeout(() => {
				setLoading(false);
				navigate('/login');
			}, 900);
			return;
		}

		setLoading(true);
		try {
			const normalizedRole = ['mentor', 'tutor'].includes(role.toLowerCase()) ? 'Mentor' : 'Mentee';
			setTabAuthStorageKey(getRoleStorageKey(normalizedRole));
			const client = getSupabase();
			if (!client) {
				setStatus({ type: 'error', message: 'Unable to initialize Supabase.' });
				setLoading(false);
				return;
			}
			const { data: currentSession } = await client.auth.getSession();
			if (currentSession?.data?.session) {
				await client.auth.signOut();
			}
			const { data, error } = await client.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/confirm-email`,
					data: {
						full_name: fullName,
						email,
						university,
						course,
						role: normalizedRole,
					},
				},
			});
			if (error) {
				setStatus({ type: 'error', message: error.message });
				setLoading(false);
				return;
			}

			const userId = data?.user?.id;
			if (userId) {
				const { error: profileError } = await client.from('profiles').upsert(
					{
						id: userId,
						full_name: fullName,
						email,
						university,
						course,
						role: normalizedRole,
					},
					{ onConflict: 'id' }
				);

				if (profileError) {
					const message = String(profileError.message || '').toLowerCase();
					if (message.includes("could not find the table 'public.profiles'") || message.includes('table "public.profiles" does not exist')) {
						const { error: authMetaError } = await client.auth.updateUser({
							data: {
								full_name: fullName,
								university,
								course,
								role: normalizedRole,
							},
						});
						if (authMetaError) {
							console.warn('Profile creation failed and auth metadata sync failed:', authMetaError);
						} else {
							console.warn('Supabase profiles table missing; saved profile data to auth metadata instead.');
						}
					} else {
						console.warn('Profile creation failed:', profileError);
					}
				}
			}

			const hasSession = Boolean(data?.session?.user);
			if (!hasSession) {
				setStatus({
					type: 'success',
					message:
						'Account created. You must confirm your email before logging in. Check your inbox for the confirmation link.',
				});
				setLoading(false);
				navigate('/login');
				return;
			}

			if (userId) {
				sessionStorage.setItem('campuslink-auth', 'true');
				sessionStorage.setItem(
					'campuslink-user',
					JSON.stringify({
						id: userId,
						name: fullName,
						email,
						role: normalizedRole,
						university,
						course,
					})
				);
			}
			setStatus({ type: 'success', message: 'Account created — redirecting to your dashboard.' });
			navigate('/home');
		} catch (err) {
			setStatus({ type: 'error', message: 'Unexpected error during sign up.' });
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (!hasSupabaseConfig) {
			return;
		}

		const client = getSupabase();
		if (!client) {
			return;
		}

		client.auth.getSession().then(({ data }) => {
			if (data?.session) {
				client.auth.signOut();
			}
		});
	}, []);

	return (
		<div className="login-shell">
			<div className="login-bg-wave" aria-hidden="true">
				<svg viewBox="0 0 400 600" preserveAspectRatio="none">
					<defs>
						<linearGradient id="signupHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
							<stop className="login-stop-a" offset="0%" />
							<stop className="login-stop-b" offset="100%" />
						</linearGradient>
					</defs>
					<path
						d="M170,0 C60,90 230,150 150,260 C70,370 240,430 160,540 C120,590 200,600 260,600 L400,600 L400,0 Z"
						fill="url(#signupHeroGrad)"
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
						<Sparkles size={14} /> Join CampusLink
					</p>
					<h1>Welcome to CampusLink</h1>
					<p className="lead-copy">Create an account to access tutors, peer exchange, resources, and the campus marketplace.</p>

					<div className="metrics-row" aria-label="platform highlights">
						{metrics.map((m) => (
							<div key={m.label} className="metric-card">
								<strong>{m.value}</strong>
								<span>{m.label}</span>
							</div>
						))}
					</div>

					<div className="feature-list">
						{highlights.map((item) => (
							<div key={item.title} className="detail-row">
								<div className="detail-icon">
									<item.icon size={16} />
								</div>
								<div>
									<h3>{item.title}</h3>
									<p>{item.text}</p>
								</div>
							</div>
						))}
					</div>

					<div className="quote-card">
						<div className="quote-header">
							<div className="quote-avatar">
								<CircleUserRound size={18} />
							</div>
							<div>
								<strong>Students love it</strong>
								<p>Onboard in seconds and start connecting immediately.</p>
							</div>
						</div>
						<div className="quote-body">
							<Star size={14} fill="currentColor" />
							<span>Fast, secure, and built for campus workflows.</span>
						</div>
					</div>
				</section>

				<section className="form-panel" aria-labelledby="signup-title">
					<div className="auth-card">
						<div className="auth-topline">
							<span className="pill">
								<BadgeCheck size={14} /> Secure sign up
							</span>
							<span className="mini-note">Student portal</span>
						</div>

						<h2 id="signup-title">Create your account</h2>
						<p className="auth-subtitle">Use your university email to create an account and access CampusLink features.</p>



						{status.type !== 'idle' && (
							<div className={`status-banner ${status.type}`} role="status" aria-live="polite">
								{status.message}
							</div>
						)}

						<form className="login-form" onSubmit={handleSubmit}>
							<label className="field">
								<span>Full name</span>
								<div className="input-shell">
									<BookOpen size={16} />
									<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required />
								</div>
							</label>

							<label className="field">
									<span>University</span>
									<div className="input-shell">
										<GraduationCap size={16} />
										<input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Your university" required />
									</div>
								</label>

								<label className="field">
									<span>Course</span>
									<div className="input-shell">
										<BookOpen size={16} />
										<input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Your course" required />
									</div>
								</label>

								<label className="field">
									<span>Role</span>
									<div className="input-shell">
										<CircleUserRound size={16} />
										<select value={role} onChange={(e) => setRole(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'inherit' }}>
											<option value="Mentee">Mentee</option>
											<option value="Mentor">Mentor</option>
										</select>
									</div>
								</label>

								<label className="field">
									<span>Email address</span>
									<div className="input-shell">
										<Mail size={16} />
										<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@university.edu" autoComplete="email" required />
									</div>
								</label>

								<label className="field">
									<span>Password</span>
									<div className="input-shell">
										<LockKeyhole size={16} />
										<input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" autoComplete="new-password" required />
										<button type="button" className="icon-button" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility">
											{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
								</label>

								<button className="primary-button" type="submit">
									{loading ? 'Creating…' : 'Create account'} <ArrowRight size={16} />
								</button>

								<div className="divider"><span>or continue with</span></div>

								<div className="social-grid">
									<button type="button" className="social-button">Google</button>
									<button type="button" className="social-button">Microsoft</button>
									<button type="button" className="social-button">University Email</button>
								</div>
							</form>

							<p className="auth-footer">
								Already have an account?{' '}
								<button type="button" className="link-button" onClick={() => navigate('/login')}>
									Sign in
								</button>
							</p>
						</div>
					</section>
				</div>
			</div>
		);
	}

