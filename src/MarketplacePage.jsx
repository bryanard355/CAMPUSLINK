import React from 'react';
import { useNavigate } from 'react-router-dom';

const marketItems = [
  {
    title: 'Full-Stack Web Dev Workshop',
    desc: 'A guided, 6-week course covering practical building blocks for web applications, API work, and UI flows.',
    price: 'GHS 50',
    tag: 'Workshop',
  },
  {
    title: 'LaTeX for Thesis Writing',
    desc: 'A structured course for producing polished academic documents with clean formatting, page layouts, and citation flow.',
    price: 'GHS 20',
    tag: 'Course',
  },
  {
    title: 'CSM 200-Level Past Questions Bundle',
    desc: 'A curated revision pack of past exam questions and solved problem sets for faster and smarter preparation.',
    price: 'GHS 15',
    tag: 'Revision pack',
  },
];

const productHighlights = [
  'Short, practical learning products',
  'Strong student-focused course delivery',
  'Verified academic and career relevance',
];

const categories = [
  { name: 'Exam Prep', count: '12 resources' },
  { name: 'Career Skills', count: '8 resources' },
  { name: 'Course Tools', count: '15 resources' },
  { name: 'Study Bundles', count: '6 resources' },
];

const featuredBenefits = [
  { title: 'Mentor-approved', text: 'Resources are reviewed by knowledgeable student creators and tutors.' },
  { title: 'Fast access', text: 'Most products are downloadable or immediately bookable from one place.' },
  { title: 'Budget friendly', text: 'Prices are designed for student affordability and academic value.' },
];

export default function MarketplacePage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#FBFDFB', color: '#0E1F16', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
      <div style={{ maxWidth: 1150, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span style={{ display: 'inline-block', marginBottom: 8, padding: '5px 10px', borderRadius: 999, background: '#EAF3EC', color: '#1F7A4D', fontSize: 11, fontWeight: 700 }}>Professional learning catalog</span>
            <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', color: '#123626', fontSize: 34 }}>Marketplace</h1>
            <p style={{ color: '#456153', margin: '8px 0 0', maxWidth: 700, fontSize: 15 }}>
              Discover curated educational products designed to help students move faster in coursework, career preparation, and academic confidence.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            style={{ background: '#1F7A4D', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 10, fontWeight: 600 }}
          >
            Back to Dashboard
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: '#123626', color: 'white', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.75 }}>Marketplace overview</div>
            <h3 style={{ margin: '10px 0 8px', fontFamily: 'Fraunces, serif', fontSize: 24 }}>Academic tools that feel credible and useful</h3>
            <p style={{ margin: 0, color: '#DDECE4', lineHeight: 1.7 }}>
              CampusLink brings together focused digital learning resources so students can access support without hunting across disconnected platforms.
            </p>
          </div>

          <div style={{ background: 'white', border: '1px solid #D8E6DC', borderRadius: 16, padding: 20 }}>
            <h3 style={{ margin: 0, color: '#123626' }}>What you can expect</h3>
            <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: '#456153', lineHeight: 1.8 }}>
              {productHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          {categories.map((category) => (
            <div key={category.name} style={{ background: 'white', border: '1px solid #D8E6DC', borderRadius: 14, padding: 16 }}>
              <div style={{ color: '#123626', fontWeight: 700 }}>{category.name}</div>
              <div style={{ color: '#456153', fontSize: 13, marginTop: 4 }}>{category.count}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {marketItems.map((item) => (
            <div key={item.title} style={{ background: 'white', border: '1px solid #D8E6DC', borderRadius: 16, padding: 18, boxShadow: '0 8px 24px -16px rgba(18,54,38,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ background: '#EAF3EC', color: '#1F7A4D', padding: '5px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{item.tag}</span>
                <span style={{ fontWeight: 700, color: '#1F7A4D', fontSize: 16 }}>{item.price}</span>
              </div>
              <h3 style={{ margin: '14px 0 8px', color: '#123626' }}>{item.title}</h3>
              <p style={{ margin: 0, color: '#456153', fontSize: 14, lineHeight: 1.7 }}>{item.desc}</p>
              <button
                style={{ width: '100%', marginTop: 16, border: 'none', background: '#1F7A4D', color: '#fff', padding: '10px 14px', borderRadius: 10, fontWeight: 700 }}
                onClick={() => navigate('/')}
              >
                Purchase product
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 22 }}>
          {featuredBenefits.map((benefit) => (
            <div key={benefit.title} style={{ background: '#EAF3EC', border: '1px solid #D8E6DC', borderRadius: 16, padding: 18 }}>
              <div style={{ fontWeight: 700, color: '#123626', marginBottom: 6 }}>{benefit.title}</div>
              <div style={{ color: '#456153', fontSize: 14 }}>{benefit.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
