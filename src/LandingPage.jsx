import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Calendar, MessageCircle, ShieldCheck, ChevronDown, Mail, Phone, MapPin, User } from 'lucide-react';

const CONTACT = {
  email: 'bryanowusuansah56@gmail.com',
  phone: '0536547409',
  location: 'KNUST, Kumasi, Ghana',
};

const faqs = [
  {
    q: 'Is CampusLink free to use?',
    a: 'Yes — creating an account, browsing mentors, sending requests, and booking sessions is completely free.',
  },
  {
    q: 'Who can join?',
    a: 'Any student with a university email can sign up, either as a mentee looking for help or as a mentor offering it.',
  },
  {
    q: 'How are mentors verified?',
    a: 'Mentors sign up through the same university-affiliated account system as everyone else, which keeps the network campus-only.',
  },
  {
    q: 'How do I book a session?',
    a: "Browse mentors by course, send a request explaining what you need help with, and once a mentor accepts, pick a time slot from their availability.",
  },
  {
    q: 'Can I message my mentor before the session?',
    a: 'Yes — once your request is accepted, you can chat directly inside CampusLink to sort out details beforehand.',
  },
  {
    q: 'Can I reschedule or cancel a session?',
    a: 'Yes, from your Sessions page you can reschedule to a different time or cancel a booking at any time.',
  },
];

