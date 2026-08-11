import React, { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CircleUserRound,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Secure onboarding',
    text: 'Create a trusted student account with protected access and clean account setup.',
  },
  {
    icon: BookOpen,
    title: 'All your learning tools',
    text: 'Jump into tutor matching, study swaps, resources, and marketplace products in one place.',
  },
  {
    icon: Zap,
    title: 'Ready in minutes',
    text: 'A simple registration flow helps students begin learning without friction.',
  },
];

const metrics = [
  { value: '1 min', label: 'setup time' },
  { value: '3x', label: 'faster access' },
  { value: '100%', label: 'student-focused' },
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  function handleSubmit(event) {
    event.preventDefault();
    setStatus({
      type: 'success',
      message: `Account ready for ${name || email || 'your university email'}.`,
    });
  }

  return (
    <div className="login-shell">
      <div className="login-orb login-orb-left" />
      <div className="login-orb login-orb-right" />

      <div className="login-grid">
        <section className="brand-panel">
          <div className="brand-badge">
            <GraduationCap size={18} />
            Campus Link
          </div>

          <p className="eyebrow">
            <Sparkles size={14} /> New student account
          </p>
          <h1>Create your account.</h1>
          <p className="lead-copy">
            Sign up for a secure CampusLink profile and begin exploring study support, peer exchange, and academic resources right away.
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
                <strong>Trusted by students</strong>
                <p>Build your academic profile in a few steps.</p>
              </div>
            </div>
            <div className="quote-body">
              <Star size={14} fill="currentColor" />
              <span>Professional onboarding for a confident first experience.</span>
            </div>
          </div>
        </section>

        <section className="form-panel" aria-labelledby="signup-title">
          <div className="auth-card">
            <div className="auth-topline">
              <span className="pill">
                <BadgeCheck size={14} /> Create account
              </span>
              <span className="mini-note">Student onboarding</span>
            </div>

            <h2 id="signup-title">Sign up</h2>
            <p className="auth-subtitle">
              Start with your name and university email to continue into your CampusLink dashboard.
            </p>

            {status.type !== 'idle' && (
              <div className={`status-banner ${status.type}`} role="status" aria-live="polite">
                {status.message}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Full name</span>
                <div className="input-shell">
                  <CircleUserRound size={16} />
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </label>

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
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </label>

              <button className="primary-button" type="submit">
                Continue <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
