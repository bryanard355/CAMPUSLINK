import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSupabase, hasSupabaseConfig } from './src/lib/supabaseClient.js';

function normalizeRole(roleValue) {
  const role = String(roleValue || '').trim().toLowerCase();
  if (role === 'tutor' || role === 'mentor') return 'Mentor';
  if (role === 'student' || role === 'mentee') return 'Mentee';
  return roleValue || 'Mentee';
}

const styles = `
  :root {
    --bg:#FBFDFB;
    --surface:#FFFFFF;
    --surface-alt:#EAF3EC;
    --surface-alt-2:#DCEEE2;
    --ink:#0E1F16;
    --ink-soft:#456153;
    --green-deep:#123626;
    --green-mid:#1F7A4D;
    --green-mid-hover:#186B41;
    --green-bright:#3FC97A;
    --line:#D8E6DC;
    --shadow: 0 8px 24px -12px rgba(18,54,38,0.18);
  }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; }
  body {
    background:var(--bg);
    color:var(--ink);
    font-family:'Inter',sans-serif;
    -webkit-font-smoothing:antialiased;
    line-height:1.5;
  }
  h1,h2,h3,.display {
    font-family:'Fraunces',serif;
    font-weight:600;
    letter-spacing:-0.01em;
    color:var(--green-deep);
    margin:0;
  }
  .mono { font-family:'IBM Plex Mono', monospace; }
  a { color:inherit; }
  button { font-family:inherit; cursor:pointer; }
  ::selection { background:var(--green-bright); color:var(--green-deep); }
  :focus-visible { outline:2px solid var(--green-mid); outline-offset:2px; }

  .wrap { max-width:1180px; margin:0 auto; padding:0 28px; }
  header.site { position:sticky; top:0; z-index:40; background:rgba(251,253,251,0.9); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
  .navbar { display:flex; align-items:center; justify-content:space-between; height:72px; }
  .logo { display:flex; align-items:center; gap:10px; font-family:'Fraunces',serif; font-weight:700; font-size:20px; color:var(--green-deep); }
  .logo .mark { width:30px; height:30px; flex:none; color:var(--green-mid); }
  .navlinks { display:flex; gap:6px; }
  .navlinks button {
    background:none; border:none; padding:8px 14px; border-radius:999px; font-size:14.5px; font-weight:500; color:var(--ink-soft);
    transition:background .15s, color .15s;
  }
  .navlinks button:hover { background:var(--surface-alt); color:var(--green-deep); }
  .navlinks button.active { background:var(--green-deep); color:#fff; }
  .nav-right { display:flex; align-items:center; gap:12px; }
  .badge-edu { font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--green-mid); background:var(--surface-alt); border:1px solid var(--surface-alt-2); padding:5px 10px; border-radius:6px; letter-spacing:.02em; }
  .btn { border-radius:9px; padding:10px 18px; font-weight:600; font-size:14.5px; border:1px solid transparent; transition:transform .12s ease, box-shadow .12s ease, background .15s; display:inline-flex; align-items:center; gap:8px; }
  .btn:active { transform:translateY(1px); }
  .btn:disabled { opacity:.5; cursor:not-allowed; }
  .btn:disabled:active { transform:none; }
  .btn-primary { background:var(--green-mid); color:#fff; }
  .btn-primary:hover { background:var(--green-mid-hover); }
  .btn-ghost { background:transparent; color:var(--green-deep); border-color:var(--line); }
  .btn-ghost:hover { background:var(--surface-alt); }
  .btn-sm { padding:7px 12px; font-size:13px; border-radius:7px; }

  .hero { padding:64px 0 40px; }
  .hero-grid { display:grid; grid-template-columns:1.05fr 0.95fr; gap:56px; align-items:center; }
  .eyebrow { font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--green-mid); text-transform:uppercase; letter-spacing:.09em; margin-bottom:14px; display:block; }
  .hero h1 { font-size:44px; line-height:1.08; }
  .hero p.lead { color:var(--ink-soft); font-size:17px; max-width:46ch; margin:18px 0 28px; }
  .hero-ctas { display:flex; gap:12px; flex-wrap:wrap; }
  .constellation-box { background:var(--green-deep); border-radius:20px; padding:18px; position:relative; box-shadow:var(--shadow); aspect-ratio:1/0.82; }
  .constellation-box svg { width:100%; height:100%; }

  .stats { border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:var(--surface-alt); }
  .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); padding:28px 0; }
  .stat { text-align:center; border-right:1px solid var(--surface-alt-2); }
  .stat:last-child { border-right:none; }
  .stat .num { font-family:'IBM Plex Mono',monospace; font-size:30px; font-weight:500; color:var(--green-deep); }
  .stat .label { font-size:12.5px; color:var(--ink-soft); margin-top:4px; }

  .app-section { padding:56px 0 80px; }
  .app-head { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:22px; flex-wrap:wrap; gap:10px; }
  .app-head h2 { font-size:26px; }
  .tabbar { display:flex; gap:8px; border-bottom:1px solid var(--line); margin-bottom:26px; overflow-x:auto; }
  .tab { padding:11px 4px; margin-right:22px; background:none; border:none; font-weight:600; font-size:14.5px; color:var(--ink-soft); border-bottom:2px solid transparent; white-space:nowrap; }
  .tab.active { color:var(--green-deep); border-color:var(--green-mid); }
  .panel { display:none; animation:fade .25s ease; }
  .panel.active { display:block; }
  @keyframes fade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }

  .card { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:20px; }
  .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .grid-2 { display:grid; grid-template-columns:1.3fr 1fr; gap:16px; }

  .rep-tags { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
  .tag { font-size:11.5px; font-family:'IBM Plex Mono',monospace; padding:4px 9px; border-radius:999px; background:var(--surface-alt); color:var(--green-mid); border:1px solid var(--surface-alt-2); }
  .tag.gold { background:#FBF3DC; color:#8A6D1D; border-color:#F0E3B8; }
  .progress { height:8px; border-radius:99px; background:var(--surface-alt); overflow:hidden; margin-top:10px; }
  .progress > div { height:100%; background:var(--green-mid); border-radius:99px; }
  .mini-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--line); }
  .mini-row:last-child { border-bottom:none; }

  .list { display:flex; flex-direction:column; gap:12px; }
  .person-card { display:flex; justify-content:space-between; align-items:center; gap:16px; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:16px 18px; }
  .avatar { width:44px; height:44px; border-radius:50%; flex:none; background:var(--surface-alt); color:var(--green-deep); display:flex; align-items:center; justify-content:center; font-weight:700; font-family:'Fraunces',serif; }
  .pc-main { display:flex; gap:14px; align-items:center; min-width:0; }
  .pc-name { font-weight:600; font-size:15px; }
  .pc-sub { font-size:13px; color:var(--ink-soft); margin-top:2px; }

  .filter-row { display:flex; gap:10px; margin-bottom:18px; flex-wrap:wrap; }
  .filter-row input, .filter-row select { font-family:'Inter',sans-serif; padding:9px 12px; border-radius:8px; border:1px solid var(--line); background:var(--surface); font-size:13.5px; color:var(--ink); }
  .filter-row input:focus, .filter-row select:focus { outline:2px solid var(--green-mid); border-color:transparent; }

  .stars { color:#D8B238; font-size:13px; letter-spacing:1px; cursor:pointer; }
  .doc-icon { width:38px; height:38px; border-radius:9px; background:var(--surface-alt); flex:none; display:flex; align-items:center; justify-content:center; }

  .price-tag { font-family:'IBM Plex Mono',monospace; font-weight:500; color:var(--green-deep); font-size:16px; }

  .add-row { display:flex; justify-content:flex-end; margin-bottom:14px; }

  .arch { padding:56px 0; border-top:1px solid var(--line); }
  .arch-stack { display:flex; flex-direction:column; gap:2px; max-width:760px; margin:0 auto; }
  .arch-layer { background:var(--surface); border:1px solid var(--line); padding:18px 22px; display:flex; justify-content:space-between; align-items:center; gap:20px; }
  .arch-layer:first-child { border-radius:12px 12px 0 0; }
  .arch-layer:last-child { border-radius:0 0 12px 12px; }
  .arch-name { font-weight:600; color:var(--green-deep); font-size:15px; }
  .arch-desc { color:var(--ink-soft); font-size:13px; margin-top:3px; }
  .arch-tech { font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--green-mid); text-align:right; flex:none; }

  footer { border-top:1px solid var(--line); padding:34px 0; color:var(--ink-soft); font-size:13px; }
  .foot-row { display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; }

  #toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(20px); background:var(--green-deep); color:#fff; padding:12px 20px; border-radius:10px; font-size:14px; font-weight:500; opacity:0; pointer-events:none; transition:all .25s ease; box-shadow:0 10px 30px -8px rgba(0,0,0,0.35); z-index:100; display:flex; align-items:center; gap:8px; }
  #toast.show { opacity:1; transform:translateX(-50%) translateY(0); }

  .modal-bg { position:fixed; inset:0; background:rgba(14,31,22,0.45); display:none; align-items:center; justify-content:center; z-index:90; padding:20px; }
  .modal-bg.show { display:flex; }
  .modal { background:var(--surface); border-radius:16px; padding:26px; max-width:420px; width:100%; box-shadow:0 30px 60px -15px rgba(0,0,0,0.35); }
  .modal h3 { font-size:19px; margin-bottom:6px; }
  .modal p { color:var(--ink-soft); font-size:14px; margin:0 0 18px; }
  .modal label { display:block; font-size:12.5px; font-weight:600; color:var(--green-deep); margin:12px 0 6px; }
  .modal input, .modal textarea { width:100%; font-family:'Inter',sans-serif; padding:9px 12px; border-radius:8px; border:1px solid var(--line); background:var(--surface); font-size:13.5px; color:var(--ink); }
  .slot-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:20px; }
  .slot { border:1px solid var(--line); border-radius:8px; padding:9px 4px; text-align:center; font-size:12.5px; background:var(--surface-alt); color:var(--green-deep); font-weight:500; }
  .slot.selected { background:var(--green-mid); color:#fff; border-color:var(--green-mid); }
  .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:16px; }

  @media (max-width:880px) {
    .hero-grid, .grid-2, .grid-3 { grid-template-columns:1fr; }
    .navlinks { display:none; }
    .nav-greeting { display:none; }
    .hero h1 { font-size:32px; }
    .stats-grid { grid-template-columns:1fr; }
    .stat { border-right:none; border-bottom:1px solid var(--surface-alt-2); padding-bottom:16px; margin-bottom:16px; }
    .stat:last-child { border-bottom:none; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation:none !important; transition:none !important; }
  }
`;

