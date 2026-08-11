import React from 'react';
import { useNavigate } from 'react-router-dom';

const exchangeIdeas = [
  {
    title: 'Study Swap',
    subtitle: 'Trade notes for a class you understand with a peer who needs help in another one.',
    tag: 'Course notes',
  },
  {
    title: 'Exam Prep Duo',
    subtitle: 'Pair up for a 30-minute quiz review and practice problem session before the test.',
    tag: 'Practice session',
  },
  {
    title: 'Concept Exchange',
    subtitle: 'Teach a concept you know well and learn a new one from someone else in return.',
    tag: 'Knowledge share',
  },
  {
    title: 'Weekly Check-in',
    subtitle: 'Set a short accountability meetup to stay consistent with assignments and deadlines.',
    tag: 'Accountability',
  },
];

const exchangeItems = [
  { label: 'Notes', value: 'Shared PDFs and summaries' },
  { label: 'Sessions', value: '30-min peer quiz prep' },
  { label: 'Resources', value: 'Past questions + cheat sheets' },
  { label: 'Support', value: 'Friendly accountability partners' },
];

const howItWorks = [
  'Choose your study need or course area.',
  'Match with a student who can help in return.',
  'Set a quick session, send a resource, or book a check-in.',
  'Leave feedback so better peers can be recommended next time.',
];

export default function PeerExchangePage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#FBFDFB', color: '#0E1F16', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span style={{ display: 'inline-block', marginBottom: 8, padding: '5px 10px', borderRadius: 999, background: '#EAF3EC', color: '#1F7A4D', fontSize: 11, fontWeight: 700 }}>Campus peer-to-peer learning</span>
            <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', color: '#123626', fontSize: 34 }}>Peer Exchange</h1>
            <p style={{ color: '#456153', margin: '8px 0 0', maxWidth: 690, fontSize: 15 }}>
              Find relatable study partners, swap useful materials, and build small learning routines that fit your actual campus life.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            style={{ background: '#1F7A4D', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 10, fontWeight: 600 }}
          >
            Back to Dashboard
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 22 }}>
          {[
            { value: '68%', label: 'students reported better course momentum' },
            { value: '4.8/5', label: 'average peer support rating' },
            { value: '24', label: 'active exchange slots this week' },
          ].map((item) => (
            <div key={item.label} style={{ background: 'white', border: '1px solid #D8E6DC', borderRadius: 14, padding: 16 }}>
              <div style={{ fontFamily: 'Fraunces, serif', color: '#123626', fontSize: 28 }}>{item.value}</div>
              <div style={{ color: '#456153', fontSize: 13, marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18, marginBottom: 22 }}>
          <div style={{ background: 'white', border: '1px solid #D8E6DC', borderRadius: 16, padding: 18 }}>
            <h3 style={{ margin: 0, color: '#123626' }}>What students are exchanging</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 14 }}>
              {exchangeItems.map((item) => (
                <div key={item.label} style={{ background: '#EAF3EC', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: '#123626', marginBottom: 5 }}>{item.label}</div>
                  <div style={{ color: '#456153', fontSize: 13 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#123626', color: 'white', borderRadius: 16, padding: 18 }}>
            <h3 style={{ margin: 0 }}>How it works</h3>
            <ol style={{ paddingLeft: 18, margin: '14px 0 0', lineHeight: 1.8, color: '#DDECE4' }}>
              {howItWorks.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {exchangeIdeas.map((idea) => (
            <div key={idea.title} style={{ background: 'white', border: '1px solid #D8E6DC', borderRadius: 14, padding: 18 }}>
              <span style={{ display: 'inline-block', background: '#EAF3EC', color: '#1F7A4D', padding: '4px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                {idea.tag}
              </span>
              <h3 style={{ margin: '14px 0 8px', color: '#123626' }}>{idea.title}</h3>
              <p style={{ color: '#456153', margin: 0, fontSize: 14 }}>{idea.subtitle}</p>
              <button
                style={{ width: '100%', marginTop: 16, border: 'none', background: '#123626', color: '#fff', padding: '10px 14px', borderRadius: 10, fontWeight: 700 }}
                onClick={() => navigate('/')}
              >
                Request exchange
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, background: '#EAF3EC', border: '1px solid #D8E6DC', borderRadius: 16, padding: 18 }}>
          <h3 style={{ margin: 0, color: '#123626' }}>Why this works</h3>
          <p style={{ color: '#456153', margin: '8px 0 0', lineHeight: 1.7 }}>
            Students usually learn faster when they exchange help in a way that matches their real routine: a quick note swap, a short quiz session, or a weekly check-in with a peer.
            CampusLink makes that kind of tutoring feel practical, friendly, and easy to start.
          </p>
        </div>
      </div>
    </div>
  );
}