const styles = `
  .lp-root {
    --bg:#FBFDFB; --surface:#FFFFFF; --surface-alt:#EAF3EC;
    --ink:#0E1F16; --ink-soft:#456153;
    --green-deep:#123626; --green-mid:#1F7A4D; --green-mid-hover:#186B41; --green-bright:#3FC97A;
    --line:#D8E6DC; --shadow: 0 8px 24px -12px rgba(18,54,38,0.18);
    background:var(--bg); color:var(--ink); font-family:'Inter',sans-serif; min-height:100vh;
  }
  .lp-root h1, .lp-root h2, .lp-root h3 { font-family:'Fraunces',serif; font-weight:600; color:var(--green-deep); margin:0; letter-spacing:-0.01em; }
  .lp-root button { font-family:inherit; cursor:pointer; }
  .lp-wrap { max-width:1080px; margin:0 auto; padding:0 28px; }

  .lp-header { position:sticky; top:0; z-index:10; background:rgba(251,253,251,0.9); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
  .lp-nav { display:flex; align-items:center; justify-content:space-between; height:72px; gap:16px; }
  .lp-logo { display:flex; align-items:center; gap:9px; font-family:'Fraunces',serif; font-weight:700; font-size:19px; color:var(--green-deep); background:none; border:none; padding:0; cursor:pointer; flex:none; }
  .lp-logo-mark { width:32px; height:32px; border-radius:9px; background:var(--green-deep); color:#fff; display:flex; align-items:center; justify-content:center; }
  .lp-nav-links { display:flex; gap:2px; }
  .lp-nav-links button { background:none; border:none; padding:8px 14px; border-radius:999px; font-size:14px; font-weight:500; color:var(--ink-soft); }
  .lp-nav-links button:hover { background:var(--surface-alt); color:var(--green-deep); }
  .lp-nav-actions { display:flex; gap:10px; align-items:center; flex:none; }

  .lp-btn { border-radius:9px; padding:10px 18px; font-weight:600; font-size:14.5px; border:1px solid transparent; }
  .lp-btn-primary { background:var(--green-mid); color:#fff; }
  .lp-btn-primary:hover { background:var(--green-mid-hover); }
  .lp-btn-ghost { background:transparent; color:var(--green-deep); border-color:var(--line); }
  .lp-btn-ghost:hover { background:var(--surface-alt); }
  .lp-btn-lg { padding:13px 22px; font-size:15px; }
  .lp-btn-pill { border-radius:999px; display:inline-flex; align-items:center; gap:8px; }
  .lp-btn-pill-icon { width:20px; height:20px; border-radius:50%; background:rgba(255,255,255,0.22); display:inline-flex; align-items:center; justify-content:center; flex:none; }

  .lp-hero { position:relative; padding:48px 0 64px; overflow:hidden; }
  .lp-hero-bg { position:absolute; top:0; right:0; bottom:0; width:52%; min-width:340px; z-index:0; pointer-events:none; }
  .lp-hero-bg svg { position:absolute; top:-10%; right:-15%; width:130%; height:120%; }
  .lp-stop-a { stop-color: var(--green-bright); }
  .lp-stop-b { stop-color: var(--green-deep); }
  .lp-hero-pill {
    position:absolute; left:10%; bottom:16%; z-index:2;
    padding:14px 28px; border-radius:999px; border:none; cursor:pointer;
    background:rgba(255,255,255,0.95); color:var(--green-deep); font-weight:700; font-size:14px;
    box-shadow:0 16px 32px -12px rgba(18,54,38,0.5);
  }
  .lp-cube { position:absolute; border-radius:10px; box-shadow:0 10px 22px -10px rgba(18,54,38,0.4); }
  .lp-cube-pale { background:linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.55)); }
  .lp-cube-1 { top:12%; right:18%; width:26px; height:26px; transform:rotate(12deg); }
  .lp-cube-2 { top:32%; right:6%; width:18px; height:18px; transform:rotate(-8deg); }
  .lp-cube-3 { bottom:26%; right:26%; width:32px; height:32px; transform:rotate(20deg); }
  .lp-cube-4 { bottom:10%; right:8%; width:16px; height:16px; transform:rotate(-15deg); }

  .lp-hero-grid { position:relative; z-index:1; display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:center; min-height:420px; }
  .lp-hero-copy { max-width:460px; }
  .lp-hero-copy .lp-eyebrow { margin-bottom:14px; }
  .lp-hero h1 { font-size:40px; line-height:1.12; text-align:left; }
  .lp-lead { color:var(--ink-soft); font-size:16px; line-height:1.7; margin:16px 0 26px; text-align:left; max-width:44ch; }
  .lp-cta-row { display:flex; gap:12px; flex-wrap:wrap; justify-content:flex-start; }
  .lp-cube-row { display:flex; align-items:flex-end; gap:14px; margin-top:36px; }
  .lp-cube-row .lp-cube { position:static; }
  .lp-cube-teal { background:linear-gradient(135deg, var(--surface-alt), #BFE3CC); }
  .lp-cube-dark { background:linear-gradient(135deg, var(--green-bright), var(--green-deep)); }

  .lp-about { padding:64px 0; border-top:1px solid var(--line); }
  .lp-about h2 { font-size:26px; text-align:center; }
  .lp-about > .lp-wrap > p { color:var(--ink-soft); font-size:15px; line-height:1.75; max-width:640px; margin:14px auto 40px; text-align:center; }
  .lp-feature-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
  .lp-feature { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:20px; display:flex; flex-direction:column; gap:8px; }
  .lp-feature svg { color:var(--green-mid); }
  .lp-feature h3 { font-size:15px; }
  .lp-feature p { color:var(--ink-soft); font-size:13px; line-height:1.6; margin:0; }

  .lp-faq { padding:64px 0; background:var(--surface-alt); border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
  .lp-faq h2 { font-size:26px; text-align:center; margin-bottom:32px; }
  .lp-faq-list { max-width:680px; margin:0 auto; display:flex; flex-direction:column; gap:10px; }
  .lp-faq-item { background:var(--surface); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  .lp-faq-q { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; background:none; border:none; text-align:left; font-weight:600; font-size:14.5px; color:var(--ink); }
  .lp-faq-q svg { flex:none; color:var(--green-mid); transition:transform .15s ease; }
  .lp-faq-item.open .lp-faq-q svg { transform:rotate(180deg); }
  .lp-faq-a { padding:0 18px; max-height:0; overflow:hidden; transition:max-height .2s ease, padding .2s ease; color:var(--ink-soft); font-size:13.5px; line-height:1.65; }
  .lp-faq-item.open .lp-faq-a { padding:0 18px 16px; max-height:200px; }

  .lp-contact { padding:64px 0; }
  .lp-contact h2 { font-size:26px; text-align:center; }
  .lp-contact > .lp-wrap > p { color:var(--ink-soft); font-size:15px; line-height:1.7; max-width:520px; margin:14px auto 32px; text-align:center; }
  .lp-contact-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; max-width:820px; margin:0 auto; }
  .lp-contact-card { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:20px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; }
  .lp-contact-card svg { color:var(--green-mid); }
  .lp-contact-card .label { font-size:12px; color:var(--ink-soft); text-transform:uppercase; letter-spacing:.04em; }
  .lp-contact-card a, .lp-contact-card span.value { font-weight:600; font-size:14.5px; color:var(--green-deep); text-decoration:none; }
  .lp-contact-card a:hover { text-decoration:underline; }

  .lp-footer { border-top:1px solid var(--line); padding:28px 0; color:var(--ink-soft); font-size:13px; text-align:center; }

  @media (max-width:880px) {
    .lp-nav-links { display:none; }
    .lp-hero-bg { display:none; }
    .lp-hero-grid { grid-template-columns:1fr; min-height:0; }
    .lp-hero-copy { max-width:none; }
  }
  @media (max-width:820px) {
    .lp-feature-grid { grid-template-columns:1fr 1fr; }
    .lp-contact-grid { grid-template-columns:1fr; }
    .lp-hero h1 { font-size:30px; }
  }
  @media (max-width:560px) {
    .lp-feature-grid { grid-template-columns:1fr; }
  }
`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="lp-root">
      <style>{styles}</style>

      <header className="lp-header">
        <div className="lp-wrap lp-nav">
          <button className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="lp-logo-mark"><GraduationCap size={17} /></span>
            CampusLink
          </button>
          <nav className="lp-nav-links">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Home</button>
            <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>About</button>
            <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}>FAQ</button>
            <button onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>Contact</button>
          </nav>
          <div className="lp-nav-actions">
            <button className="lp-btn lp-btn-primary lp-btn-pill" onClick={() => navigate('/login')}>
              <span className="lp-btn-pill-icon"><User size={12} /></span>
              Log in
            </button>
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-bg" aria-hidden="true">
          <svg viewBox="0 0 400 600" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lpHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop className="lp-stop-a" offset="0%" />
                <stop className="lp-stop-b" offset="100%" />
              </linearGradient>
            </defs>
            <path
              d="M170,0 C60,90 230,150 150,260 C70,370 240,430 160,540 C120,590 200,600 260,600 L400,600 L400,0 Z"
              fill="url(#lpHeroGrad)"
            />
          </svg>
          <button className="lp-hero-pill" onClick={() => navigate('/signup')}>Get started</button>
          <div className="lp-cube lp-cube-pale lp-cube-1" />
          <div className="lp-cube lp-cube-pale lp-cube-2" />
          <div className="lp-cube lp-cube-pale lp-cube-3" />
          <div className="lp-cube lp-cube-pale lp-cube-4" />
        </div>

        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">Campus Learning Exchange</span>
            <h1>Real mentors. Real sessions.<br />One campus network.</h1>
            <p className="lp-lead">
              CampusLink connects verified students with mentors for one-on-one tutoring. Request a mentor for your
              course, get accepted, book a real session, and message them directly — all inside your university's
              own email domain.
            </p>
            <div className="lp-cta-row">
              <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => navigate('/signup')}>Create your account</button>
              <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => navigate('/login')}>I already have an account</button>
            </div>
            <div className="lp-cube-row" aria-hidden="true">
              <div className="lp-cube lp-cube-teal" style={{ width: 30, height: 30 }} />
              <div className="lp-cube lp-cube-dark" style={{ width: 42, height: 42 }} />
              <div className="lp-cube lp-cube-teal" style={{ width: 24, height: 24 }} />
            </div>
          </div>
          <div />
        </div>
      </section>

      <section className="lp-about" id="about">
        <div className="lp-wrap">
          <h2>What is CampusLink?</h2>
          <p>
            CampusLink is a mentoring platform built for university students — one verified place to find help with
            a course, instead of scattered WhatsApp groups and screenshots. Sign up as a mentee to request a mentor,
            or as a mentor to start helping other students.
          </p>
          <div className="lp-feature-grid">
            <div className="lp-feature">
              <Users size={20} />
              <h3>Find a mentor</h3>
              <p>Browse verified mentors by course and send a request explaining what you need help with.</p>
            </div>
            <div className="lp-feature">
              <Calendar size={20} />
              <h3>Book a real session</h3>
              <p>Once a mentor accepts, pick a time slot — reschedule or cancel any time from your Sessions page.</p>
            </div>
            <div className="lp-feature">
              <MessageCircle size={20} />
              <h3>Message your mentor</h3>
              <p>Chat directly inside CampusLink to sort out details before your session.</p>
            </div>
            <div className="lp-feature">
              <ShieldCheck size={20} />
              <h3>Verified & campus-only</h3>
              <p>Every account is tied to a university email, keeping the network trusted.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-faq" id="faq">
        <div className="lp-wrap">
          <h2>Frequently asked questions</h2>
          <div className="lp-faq-list">
            {faqs.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div className={`lp-faq-item${isOpen ? ' open' : ''}`} key={item.q}>
                  <button
                    type="button"
                    className="lp-faq-q"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    {item.q}
                    <ChevronDown size={16} />
                  </button>
                  <div className="lp-faq-a">{item.a}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lp-contact" id="contact">
        <div className="lp-wrap">
          <h2>Get in touch</h2>
          <p>Questions, feedback, or something not working right? Reach out any of these ways.</p>
          <div className="lp-contact-grid">
            <div className="lp-contact-card">
              <Mail size={20} />
              <span className="label">Email</span>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </div>
            <div className="lp-contact-card">
              <Phone size={20} />
              <span className="label">Phone</span>
              <a href={`tel:${CONTACT.phone}`}>{CONTACT.phone}</a>
            </div>
            <div className="lp-contact-card">
              <MapPin size={20} />
              <span className="label">Location</span>
              <span className="value">{CONTACT.location}</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap">
          CampusLink · CSM 366 Mini Project · Supervisor: Dr. Benjamin Tei-Partey
          <br />
          {CONTACT.email} · {CONTACT.phone} · {CONTACT.location}
        </div>
      </footer>
    </div>
  );
}