const starString = (rating) => '★★★★★☆☆☆☆☆'.slice(5 - rating, 10 - rating);

function initialsOf(name) {
  return String(name || '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Matches CampusLinkApp's thread-id scheme exactly (sorted, underscore-
// joined pair of ids) so a swap-proposal message lands in the same chat
// thread the two of them would already be using, and counts toward the
// same unread badge on the message icon.
function makeThreadId(userId, contactId) {
  if (!userId || !contactId) return null;
  const a = String(userId);
  const b = String(contactId);
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export default function Dashboard() {
  const navigate = useNavigate();

  // The same per-tab session CampusLinkApp reads — if someone got here by
  // tapping the logo from inside the logged-in app, sessionStorage still has
  // it, so Sign up/Log in (and "sign up to book") don't make sense to show.
  const [loggedInUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('campuslink-user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  // Mentors get a different dashboard: they browse/reach out to mentees
  // (not "swap" with them) and are the only ones who can upload course
  // materials — mentees can only view/download what mentors have shared.
  const isMentor = loggedInUser?.role === 'Mentor';
  const statsRef = useRef(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState('');
  const [tutorSearch, setTutorSearch] = useState('');
  const [tutorFilter, setTutorFilter] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');

  // Real data, all loaded from Supabase — no more hardcoded fallbackData or
  // a fetch to a local API that isn't actually running anywhere.
  const [dbTutors, setDbTutors] = useState([]);
  const [dbMentees, setDbMentees] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [marketItems, setMarketItems] = useState([]);
  const [reputation, setReputation] = useState({ avgRating: 0, exchangeCount: 0 });
  const [siteStats, setSiteStats] = useState({ students: 0, materials: 0, hours: 0 });

  const [modalKind, setModalKind] = useState(null); // 'material' | 'market' | 'tutor'
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [activeSwap, setActiveSwap] = useState(null);
  const [formFields, setFormFields] = useState({});
  const [materialFile, setMaterialFile] = useState(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  // A mentor can manage a material if they're the one who uploaded it.
  // Older rows (uploaded before uploaded_by_id existed) fall back to a name
  // match so they aren't permanently locked out of their own uploads.
  function canManageMaterial(material) {
    if (!isMentor || !loggedInUser) return false;
    if (material.byId) return String(material.byId) === String(loggedInUser.id);
    return material.by && material.by === (loggedInUser.name || loggedInUser.email);
  }

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(window.__campuslinkToastTimer);
    window.__campuslinkToastTimer = window.setTimeout(() => setToast(''), 2600);
  };

  const jumpTab = (name) => {
    document.getElementById('app-section')?.scrollIntoView({ behavior: 'smooth' });
    setActiveTab(name);
  };

  // Memoized so this doesn't spin up a brand-new Supabase/GoTrueClient
  // instance on every render — multiple concurrent instances against the
  // same auth storage key is a known source of flaky session behavior.
  const client = useMemo(() => (hasSupabaseConfig ? getSupabase() : null), []);

  // One query for both directories — Tutor Marketplace lists mentors, Skill
  // Swap lists mentees — since they're really just the two halves of the
  // same profiles table filtered by role.
  async function loadProfiles() {
    if (!client) return;
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, email, university, course, role');
    if (error) {
      console.error('Failed to load profiles:', error.message);
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    setDbTutors(
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
    setDbMentees(
      rows
        .filter((profile) => normalizeRole(profile.role) === 'Mentee')
        .map((profile) => ({
          id: profile.id,
          name: profile.full_name || profile.email || 'Student',
          init: initialsOf(profile.full_name || profile.email),
          course: profile.course || 'General',
          university: profile.university || '',
        }))
    );
  }

  async function loadMaterials() {
    if (!client) return;
    const { data, error } = await client
      .from('course_materials')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('course_materials not available yet:', error.message);
      return;
    }
    setMaterials(
      (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        course: row.course,
        by: row.uploaded_by || 'Anonymous',
        byId: row.uploaded_by_id || '',
        downloads: row.downloads || 0,
        ratingSum: row.rating_sum || 0,
        ratingCount: row.rating_count || 0,
        fileUrl: row.file_url || '',
        fileName: row.file_name || '',
      }))
    );
  }

  async function loadMarketItems() {
    if (!client) return;
    const { data, error } = await client
      .from('marketplace_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('marketplace_items not available yet:', error.message);
      return;
    }
    setMarketItems(
      (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        desc: row.description,
        price: row.price,
        interest: row.interest_count || 0,
      }))
    );
  }

  async function loadAggregateStats() {
    if (!client) return;
    const [{ data: profileRows }, { data: materialRows }, { count: bookingCount }] = await Promise.all([
      client.from('profiles').select('id, role'),
      client.from('course_materials').select('rating_sum, rating_count'),
      client.from('bookings').select('id', { count: 'exact', head: true }),
    ]);

    // "students on CampusLink" means mentees specifically, not every
    // profile row — a mentor account shouldn't inflate that count.
    const studentCount = (profileRows || []).filter((p) => normalizeRole(p.role) === 'Mentee').length;

    setSiteStats({
      students: studentCount,
      materials: (materialRows || []).length,
      hours: bookingCount || 0,
    });

    const totals = (materialRows || []).reduce(
      (acc, row) => ({ sum: acc.sum + (row.rating_sum || 0), count: acc.count + (row.rating_count || 0) }),
      { sum: 0, count: 0 }
    );
    setReputation({
      avgRating: totals.count > 0 ? totals.sum / totals.count : 0,
      exchangeCount: totals.count,
    });
  }

  useEffect(() => {
    loadProfiles();
    loadMaterials();
    loadMarketItems();
    loadAggregateStats();
  }, []);

  const tutorCourseOptions = useMemo(
    () => Array.from(new Set(dbTutors.map((t) => t.course).filter(Boolean))),
    [dbTutors]
  );

  const filteredTutors = useMemo(() => {
    const query = tutorSearch.toLowerCase();
    return dbTutors.filter((t) => {
      const matchesFilter = !tutorFilter || t.course === tutorFilter;
      const matchesQuery = [t.name, t.topic, t.course].some((field) => field.toLowerCase().includes(query));
      return matchesFilter && matchesQuery;
    });
  }, [tutorFilter, tutorSearch, dbTutors]);

  const filteredMaterials = useMemo(() => {
    const query = materialSearch.toLowerCase();
    return materials.filter((m) => m.title.toLowerCase().includes(query) || m.course.toLowerCase().includes(query));
  }, [materialSearch, materials]);

  // A mentee shouldn't see themselves as a swap partner — only other
  // mentees. Anonymous visitors (no loggedInUser) see the full list.
  const otherMentees = useMemo(
    () => dbMentees.filter((m) => !loggedInUser || String(m.id) !== String(loggedInUser.id)),
    [dbMentees, loggedInUser]
  );

  useEffect(() => {
    const statsNode = statsRef.current;
    if (!statsNode) return undefined;

    const countUp = (id, target, suffix = '') => {
      const el = document.getElementById(id);
      if (!el) return;
      let cur = 0;
      const step = Math.max(1, Math.round(target / 40) || 1);
      const timer = window.setInterval(() => {
        cur += step;
        if (cur >= target) {
          cur = target;
          window.clearInterval(timer);
        }
        el.textContent = `${cur.toLocaleString()}${suffix}`;
      }, 25);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            countUp('statA', siteStats.students);
            countUp('statB', siteStats.materials);
            countUp('statC', siteStats.hours, '+');
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(statsNode);
    return () => observer.disconnect();
  }, [siteStats]);

  useEffect(() => {
    const svg = document.getElementById('constSvg');
    if (!svg) return;

    svg.innerHTML = '';
    const ns = 'http://www.w3.org/2000/svg';
    const centerNode = { x: 180, y: 40, label: 'You', role: 'center' };
    const peers = otherMentees.slice(0, 5);
    const nodes = [
      centerNode,
      ...peers.map((peer, i) => ({
        x: 40 + (i + 1) * (300 / (peers.length + 1)),
        y: 110 + (i % 2 === 0 ? 0 : 110),
        label: `${peer.name.split(' ')[0]} — ${peer.course}`,
        role: i % 2 === 0 ? 'a' : 'b',
      })),
    ];
    const links = peers.map((_, i) => [0, i + 1]);

    links.forEach(([a, b]) => {
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', nodes[a].x);
      line.setAttribute('y1', nodes[a].y);
      line.setAttribute('x2', nodes[b].x);
      line.setAttribute('y2', nodes[b].y);
      line.setAttribute('stroke', 'rgba(63,201,122,0.35)');
      line.setAttribute('stroke-width', '1.4');
      svg.appendChild(line);
    });

    nodes.forEach((n) => {
      const group = document.createElementNS(ns, 'g');
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', n.x);
      circle.setAttribute('cy', n.y);
      circle.setAttribute('r', n.role === 'center' ? 11 : 8);
      circle.setAttribute('fill', n.role === 'center' ? '#3FC97A' : n.role === 'a' ? '#EAF3EC' : '#123626');
      circle.setAttribute('stroke', '#3FC97A');
      circle.setAttribute('stroke-width', n.role === 'center' ? '0' : '1.4');
      group.appendChild(circle);

      const text = document.createElementNS(ns, 'text');
      text.setAttribute('x', n.x);
      text.setAttribute('y', n.y + (n.y < 130 ? -16 : 22));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '9.5');
      text.setAttribute('font-family', 'IBM Plex Mono, monospace');
      text.setAttribute('fill', '#EAF3EC');
      text.textContent = n.label;
      group.appendChild(text);
      svg.appendChild(group);
    });
  }, [otherMentees]);

  function openForm(kind) {
    setModalKind(kind);
    setFormFields({});
    setMaterialFile(null);
    setModalOpen(true);
  }

  function startEditMaterial(material) {
    if (!canManageMaterial(material)) return;
    setEditingMaterial(material);
    setModalKind('editMaterial');
    setFormFields({ title: material.title });
    setModalOpen(true);
  }

  async function saveMaterialEdit() {
    if (!editingMaterial) return;
    const title = (formFields.title || '').trim();
    if (!title) return;
    if (!client) {
      setModalOpen(false);
      showToast('Renamed (demo) — connect Supabase to save this for real');
      return;
    }
    const { error } = await client
      .from('course_materials')
      .update({ title })
      .eq('id', editingMaterial.id);
    if (error) {
      console.error('Failed to rename material:', error.message);
      showToast('Failed to rename material');
      return;
    }
    setModalOpen(false);
    setEditingMaterial(null);
    showToast('Material renamed');
    loadMaterials();
  }

  async function removeMaterial(material) {
    if (!canManageMaterial(material)) return;
    if (!window.confirm(`Remove "${material.title}"? This can't be undone.`)) return;

    if (!client) {
      showToast('Removed (demo) — connect Supabase to save this for real');
      return;
    }

    const { error } = await client.from('course_materials').delete().eq('id', material.id);
    if (error) {
      console.error('Failed to remove material:', error.message);
      showToast('Failed to remove material');
      return;
    }

    // Best-effort cleanup of the underlying file — the material row is
    // already gone either way, so a storage hiccup here shouldn't block
    // the user or need its own error UI.
    if (material.fileUrl) {
      const marker = '/object/public/course-materials/';
      const idx = material.fileUrl.indexOf(marker);
      if (idx !== -1) {
        const path = material.fileUrl.slice(idx + marker.length);
        client.storage.from('course-materials').remove([path]).catch(() => {});
      }
    }

    showToast('Material removed');
    loadMaterials();
    loadAggregateStats();
  }

  function openTutorModal(tutor) {
    setModalKind('tutor');
    setModalTitle(`Book ${tutor.name}`);
    setModalDescription(`${tutor.course} · ${tutor.topic}`);
    setSelectedSlot(null);
    setModalOpen(true);
  }

  async function proposeSwap(mentee) {
    const senderId = loggedInUser?.id || 'guest';
    const senderName = loggedInUser?.name || loggedInUser?.email || 'A CampusLink visitor';
    const toastVerb = isMentor ? 'Message sent to' : 'Swap request sent to';

    if (!client) {
      showToast(`${toastVerb} ${mentee.name}`);
      return;
    }

    // Mentors reaching out don't file a swap request — that's a mentee-to-
    // mentee thing — they just get a real chat message.
    if (!isMentor) {
      const { error } = await client.from('swap_requests').insert({
        id: String(Date.now()),
        mentee_id: mentee.id,
        requester_name: senderName,
      });
      if (error) console.error('Failed to record swap request:', error.message);
    }

    // Also drop a real chat message, so the proposal shows up on that
    // mentee's notification (message) icon the next time they're in the
    // app — same inbox as every other message, not a separate system.
    const threadId = makeThreadId(senderId, mentee.id);
    if (threadId) {
      const text = isMentor
        ? `👋 ${senderName} (your mentor) reached out to you on CampusLink!`
        : `🔁 ${senderName} proposed a skill swap with you on CampusLink!`;
      const { error: chatError } = await client.from('chat_messages').insert({
        id: String(Date.now() + 1),
        thread_id: threadId,
        sender_id: String(senderId),
        sender_name: senderName,
        recipient_id: String(mentee.id),
        recipient_name: mentee.name,
        text,
      });
      if (chatError) console.error('Failed to send swap notification:', chatError.message);
    }

    showToast(`${toastVerb} ${mentee.name}`);
  }

  async function rateMaterial(material) {
    if (!client) return;
    const { error } = await client
      .from('course_materials')
      .update({ rating_sum: material.ratingSum + 5, rating_count: material.ratingCount + 1 })
      .eq('id', material.id);
    if (error) {
      console.error('Failed to save rating:', error.message);
      return;
    }
    showToast('Rating saved — thanks!');
    loadMaterials();
    loadAggregateStats();
  }

  async function downloadMaterial(material) {
    if (!material.fileUrl) {
      showToast('No file was attached to this material');
      return;
    }
    // Trigger an actual browser download of the file the mentor uploaded,
    // rather than just showing a toast — this opens/saves the real document.
    const link = document.createElement('a');
    link.href = material.fileUrl;
    link.download = material.fileName || material.title;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();

    if (!client) {
      showToast(`Downloading ${material.title}`);
      return;
    }
    const { error } = await client
      .from('course_materials')
      .update({ downloads: material.downloads + 1 })
      .eq('id', material.id);
    if (error) console.error('Failed to record download:', error.message);
    showToast(`Downloading ${material.title}`);
    loadMaterials();
  }

  async function addToCart(item) {
    if (!client) {
      showToast(`Added '${item.title}' to cart`);
      return;
    }
    const { error } = await client
      .from('marketplace_items')
      .update({ interest_count: item.interest + 1 })
      .eq('id', item.id);
    if (error) console.error('Failed to record interest:', error.message);
    showToast(`Added '${item.title}' to cart`);
    loadMarketItems();
  }

  function updateField(key, value) {
    setFormFields((prev) => ({ ...prev, [key]: value }));
  }

  async function submitForm() {
    if (!client) {
      setModalOpen(false);
      showToast('Posted — thanks for contributing!');
      return;
    }

    if (modalKind === 'material') {
      if (!isMentor) return; // only mentors upload — mentees view/download only
      const { title, course } = formFields;
      if (!title || !course || !materialFile) return;

      setUploadingMaterial(true);
      const id = String(Date.now());
      const safeName = materialFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${id}-${safeName}`;
      const { error: uploadError } = await client.storage
        .from('course-materials')
        .upload(path, materialFile, { upsert: false });
      if (uploadError) {
        console.error('Failed to upload material file:', uploadError.message);
        showToast('Upload failed — try again');
        setUploadingMaterial(false);
        return;
      }
      const { data: publicUrlData } = client.storage.from('course-materials').getPublicUrl(path);

      const { error } = await client.from('course_materials').insert({
        id,
        title,
        course,
        uploaded_by: loggedInUser?.name || loggedInUser?.email || 'A mentor',
        uploaded_by_id: loggedInUser?.id || null,
        file_url: publicUrlData?.publicUrl || '',
        file_name: materialFile.name,
      });
      setUploadingMaterial(false);
      if (error) {
        console.error('Failed to post material:', error.message);
        return;
      }
      setMaterialFile(null);
      loadMaterials();
      loadAggregateStats();
    } else if (modalKind === 'market') {
      const { title, description, price } = formFields;
      if (!title || !price) return;
      const { error } = await client.from('marketplace_items').insert({
        id: String(Date.now()),
        title,
        description,
        price,
      });
      if (error) {
        console.error('Failed to post listing:', error.message);
        return;
      }
      loadMarketItems();
    }

    setModalOpen(false);
    showToast('Posted — thanks for contributing!');
  }

  function confirmBooking() {
    setModalOpen(false);
    showToast(`Session booked with ${modalTitle.replace('Book ', '')}`);
  }

  return (
    <>
      <style>{styles}</style>
      <header className="site">
        <div className="wrap navbar">
          <button
            className="logo"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <GraduationCap className="mark" size={28} />
            CampusLink
          </button>

          <nav className="navlinks">
            {[
              { key: 'overview', label: 'Dashboard' },
              { key: 'swap', label: 'Peer Exchange' },
              { key: 'tutors', label: 'Tutors' },
              { key: 'materials', label: 'Resources' },
              { key: 'market', label: 'Marketplace' },
            ].map((item) => (
              <button
                key={item.key}
                className={activeTab === item.key ? 'active' : ''}
                onClick={() => jumpTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="nav-right">
            {loggedInUser ? (
              <>
                <span className="mono nav-greeting" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  Hi, {loggedInUser.name || loggedInUser.email}
                </span>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/home')}>
                  Open CampusLink app
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/signup')}>
                  Sign up
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">CSM 366 Capstone · Campus Learning Exchange</span>
            <h1>Trade what you know<br />for what you need to learn.</h1>
            <p className="lead">
              CampusLink replaces scattered WhatsApp groups and screenshots with one verified place to swap skills,
              book tutors, share course materials, and find paid learning resources — all inside your university's
              own email domain.
            </p>
            <div className="hero-ctas">
              <button className="btn btn-primary" onClick={() => document.getElementById('app-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Explore the app ↓
              </button>
              <button className="btn btn-ghost" onClick={() => jumpTab('swap')}>
                See a live match
              </button>
            </div>
          </div>
          <div className="constellation-box">
            <svg id="constSvg" viewBox="0 0 360 300" />
          </div>
        </div>
      </section>

      <section className="stats" ref={statsRef}>
        <div className="wrap stats-grid">
          <div className="stat"><div className="num" id="statA">0</div><div className="label">students on CampusLink</div></div>
          <div className="stat"><div className="num" id="statB">0</div><div className="label">materials shared &amp; rated</div></div>
          <div className="stat"><div className="num" id="statC">0</div><div className="label">sessions booked</div></div>
        </div>
      </section>

      <section className="app-section" id="app-section">
        <div className="wrap">
          <div className="app-head">
            <h2>{loggedInUser ? `Welcome back, ${loggedInUser.name || loggedInUser.email}` : 'Your CampusLink dashboard'}</h2>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>live from the database</span>
          </div>

          <div className="tabbar">
            {['overview', 'swap', 'tutors', 'materials', 'market'].map((name) => (
              <button
                key={name}
                className={`tab ${activeTab === name ? 'active' : ''}`}
                onClick={() => setActiveTab(name)}
              >
                {name === 'overview' && 'Overview'}
                {name === 'swap' && (isMentor ? 'Mentees' : 'Skill Swap')}
                {name === 'tutors' && 'Tutor Marketplace'}
                {name === 'materials' && 'Course Materials'}
                {name === 'market' && 'Resource Marketplace'}
              </button>
            ))}
          </div>

          <div className={`panel ${activeTab === 'overview' ? 'active' : ''}`} id="panel-overview">
            <div className="grid-2">
              <div className="card">
                <h3 style={{ fontSize: '16px' }}>Recent activity</h3>
                {materials.length === 0 && marketItems.length === 0 ? (
                  <p className="pc-sub" style={{ marginTop: 10 }}>Nothing posted yet — be the first to share a material or list a resource.</p>
                ) : (
                  <>
                    {materials.slice(0, 2).map((m) => (
                      <div className="mini-row" key={m.id}><div><div style={{ fontWeight: 600 }}>{m.title}</div><div className="pc-sub">{m.course} · shared by {m.by}</div></div><span className="tag">material</span></div>
                    ))}
                    {marketItems.slice(0, 1).map((item) => (
                      <div className="mini-row" key={item.id}><div><div style={{ fontWeight: 600 }}>{item.title}</div><div className="pc-sub">{item.price}</div></div><span className="tag gold">listing</span></div>
                    ))}
                  </>
                )}
              </div>
              <div className="card">
                <h3 style={{ fontSize: '16px' }}>Platform reputation</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                  <span className="mono" style={{ fontSize: '28px', color: 'var(--green-deep)' }}>{reputation.avgRating.toFixed(1)}</span>
                  <span className="pc-sub">from {reputation.exchangeCount} rating{reputation.exchangeCount === 1 ? '' : 's'}</span>
                </div>
                <div className="progress"><div style={{ width: `${Math.min(100, (reputation.avgRating / 5) * 100)}%` }}></div></div>
                <div className="pc-sub" style={{ marginTop: 6 }}>Average material rating across all CampusLink contributors</div>
                <div className="rep-tags">
                  <span className="tag">{dbTutors.length} verified mentor{dbTutors.length === 1 ? '' : 's'}</span>
                  <span className="tag">{dbMentees.length} mentee{dbMentees.length === 1 ? '' : 's'}</span>
                  <span className="tag gold">{marketItems.length} marketplace listing{marketItems.length === 1 ? '' : 's'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`panel ${activeTab === 'swap' ? 'active' : ''}`} id="panel-swap">
            <p style={{ color: 'var(--ink-soft)', fontSize: '14px', marginTop: 0 }}>
              {isMentor
                ? 'Mentees on CampusLink, straight from the database — reach out to introduce yourself.'
                : 'Real mentees on CampusLink, straight from the database — propose a skill swap with someone in your course.'}
            </p>
            <div className="list">
              {otherMentees.length === 0 ? (
                <p className="pc-sub">
                  {loggedInUser && dbMentees.some((m) => String(m.id) === String(loggedInUser.id))
                    ? "No other mentees have joined yet — check back soon."
                    : 'No mentees have joined yet — check back soon.'}
                </p>
              ) : (
                otherMentees.map((mentee) => (
                  <div className="person-card" key={mentee.id}>
                    <div className="pc-main">
                      <div className="avatar">{mentee.init}</div>
                      <div>
                        <div className="pc-name">{mentee.name}</div>
                        <div className="pc-sub mono">{mentee.course}{mentee.university ? ` · ${mentee.university}` : ''}</div>
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => proposeSwap(mentee)}>
                      {isMentor ? 'Reach out' : 'Propose swap'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`panel ${activeTab === 'tutors' ? 'active' : ''}`} id="panel-tutors">
            <div className="filter-row">
              <input type="text" value={tutorSearch} onChange={(e) => setTutorSearch(e.target.value)} placeholder="Search by course or name…" style={{ flex: 1, minWidth: 180 }} />
              <select value={tutorFilter} onChange={(e) => setTutorFilter(e.target.value)}>
                <option value="">All courses</option>
                {tutorCourseOptions.map((course) => (
                  <option key={course}>{course}</option>
                ))}
              </select>
            </div>
            <div className="grid-3">
              {dbTutors.length === 0 ? (
                <p className="pc-sub">
                  No mentors have joined yet — check back soon
                  {loggedInUser ? '.' : (
                    <> , or <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }} style={{ color: 'var(--green-mid)', fontWeight: 600 }}>be the first to sign up</a>.</>
                  )}
                </p>
              ) : filteredTutors.length > 0 ? (
                filteredTutors.map((tutor) => (
                  <div className="card" key={tutor.id}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div className="avatar">{initialsOf(tutor.name)}</div>
                      <div>
                        <div className="pc-name">{tutor.name}</div>
                        <div className="pc-sub mono">{tutor.course} · {tutor.topic}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                      <span className="tag">Verified mentor</span>
                      {tutor.university && <span className="pc-sub mono">{tutor.university}</span>}
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                      onClick={() => navigate(loggedInUser ? '/home' : '/signup')}
                    >
                      {loggedInUser ? 'Open in app to book' : 'Sign up to book'}
                    </button>
                  </div>
                ))
              ) : (
                <p className="pc-sub">No tutors match that search.</p>
              )}
            </div>
          </div>

          <div className={`panel ${activeTab === 'materials' ? 'active' : ''}`} id="panel-materials">
            <div className="filter-row">
              <input type="text" value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} placeholder="Search materials…" style={{ flex: 1, minWidth: 180 }} />
              {isMentor && (
                <button className="btn btn-ghost btn-sm" onClick={() => openForm('material')}>＋ Upload material</button>
              )}
            </div>
            <div className="list">
              {materials.length === 0 ? (
                <p className="pc-sub">
                  {isMentor ? 'No materials shared yet — be the first.' : 'No materials shared yet — check back soon.'}
                </p>
              ) : filteredMaterials.length > 0 ? (
                filteredMaterials.map((material) => {
                  const avgRating = material.ratingCount > 0 ? Math.round(material.ratingSum / material.ratingCount) : 0;
                  return (
                    <div className="person-card" key={material.id}>
                      <div className="pc-main">
                        <div className="doc-icon">📄</div>
                        <div>
                          <div className="pc-name">{material.title}</div>
                          <div className="pc-sub mono">{material.course} · shared by {material.by} · {material.downloads} downloads</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span className="stars" onClick={() => rateMaterial(material)} title="Rate this material 5 stars">{starString(avgRating)}</span>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => downloadMaterial(material)}
                          disabled={!material.fileUrl}
                          title={material.fileUrl ? `Download ${material.fileName || material.title}` : 'No file attached'}
                        >
                          Download
                        </button>
                        {canManageMaterial(material) && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => startEditMaterial(material)}>Edit</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => removeMaterial(material)}>Remove</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="pc-sub">No materials match that search.</p>
              )}
            </div>
          </div>

          <div className={`panel ${activeTab === 'market' ? 'active' : ''}`} id="panel-market">
            <div className="add-row">
              <button className="btn btn-ghost btn-sm" onClick={() => openForm('market')}>＋ List a resource</button>
            </div>
            <div className="grid-3">
              {marketItems.length === 0 ? (
                <p className="pc-sub">No marketplace listings yet — be the first.</p>
              ) : (
                marketItems.map((item) => (
                  <div className="card" key={item.id}>
                    <h3 style={{ fontSize: '16px' }}>{item.title}</h3>
                    <p className="pc-sub" style={{ margin: '8px 0 16px' }}>{item.desc}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="price-tag">{item.price}</span>
                      <button className="btn btn-primary btn-sm" onClick={() => addToCart(item)}>Add to cart{item.interest > 0 ? ` (${item.interest})` : ''}</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="arch">
        <div className="wrap">
          <div className="app-head" style={{ marginBottom: 26 }}>
            <h2 style={{ fontSize: '22px' }}>Why CampusLink works</h2>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>trusted peer-to-peer learning</span>
          </div>
          <div className="arch-stack">
            <div className="arch-layer">
              <div><div className="arch-name">Verified access</div><div className="arch-desc">Students join through university-affiliated accounts for a trusted, campus-only network.</div></div>
              <div className="arch-tech">Institutional identity</div>
            </div>
            <div className="arch-layer">
              <div><div className="arch-name">Seamless collaboration</div><div className="arch-desc">Swap skills, schedule sessions, and share learning resources from one unified learning hub.</div></div>
              <div className="arch-tech">One platform</div>
            </div>
            <div className="arch-layer">
              <div><div className="arch-name">Growth through reputation</div><div className="arch-desc">Every exchange contributes to a transparent trust score that helps learners connect with reliable peers.</div></div>
              <div className="arch-tech">Reputation-driven</div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap foot-row">
          <div>CampusLink · CSM 366 Mini Project · Supervisor: Dr. Benjamin Tei-Partey</div>
          <div>Sackey · Sanogo · Owusu-Ansah Kwame</div>
        </div>
      </footer>

      <div
        className={`modal-bg ${modalOpen ? 'show' : ''}`}
        onClick={(e) => {
          if (e.target.className !== 'modal-bg show') return;
          setModalOpen(false);
          setEditingMaterial(null);
        }}
      >
        <div className="modal">
          {modalKind === 'tutor' && (
            <>
              <h3>{modalTitle}</h3>
              <p>{modalDescription}</p>
              <div className="slot-grid">
                {['Mon 3pm', 'Tue 5pm', 'Wed 4pm', 'Thu 2pm', 'Fri 6pm', 'Sat 11am'].map((slot) => (
                  <div
                    key={slot}
                    className={`slot ${selectedSlot === slot ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot}
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={confirmBooking}>Confirm booking</button>
              </div>
            </>
          )}

          {modalKind === 'material' && (
            <>
              <h3>Upload material</h3>
              <p>Share notes or a study guide for your mentees to view and download.</p>
              <label>Title</label>
              <input value={formFields.title || ''} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. CSM 261 Midterm Notes.pdf" />
              <label>Course</label>
              <input value={formFields.course || ''} onChange={(e) => updateField('course', e.target.value)} placeholder="e.g. CSM 261" />
              <label>Document</label>
              <input
                type="file"
                onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,image/*"
              />
              {materialFile && (
                <p className="pc-sub" style={{ marginTop: -6 }}>Selected: {materialFile.name}</p>
              )}
              <div className="modal-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={submitForm}
                  disabled={uploadingMaterial || !materialFile || !formFields.title || !formFields.course}
                >
                  {uploadingMaterial ? 'Uploading…' : 'Post material'}
                </button>
              </div>
            </>
          )}

          {modalKind === 'editMaterial' && (
            <>
              <h3>Rename material</h3>
              <p>Update the title mentees see for this material.</p>
              <label>Title</label>
              <input value={formFields.title || ''} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. CSM 261 Midterm Notes.pdf" />
              <div className="modal-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => { setModalOpen(false); setEditingMaterial(null); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveMaterialEdit} disabled={!formFields.title?.trim()}>Save</button>
              </div>
            </>
          )}

          {modalKind === 'market' && (
            <>
              <h3>List a resource</h3>
              <p>Sell a workshop, guide, or bundle to other students.</p>
              <label>Title</label>
              <input value={formFields.title || ''} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. LaTeX for Thesis Writing" />
              <label>Description</label>
              <input value={formFields.description || ''} onChange={(e) => updateField('description', e.target.value)} placeholder="Short description" />
              <label>Price</label>
              <input value={formFields.price || ''} onChange={(e) => updateField('price', e.target.value)} placeholder="e.g. GHS 20" />
              <div className="modal-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={submitForm}>Post listing</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div id="toast" className={toast ? 'show' : ''}>{toast}</div>
    </>
  );
}
