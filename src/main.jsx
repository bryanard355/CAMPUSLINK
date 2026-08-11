import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from '../Dashboard.jsx';
import LandingPage from './LandingPage.jsx';
import TutorsPage from './TutorsPage.jsx';
import PeerExchangePage from './PeerExchangePage.jsx';
import ResourcesPage from './ResourcesPage.jsx';
import MarketplacePage from './MarketplacePage.jsx';
import LoginPage from './LoginPage.jsx';
import SignUpPage from './SignUpPage.jsx';
import EmailConfirmedPage from './EmailConfirmedPage.jsx';
import AuthCallbackPage from './AuthCallbackPage.jsx';
import CampusLinkApp from './CampusLinkApp.jsx';

const loginStyles = `
  :root {
    --login-bg: #f7faf8;
    --login-surface: #ffffff;
    --login-surface-soft: #edf5ef;
    --login-text: #102616;
    --login-muted: #5b7264;
    --login-border: #d7e7dc;
    --login-accent: #1f7a4d;
    --login-accent-strong: #123626;
    --login-shadow: 0 18px 45px -22px rgba(18, 54, 38, 0.35);
  }

  .login-shell {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at top left, rgba(63, 201, 122, 0.18), transparent 26%),
      linear-gradient(135deg, #f7faf8, #edf5ef 55%, #f7faf8);
    color: var(--login-text);
    font-family: Inter, sans-serif;
    padding: 32px;
  }

  /* Same wave + floating-cube motif as the landing page hero, kept
     subtle here since it sits behind two functional form cards rather
     than being the main visual (like it is on the landing page). */
  .login-bg-wave {
    position: absolute;
    bottom: -12%;
    right: -8%;
    width: 58%;
    max-width: 560px;
    aspect-ratio: 2 / 3;
    z-index: 0;
    pointer-events: none;
  }
  .login-bg-wave svg {
    width: 100%;
    height: 100%;
  }
  .login-stop-a {
    stop-color: #3fc97a;
  }
  .login-stop-b {
    stop-color: #123626;
  }

  .login-cube {
    position: absolute;
    border-radius: 10px;
    box-shadow: 0 10px 22px -10px rgba(18, 54, 38, 0.35);
    z-index: 0;
    pointer-events: none;
  }
  .login-cube-teal {
    background: linear-gradient(135deg, #eaf3ec, #bfe3cc);
  }
  .login-cube-dark {
    background: linear-gradient(135deg, #3fc97a, #123626);
  }
  .login-cube-1 {
    top: 5%;
    left: 3%;
    width: 22px;
    height: 22px;
    transform: rotate(15deg);
  }
  .login-cube-2 {
    top: 44%;
    left: 0.5%;
    width: 30px;
    height: 30px;
    transform: rotate(-12deg);
  }
  .login-cube-3 {
    bottom: 6%;
    left: 8%;
    width: 18px;
    height: 18px;
    transform: rotate(20deg);
  }

  .login-grid {
    position: relative;
    z-index: 1;
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: 24px;
    align-items: stretch;
  }

  .brand-panel,
  .auth-card {
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(8px);
    border: 1px solid var(--login-border);
    box-shadow: var(--login-shadow);
    border-radius: 24px;
  }

  .brand-panel {
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    background: var(--login-surface-soft);
    color: var(--login-accent-strong);
    border: 1px solid var(--login-border);
    padding: 8px 12px;
    border-radius: 999px;
    font-weight: 700;
  }

  .eyebrow {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--login-accent);
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .brand-panel h1 {
    margin: 0;
    font-family: Fraunces, serif;
    font-size: 42px;
    line-height: 1.08;
    color: var(--login-accent-strong);
  }

  .lead-copy {
    margin: 0;
    color: var(--login-muted);
    font-size: 16px;
    line-height: 1.75;
    max-width: 58ch;
  }

  .metrics-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .metric-card {
    background: var(--login-surface-soft);
    border: 1px solid var(--login-border);
    border-radius: 14px;
    padding: 14px;
  }

  .metric-card strong {
    display: block;
    color: var(--login-accent-strong);
    font-size: 22px;
    font-family: Fraunces, serif;
  }

  .metric-card span {
    display: block;
    font-size: 12px;
    color: var(--login-muted);
    margin-top: 4px;
  }

  .feature-list {
    display: grid;
    gap: 10px;
  }

  .detail-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 14px;
    background: var(--login-surface);
    border: 1px solid var(--login-border);
    border-radius: 14px;
  }

  .detail-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: var(--login-surface-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--login-accent);
    flex: none;
  }

  .detail-row h3 {
    margin: 0 0 4px;
    font-size: 15px;
    color: var(--login-accent-strong);
  }

  .detail-row p {
    margin: 0;
    font-size: 13px;
    color: var(--login-muted);
    line-height: 1.6;
  }

  .quote-card {
    margin-top: 6px;
    border-radius: 16px;
    background: linear-gradient(135deg, #123626, #1f7a4d);
    color: white;
    padding: 16px;
  }

  .quote-header {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .quote-header strong {
    display: block;
    margin-bottom: 4px;
  }

  .quote-header p {
    margin: 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.82);
  }

  .quote-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.16);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .quote-body {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin-top: 12px;
    font-size: 13px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.92);
  }

  .form-panel {
    display: flex;
    align-items: center;
  }

  .auth-card {
    width: 100%;
    padding: 28px;
  }

  .auth-topline {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--login-surface-soft);
    color: var(--login-accent-strong);
    border: 1px solid var(--login-border);
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }

  .mini-note {
    font-size: 12px;
    color: var(--login-muted);
  }

  .auth-card h2 {
    margin: 0;
    color: var(--login-accent-strong);
    font-size: 28px;
    font-family: Fraunces, serif;
  }

  .auth-subtitle {
    margin: 8px 0 16px;
    color: var(--login-muted);
    line-height: 1.65;
    font-size: 14px;
  }

  .db-banner,
  .status-banner {
    margin-bottom: 16px;
    border-radius: 12px;
    padding: 11px 12px;
    font-size: 13px;
  }

  .db-banner {
    background: #edf8f1;
    color: #1f7a4d;
    border: 1px solid #cfe8d7;
  }

  .db-banner-warning {
    background: #fff7e9;
    color: #8a5d11;
    border-color: #f0ddb0;
  }

  .status-banner.success {
    background: #edf8f1;
    color: #145a33;
    border: 1px solid #b9ddc5;
  }

  .status-banner.error {
    background: #fff0f0;
    color: #902a2a;
    border: 1px solid #f1c2c2;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .field span {
    font-size: 13px;
    color: var(--login-accent-strong);
    font-weight: 600;
  }

  .input-shell {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f8faf8;
    border: 1px solid var(--login-border);
    border-radius: 12px;
    padding: 0 12px;
    min-height: 46px;
  }

  .input-shell svg {
    color: var(--login-muted);
    flex: none;
  }

  .input-shell input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    /* 16px, not 14px: iOS Safari auto-zooms the whole page when a focused
       input's font-size is under 16px, which is the "why does my phone
       zoom in when I tap the field" bug on the login/signup forms. */
    font-size: 16px;
    color: var(--login-text);
  }

  .icon-button {
    border: none;
    background: transparent;
    color: var(--login-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .form-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .remember {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--login-muted);
  }

  .remember input {
    accent-color: var(--login-accent);
  }

  .link-button {
    border: none;
    background: none;
    color: var(--login-accent);
    font-weight: 700;
    cursor: pointer;
    padding: 0;
  }

  .primary-button {
    border: none;
    background: var(--login-accent);
    color: white;
    padding: 13px 16px;
    border-radius: 12px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
  }

  .divide, .divider {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--login-muted);
    font-size: 12px;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--login-border);
  }

  .social-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .social-button {
    border: 1px solid var(--login-border);
    background: white;
    color: var(--login-accent-strong);
    border-radius: 12px;
    padding: 11px 8px;
    font-weight: 600;
    cursor: pointer;
  }
  .social-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .auth-footer {
    margin: 18px 0 0;
    color: var(--login-muted);
    font-size: 14px;
    text-align: center;
  }

  @media (max-width: 900px) {
    .login-grid {
      grid-template-columns: 1fr;
    }

    .metrics-row,
    .social-grid {
      grid-template-columns: 1fr;
    }

    /* Put the actual login/signup form first on mobile — visitors land on
       a form, not a scroll of marketing copy, before reaching it. This is
       a visual reorder only (order:), the underlying DOM/tab order is
       unchanged. */
    .form-panel {
      order: 1;
    }
    .brand-panel {
      order: 2;
    }
  }

  @media (max-width: 640px) {
    .login-shell {
      padding: 16px;
    }

    .login-grid {
      gap: 16px;
    }

    .brand-panel,
    .auth-card {
      padding: 20px;
      border-radius: 18px;
    }

    .brand-panel h1 {
      font-size: 28px;
    }

    .lead-copy {
      font-size: 14.5px;
    }

    .auth-card h2 {
      font-size: 22px;
    }

    /* The decorative wave/cube art is meant to bleed off-screen at desktop
       size — on a narrow phone it just eats space behind the form, so
       shrink and tuck it further into the corner instead of hiding it
       outright (keeps some of the visual identity). */
    .login-bg-wave {
      width: 70%;
      opacity: 0.28;
    }
  }
`;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <style>{loginStyles}</style>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/home" element={<CampusLinkApp />} />
        <Route path="/tutors" element={<TutorsPage />} />
        <Route path="/peer-exchange" element={<PeerExchangePage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/confirm-email" element={<EmailConfirmedPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
