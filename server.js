import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dashboardData = {
  overview: {
    sessions: [
      { title: 'Tutoring — CSM 261 Calculus', meta: 'with Ama Boateng · Thu, 4:00 PM', status: 'confirmed' },
      { title: 'Skill swap — React Hooks', meta: 'with Fatimata Sanogo · Fri, 2:00 PM', status: 'pending' },
      { title: 'Workshop — LaTeX for Thesis Writing', meta: 'Self-paced · purchased', status: 'in progress' },
    ],
    reputation: {
      score: 4.8,
      totalExchanges: 32,
      progress: 82,
      tier: 'Trusted Contributor',
    },
  },
  swapPeers: [
    { name: 'Fatimata Sanogo', init: 'FS', offers: 'React & UI', wants: 'Python basics' },
    { name: 'Kojo Antwi', init: 'KA', offers: 'Circuit Theory', wants: 'Public speaking' },
    { name: 'Linda Mensah', init: 'LM', offers: 'Organic Chem', wants: 'Excel modeling' },
    { name: 'Bryan Owusu-Ansah', init: 'BO', offers: 'Python & ML', wants: 'Graphic design' },
  ],
  tutors: [
    { name: 'Ama Boateng', course: 'CSM 261', topic: 'Calculus II', rate: 4.9, price: 'GHS 25/hr' },
    { name: 'Kwabena Owusu', course: 'CSM 342', topic: 'Data Structures', rate: 4.7, price: 'GHS 30/hr' },
    { name: 'Linda Mensah', course: 'CHEM 210', topic: 'Organic Chemistry', rate: 4.8, price: 'GHS 25/hr' },
    { name: 'Kojo Antwi', course: 'EE 205', topic: 'Circuit Theory', rate: 4.6, price: 'GHS 28/hr' },
    { name: 'Jeremy Sackey', course: 'CSM 261', topic: 'Backend & APIs', rate: 4.9, price: 'GHS 30/hr' },
    { name: 'Fatimata Sanogo', course: 'CSM 342', topic: 'Frontend / React', rate: 4.8, price: 'GHS 28/hr' },
  ],
  materials: [
    { title: 'CSM 261 Midterm Notes.pdf', course: 'CSM 261', by: 'Ama Boateng', rating: 5, downloads: 214 },
    { title: 'Organic Chemistry Reaction Sheet.pdf', course: 'CHEM 210', by: 'Linda Mensah', rating: 4, downloads: 132 },
    { title: 'Data Structures Cheat Sheet.pdf', course: 'CSM 342', by: 'Kwabena Owusu', rating: 5, downloads: 301 },
    { title: 'Intro to Statistics Slides.pptx', course: 'STAT 151', by: 'Bryan Owusu-Ansah', rating: 4, downloads: 98 },
  ],
  marketItems: [
    { title: 'Full-Stack Web Dev Workshop', desc: '6-week guided build, live Q&A included.', price: 'GHS 50' },
    { title: 'LaTeX for Thesis Writing', desc: 'Self-paced course for final-year reports.', price: 'GHS 20' },
    { title: 'CSM 200-Level Past Questions Bundle', desc: '5 years of past questions, with solutions.', price: 'GHS 15' },
  ],
};

app.get('/api/dashboard', (req, res) => {
  res.json(dashboardData);
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'campuslink-backend' });
});

app.listen(PORT, () => {
  console.log(`CampusLink backend running on http://localhost:${PORT}`);
});
