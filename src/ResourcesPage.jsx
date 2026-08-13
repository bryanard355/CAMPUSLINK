import React from 'react';
import { useNavigate } from 'react-router-dom';

const resources = [
  {
    title: 'CSM 261 Midterm Notes',
    course: 'CSM 261',
    by: 'Ama Boateng',
    detail: 'Condensed formulas, worked examples, and quick revision checklists.',
  },
  {
    title: 'Organic Chemistry Reaction Sheet',
    course: 'CHEM 210',
    by: 'Linda Mensah',
    detail: 'Reaction patterns, named mechanisms, and memory-friendly mnemonics.',
  },
  {
    title: 'Data Structures Cheat Sheet',
    course: 'CSM 342',
    by: 'Kwabena Owusu',
    detail: 'Big-O notes, traversal summaries, and implementation hints.',
  },
];

export default function ResourcesPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#FBFDFB', color: '#0E1F16', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span style={{ display: 'inline-block', marginBottom: 8, padding: '5px 10px', borderRadius: 999, background: '#EAF3EC', color: '#1F7A4D', fontSize: 11, fontWeight: 700 }}>Course materials hub</span>
            <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', color: '#123626', fontSize: 34 }}>Resources</h1>
            <p style={{ color: '#456153', margin: '8px 0 0', maxWidth: 680, fontSize: 15 }}>
              Share study files, discover the most useful summaries, and keep your revision materials in one easy place.
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: '#1F7A4D', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 10, fontWeight: 600 }}
          >
            Back to Dashboard
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {resources.map((item) => (
            <div key={item.title} style={{ background: 'white', border: '1px solid #D8E6DC', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, color: '#1F7A4D', fontWeight: 700, marginBottom: 10 }}>{item.course}</div>
              <h3 style={{ margin: 0, color: '#123626' }}>{item.title}</h3>
              <p style={{ margin: '8px 0 14px', color: '#456153', fontSize: 14 }}>{item.detail}</p>
              <div style={{ fontSize: 13, color: '#456153' }}>Shared by <strong>{item.by}</strong></div>
              <button
                style={{ width: '100%', marginTop: 16, border: 'none', background: '#123626', color: '#fff', padding: '10px 14px', borderRadius: 10, fontWeight: 700 }}
                onClick={() => navigate('/')}
              >
                Open resource
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
