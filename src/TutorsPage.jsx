import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase, hasSupabaseConfig } from './lib/supabaseClient.js';

function normalizeRole(roleValue) {
  const role = String(roleValue || '').trim().toLowerCase();
  if (role === 'tutor' || role === 'mentor') return 'Mentor';
  if (role === 'student' || role === 'mentee') return 'Mentee';
  return roleValue || 'Mentee';
}

export default function TutorsPage() {
  const navigate = useNavigate();
  const [tutors, setTutors] = useState([]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const client = getSupabase();
    if (!client) return;

    async function loadTutors() {
      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, email, university, course, role');

      if (error) {
        console.error('Failed to load tutors:', error.message);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      setTutors(
        rows
          .filter((profile) => normalizeRole(profile.role) === 'Mentor')
          .map((profile) => ({
            id: profile.id,
            name: profile.full_name || profile.email || 'Mentor',
            course: profile.course || 'General',
            topic: profile.course ? `${profile.course} mentor` : 'Campus mentor',
            university: profile.university || '',
          }))
      );
    }

    loadTutors();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#FBFDFB', color: '#0E1F16', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', color: '#123626' }}>Tutors</h1>
            <p style={{ color: '#456153', margin: '6px 0 0' }}>Book a specialist session from verified campus learners.</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: '#1F7A4D', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 10, fontWeight: 600 }}
          >
            Back to Dashboard
          </button>
        </div>

        {tutors.length === 0 ? (
          <p style={{ color: '#456153', fontSize: 14 }}>
            No mentors have joined yet — check back soon, or{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }} style={{ color: '#1F7A4D', fontWeight: 600 }}>
              be the first to sign up
            </a>.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {tutors.map((tutor) => (
              <div key={tutor.id} style={{ background: 'white', border: '1px solid #D8E6DC', borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EAF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {tutor.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{tutor.name}</div>
                    <div style={{ color: '#456153', fontSize: 13 }}>{tutor.course} · {tutor.topic}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 13 }}>
                  <span style={{ color: '#1F7A4D', fontWeight: 600 }}>Verified mentor</span>
                  {tutor.university && <span style={{ color: '#456153' }}>{tutor.university}</span>}
                </div>
                <button
                  style={{ width: '100%', marginTop: 14, border: 'none', background: '#1F7A4D', color: '#fff', padding: '10px 14px', borderRadius: 10, fontWeight: 700 }}
                  onClick={() => navigate('/signup')}
                >
                  Sign up to book
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
