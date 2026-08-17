import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  hasSupabaseConfig,
  getSupabase,
  tryAdoptRememberedSession,
  touchRememberedSession,
  forgetRememberedSession,
} from './lib/supabaseClient';
import { isPushSupported, hasActivePushSubscription, subscribeToPush, unsubscribeFromPush } from './lib/push';
import {
  GraduationCap,
  Bell,
  Search,
  Star,
  Clock,
  ChevronLeft,
  Home,
  Users,
  Calendar,
  User,
  Sparkles,
  BadgeCheck,
  MessageCircle,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

/* ---------------------------------------------------------------
   Design tokens
   Forest/kelly green anchors the brand (KNUST academic green),
   warm gold is the single accent used only for "matched" moments
   and the session-ticket motif — never decoration.
--------------------------------------------------------------- */
const C = {
  ink: '#161B18',
  muted: '#6B7368',
  faint: '#9AA096',
  bg: '#F5F4EF',
  card: '#FFFFFF',
  line: '#E7E5DC',
  greenDark: '#0F5132',
  green: '#1E7A46',
  greenSoft: '#E4F1E9',
  gold: '#EFAE1F',
  goldSoft: '#FBEACB',
  goldDark: '#8A5E06',
};

const FONT_DISPLAY = "'Sora', 'Inter', sans-serif";
const FONT_BODY = "'Inter', sans-serif";

const globalCss = `
  .cl-root { color-scheme: light; }
  .cl-root * { box-sizing: border-box; }
  .cl-root button { font-family: inherit; cursor: pointer; }
  .cl-root input { font-family: inherit; }
  .cl-scroll::-webkit-scrollbar { display: none; }
  .cl-scroll { scrollbar-width: none; }
  .cl-nav-btn { transition: background-color 0.15s ease, color 0.15s ease; }
  .cl-card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
  .cl-card:hover { box-shadow: 0 22px 46px -22px rgba(15,81,50,0.28); transform: translateY(-2px); }
  .cl-primary-btn { transition: background-color 0.15s ease, transform 0.15s ease; }
  .cl-primary-btn:hover { background-color: #0C3F27; transform: translateY(-1px); }
  .cl-secondary-btn { transition: background-color 0.15s ease, transform 0.15s ease; }
  .cl-secondary-btn:hover { background-color: ${C.greenSoft}; }
  .cl-slot-btn { transition: all 0.15s ease; }
  .cl-slot-btn:hover:not(:disabled) { border-color: ${C.gold}; }
  .cl-icon-btn { transition: background-color 0.15s ease; }
  .cl-icon-btn:hover { background-color: ${C.greenSoft}; }
  .cl-input:focus { outline: none; border-color: ${C.green}; box-shadow: 0 0 0 3px rgba(30,122,70,0.14); }
  .cl-chip-btn { transition: all 0.15s ease; }
  @keyframes cl-pop { from { opacity: 0; transform: scale(0.96) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .cl-pop { animation: cl-pop 0.28s ease both; }
  @media (max-width: 767px) { .cl-desktop-nav { display: none !important; } }
  @media (min-width: 768px) { .cl-mobile-nav { display: none !important; } }
  @media (max-width: 639px) { .cl-2col { grid-template-columns: 1fr !important; } }
  @media (max-width: 1023px) { .cl-3col { grid-template-columns: 1fr 1fr !important; } }
  @media (max-width: 767px) { .cl-3col { grid-template-columns: 1fr !important; } .cl-5col { grid-template-columns: 1fr !important; } .cl-split { grid-template-columns: 1fr !important; } }
  /* On phones the top bar only has room for the logo, notification bell,
     and avatar — the name/email column is dropped there and only shown
     once the user is actually on their Profile page. When it IS shown
     (on Profile), the group holding it must be allowed to shrink and the
     name/email need a capped width, or the fixed-size logo + bell + avatar
     push it past the viewport edge and cause horizontal scroll. */
  @media (max-width: 767px) {
    /* name-block becomes the one flexible item in the group — bell and
       avatar keep their fixed size, name/email shrink (and ellipsis) into
       whatever space is actually left instead of a guessed width. No
       overflow:hidden here — the notification dropdown is an absolutely
       positioned child of this same group and needs to render outside its
       box; the flex sizing above is what actually prevents overflow now. */
    .cl-name-block { flex: 1 1 auto !important; min-width: 0 !important; max-width: none !important; }
    .cl-name-hide-mobile { display: none !important; }
    .cl-nav-right { flex-shrink: 1 !important; min-width: 0 !important; }
  }
  /* Page bodies and cards use fairly generous desktop padding (24-32px) —
     tighten that on phones so more real content fits above the fold. */
  @media (max-width: 639px) {
    /* Extra bottom clearance so the fixed floating chat button (56px,
       bottom:24) never sits on top of the last card's content. */
    .cl-page { padding-left: 16px !important; padding-right: 16px !important; padding-top: 20px !important; padding-bottom: 100px !important; }
    .cl-card { padding: 16px !important; }
  }
`;

const DEPARTMENTS = ['All', 'Computer Science', 'Mathematics', 'Physics', 'Economics'];

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `CL-${s}`;
}

// Shared row -> app-shape mappers, used both by the initial Supabase fetch
// and by realtime handlers that merge a single changed row into state.
function mapRequestRow(row) {
  return {
    id: row.id,
    name: row.mentee_name,
    initials: row.mentee_initials,
    major: row.major,
    course: row.course,
    focus: row.focus,
    urgency: row.urgency,
    match: row.match,
    availability: Array.isArray(row.availability) ? row.availability : [],
    title: 'Mentee request',
    verified: row.verified ?? false,
    sessions: 0,
    price: 0,
    bio: row.bio,
    testimonial: { name: row.testimonial_name, text: row.testimonial_text },
    menteeId: row.mentee_id ?? null,
    tutorId: row.tutor_id ?? null,
    status: row.status || 'pending',
    code: row.code || null,
  };
}

function mapBookingRow(row) {
  return {
    id: row.id,
    initials: row.tutor_initials,
    tutorName: row.tutor_name,
    tutorId: row.tutor_id,
    menteeId: row.mentee_id,
    menteeName: row.mentee_name,
    course: row.course,
    day: row.day,
    dateIso: row.date ?? null,
    time: row.time,
    code: row.code,
    status: row.status || 'pending',
    checkedInAt: row.checked_in_at ?? null,
  };
}

// Bookings now carry a real calendar date (picked from a <input type="date">)
// rather than a recurring weekday name — this turns the raw "YYYY-MM-DD"
// value into the friendly "Tue, Jan 14" label used everywhere a booking is
// displayed. Parsed as a local date (not via `new Date(isoString)`, which
// treats a bare date as UTC midnight and can display a day early/late
// depending on the viewer's timezone).
function formatBookingDate(isoDateString) {
  if (!isoDateString) return '';
  const [y, m, d] = String(isoDateString).split('-').map(Number);
  if (!y || !m || !d) return isoDateString;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function todayBookingLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Free-text time only loosely matches this shape ("4:30 PM") — anything
// else (24-hour time, "around 4", etc.) just means no live/soon badge,
// which is a safe, non-breaking degradation rather than a crash.
function parseTimeLabel(timeLabel) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(timeLabel || '').trim());
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

// Returns 'live' | 'soon' | 'today' | null depending on how close the
// session's date/time is to right now. Only ever fires on the actual
// booked date — no more "every Monday forever" false positives.
function getSessionTiming(day, time) {
  const parsedTime = parseTimeLabel(time);
  if (!day || day !== todayBookingLabel() || !parsedTime) return null;

  const now = new Date();
  const sessionMinutes = parsedTime.hours * 60 + parsedTime.minutes;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const diff = sessionMinutes - nowMinutes;

  if (diff <= 0 && diff > -90) return 'live';
  if (diff > 0 && diff <= 60) return 'soon';
  if (diff > 60) return 'today';
  return null;
}

// The match badge used to just be a flat 90% on every mentor, for every
// mentee, regardless of course. This scores it off the actual course
// overlap between the two: an exact match reads as a strong match, one
// course name containing the other (e.g. a mentee in "Computer Science" and
// a mentor in "Computer Science - Software Track") still counts as related,
// and two unrelated fields (e.g. Optometry and Computer Science) fall to a
// genuinely low score rather than a merely mediocre one. Missing course info
// on either side can't be judged at all, so it lands on a neutral default
// instead of a high or low guess.
function computeCourseMatch(menteeCourse, mentorCourse) {
  const a = String(menteeCourse || '').trim().toLowerCase();
  const b = String(mentorCourse || '').trim().toLowerCase();
  if (!a || !b) return 75;
  if (a === b) return 98;
  if (a.includes(b) || b.includes(a)) return 85;
  return 43;
}

// Scales a course-match percentage (see computeCourseMatch, 43-98) into the
// star rating shown once a mentor has actually had a request — a strong
// course match reads as 5.0, an unrelated one drops all the way to 3.0,
// since this is a course-fit score, not a real quality-of-mentoring
// judgment.
function computeMentorRating(matchPct) {
  const clamped = Math.max(43, Math.min(98, matchPct));
  const rating = 3.0 + ((clamped - 43) / (98 - 43)) * (5.0 - 3.0);
  return Math.round(rating * 10) / 10;
}

// Reconstructs the exact moment a booking starts, using the raw ISO date
// stored alongside its display label (booking.day is just a formatted
// string like "Tue, Jan 14" with no year, so it can't be compared against
// "now" once that label stops matching today — a booking made a week ago
// still says "Tue, Jan 14" forever). Older bookings made before dateIso
// existed only have the label, so they fall back to trusting it as "today"
// — the one case where that's still reliable.
function getBookingStartDate(booking) {
  const parsedTime = parseTimeLabel(booking?.time);
  if (!parsedTime) return null;
  if (booking.dateIso) {
    const [y, m, d] = String(booking.dateIso).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, parsedTime.hours, parsedTime.minutes);
  }
  if (booking.day === todayBookingLabel()) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parsedTime.hours, parsedTime.minutes);
  }
  return null;
}

// Once a booking is inside its final 5 minutes — or already started — the
// mentee can no longer reschedule or cancel it; it's too close to the
// mentor's side of things to still be a casual change. A booking with no
// resolvable start time (e.g. a still-open request with no day/time set
// yet) has nothing to lock against, so it stays editable.
function isLockedForChanges(booking) {
  const start = getBookingStartDate(booking);
  if (!start) return false;
  return start.getTime() - Date.now() <= 5 * 60 * 1000;
}

// 'checked' | 'checkable' | 'not-yet' | 'overdue' | 'unscheduled'. The Check
// in button opens right at the session's start time and stays open for one
// hour; past that with no check-in, it's overdue — the caller is
// responsible for then flipping the booking's status to 'missed'.
function getCheckInState(booking) {
  if (booking?.checkedInAt) return 'checked';
  const start = getBookingStartDate(booking);
  if (!start) return 'unscheduled';
  const diffMinutes = (Date.now() - start.getTime()) / 60000;
  if (diffMinutes < 0) return 'not-yet';
  if (diffMinutes <= 60) return 'checkable';
  return 'overdue';
}

function SessionTimingBadge({ day, time }) {
  const timing = getSessionTiming(day, time);
  if (!timing) return null;
  const copy = {
    live: { text: '● Happening now', bg: '#FBEACB', fg: '#8A5E06' },
    soon: { text: 'Starting soon', bg: '#FBEACB', fg: '#8A5E06' },
    today: { text: 'Today', bg: '#E4F1E9', fg: '#0F5132' },
  }[timing];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        backgroundColor: copy.bg,
        color: copy.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {copy.text}
    </span>
  );
}

// Compact "Done" / "Overdue" indicator for a confirmed session's check-in
// outcome — same colors as SessionStatusPill's missed/declined state and the
// full-size check-in banner on the session ticket, just small enough to sit
// next to a booking's code pill in a summary list (e.g. the home page).
function CheckInStatusPill({ state }) {
  if (state === 'checked') {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 999,
          backgroundColor: C.greenSoft,
          color: C.greenDark,
          whiteSpace: 'nowrap',
        }}
      >
        ✓ Done
      </span>
    );
  }
  if (state === 'overdue') {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 999,
          backgroundColor: '#FBE9E7',
          color: '#B3261E',
          whiteSpace: 'nowrap',
        }}
      >
        Overdue
      </span>
    );
  }
  return null;
}

/* ---------------------------------------------------------------
   Shared bits
--------------------------------------------------------------- */
function MatchBadge({ pct, size = 'sm' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: size === 'lg' ? 12 : 11,
        fontWeight: 800,
        padding: size === 'lg' ? '5px 12px' : '3px 10px',
        borderRadius: 999,
        backgroundColor: C.gold,
        color: C.greenDark,
        whiteSpace: 'nowrap',
        letterSpacing: 0.1,
      }}
    >
      <Sparkles size={size === 'lg' ? 13 : 11} /> {pct}% match
    </span>
  );
}

function Avatar({ initials, size = 44 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontFamily: FONT_DISPLAY,
        fontSize: size * 0.36,
        backgroundColor: C.greenSoft,
        color: C.greenDark,
      }}
    >
      {initials}
    </div>
  );
}

function Pill({ children, tone = 'green' }) {
  const tones = {
    green: { bg: C.greenSoft, fg: C.greenDark },
    gold: { bg: C.goldSoft, fg: C.goldDark },
    line: { bg: 'transparent', fg: C.muted },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: 999,
        backgroundColor: t.bg,
        color: t.fg,
        border: tone === 'line' ? `1px solid ${C.line}` : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function Card({ children, style, className, ...rest }) {
  return (
    <div
      className={`cl-card ${className || ''}`}
      style={{
        backgroundColor: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 22,
        boxShadow: '0 16px 40px -26px rgba(15,81,50,0.22)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------
   Nav
--------------------------------------------------------------- */
function NavBar({ view, navigateView, user, sessionsOrigin, unreadCount = 0, unreadNotifications = [], onOpenNotification }) {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const items = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'tutors', label: user?.role === 'Mentor' ? 'Requests' : 'Find tutors', icon: Users },
    { key: 'sessions', label: 'Sessions', icon: Calendar },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backgroundColor: 'rgba(255,255,255,0.94)',
        borderBottom: `1px solid ${C.line}`,
        backdropFilter: 'blur(14px)',
      }}
    >
      <div
        style={{
          maxWidth: 1152,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          aria-label="Open CampusLink dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.greenDark,
            }}
          >
            <GraduationCap size={16} color="#fff" />
          </div>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, color: C.ink }}>
            CampusLink
          </span>
        </button>

        <nav className="cl-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {items.map(({ key, label, icon: Icon }) => {
            const profileDetailView = view === 'tutorProfile' || view === 'mentorRequestDetail';
            const active = view === key || (profileDetailView && key === (sessionsOrigin ? 'sessions' : 'tutors'));
            return (
              <button
                type="button"
                key={key}
                onClick={() => navigateView(key)}
                className="cl-nav-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 15px',
                  borderRadius: 999,
                  fontSize: 13.5,
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: active ? C.greenSoft : 'transparent',
                  color: active ? C.greenDark : C.muted,
                }}
              >
                <Icon size={15} /> {label}
              </button>
            );
          })}
        </nav>

        <div className="cl-nav-right" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, minWidth: 0 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              className="cl-icon-btn"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label="Notifications"
              style={{
                position: 'relative',
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${C.line}`,
                backgroundColor: 'transparent',
              }}
            >
              <Bell size={16} color={C.ink} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#ff4d4f',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 44,
                  right: 0,
                  width: 300,
                  maxHeight: 360,
                  overflowY: 'auto',
                  backgroundColor: '#fff',
                  border: `1px solid ${C.line}`,
                  borderRadius: 14,
                  boxShadow: '0 18px 40px -12px rgba(15,81,50,0.28)',
                  zIndex: 30,
                  padding: 8,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, padding: '6px 8px' }}>Notifications</div>
                {unreadNotifications.length === 0 ? (
                  <div style={{ padding: '16px 8px', fontSize: 12.5, color: C.muted, textAlign: 'center' }}>
                    You're all caught up.
                  </div>
                ) : (
                  unreadNotifications.map((n) => (
                    <button
                      key={n.threadId}
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        onOpenNotification?.(n);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{n.contactName}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: C.muted,
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.text}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div
            className={`cl-name-block${view === 'profile' ? '' : ' cl-name-hide-mobile'}`}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, minWidth: 0 }}
          >
            <span style={{ display: 'block', width: '100%', fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>
              {user?.name || 'CampusLink user'}
            </span>
            <span style={{ display: 'block', width: '100%', fontSize: 11, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>
              {user?.email || 'not signed in'}
            </span>
          </div>
          <Avatar initials={user?.name ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2) : 'CL'} size={34} />
        </div>
      </div>

      <nav
        className="cl-mobile-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          borderTop: `1px solid ${C.line}`,
        }}
      >
        {items.map(({ key, label, icon: Icon }) => {
          const profileDetailView = view === 'tutorProfile' || view === 'mentorRequestDetail';
          const active = view === key || (profileDetailView && key === (sessionsOrigin ? 'sessions' : 'tutors'));
          return (
            <button
              type="button"
              key={key}
              onClick={() => navigateView(key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '9px 12px',
                border: 'none',
                background: 'none',
              }}
            >
              <Icon size={18} color={active ? C.greenDark : C.faint} />
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? C.greenDark : C.faint }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

/* ---------------------------------------------------------------
   Home
--------------------------------------------------------------- */
function HomePage({ upcoming, mentors, onOpenTutor, navigateView, user }) {
  const topPick = mentors && mentors.length > 0 ? mentors[0] : null;
  // No fallback name needed — CampusLinkApp now redirects to /login before
  // ever rendering this page without a real logged-in user.
  const displayName = user?.name || user?.email || 'there';
  return (
    <div className="cl-page" style={{ maxWidth: 1152, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13.5, color: C.muted }}>Welcome back,</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, color: C.ink, margin: '2px 0 0' }}>
            {displayName}
          </h1>
        </div>
        <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} color={C.muted} />
          <input
            placeholder="Search tutors, courses..."
            className="cl-input"
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: 12,
              fontSize: 13.5,
              border: `1px solid ${C.line}`,
              backgroundColor: '#FAFAF6',
              color: C.ink,
            }}
          />
        </div>
      </div>

      <div className="cl-split" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {topPick ? (
          <button
            onClick={() => onOpenTutor(topPick)}
            className="cl-primary-btn"
            style={{
              textAlign: 'left',
              borderRadius: 26,
              padding: 26,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              border: 'none',
              background: `linear-gradient(135deg, ${C.greenDark}, ${C.green})`,
              boxShadow: '0 26px 56px -26px rgba(15,81,50,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: C.goldSoft }}>
                <Sparkles size={14} /> Smart tutor match
              </span>
              <MatchBadge pct={topPick.match} />
            </div>
            <div style={{ color: '#fff', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 19, lineHeight: 1.35, maxWidth: 420 }}>
              Based on your course load in {topPick.courses?.[0] || 'your course'} and {topPick.courses?.[1] || topPick.courses?.[0] || 'related topics'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar initials={topPick.initials} size={40} />
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 14.5 }}>{topPick.name}</div>
                <div style={{ fontSize: 12, color: '#CFEBDB' }}>{topPick.title}</div>
              </div>
            </div>
            <div
              style={{
                marginTop: 2,
                padding: '11px 22px',
                borderRadius: 999,
                textAlign: 'center',
                fontSize: 13.5,
                fontWeight: 700,
                width: 'fit-content',
                backgroundColor: C.gold,
                color: C.greenDark,
              }}
            >
              Connect now
            </div>
          </button>
        ) : (
          <Card style={{ padding: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: C.muted, fontSize: 13.5 }}>
            No mentors available yet. Check back once mentors have joined CampusLink.
          </Card>
        )}

        <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5, color: C.ink }}>Your stats</div>
          {[
            ['Sessions booked', upcoming.length],
            ['Verified mentors nearby', (mentors || []).filter((t) => t.verified).length],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, color: C.muted }}>{label}</span>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: C.ink }}>{val}</span>
            </div>
          ))}
        </Card>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, color: C.ink }}>Upcoming sessions</span>
          <button
            type="button"
            onClick={() => navigateView('sessions')}
            className="cl-secondary-btn"
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 999,
              border: `1px solid ${C.line}`,
              backgroundColor: 'transparent',
              color: C.greenDark,
            }}
          >
            View all
          </button>
        </div>
        {upcoming.length === 0 ? (
          <Card style={{ padding: 28, textAlign: 'center', fontSize: 13.5, color: C.muted }}>
            No sessions booked yet. Find a tutor to get started.
          </Card>
        ) : (
          <div className="cl-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {upcoming.slice(0, 4).map((b) => {
              // Mirrors the same status logic as the full session ticket
              // (SessionCard): a confirmed session that's been checked into
              // shows "Done", one whose 1-hour check-in window just lapsed
              // shows "Overdue", and one the background sweep already
              // flipped to missed (see markOverdueBookingsMissed below)
              // shows "Missed" via the normal status pill.
              const status = b.status || 'pending';
              const checkInState = status === 'accepted' ? getCheckInState(b) : 'unscheduled';
              return (
                <Card key={b.id} style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <Avatar initials={b.initials} size={38} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{b.tutorName}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{b.course} · {b.day}, {b.time}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    {checkInState === 'checked' || checkInState === 'overdue' ? (
                      <CheckInStatusPill state={checkInState} />
                    ) : (
                      <SessionStatusPill status={status} />
                    )}
                    <Pill>{b.code}</Pill>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Tutors list
--------------------------------------------------------------- */
function TutorCard({ t, onOpen, role }) {
  const isMentor = role === 'Mentor';
  const subtitle = t.title || t.major || t.course || '';
  return (
    <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.green }}>
          <Sparkles size={12} /> {isMentor ? 'Open request' : 'Suggested for you'}
        </span>
        <MatchBadge pct={t.match} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar initials={t.initials} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.name}
            </span>
            {t.verified && <BadgeCheck size={14} color={C.green} />}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitle}
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 700, color: C.ink, flexShrink: 0 }}>
          <Star size={13} fill={C.gold} color={C.gold} /> {t.rating ?? '—'}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {t.courses.map((c) => (
          <Pill key={c}>{c}</Pill>
        ))}
        {!t.verified && <Pill tone="line">Pending verification</Pill>}
      </div>

      <p style={{ fontSize: 12.5, fontStyle: 'italic', borderRadius: 12, padding: '10px 12px', margin: 0, backgroundColor: C.bg, color: C.muted, lineHeight: 1.5 }}>
        “{t.quote}”
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: C.muted }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} /> Open to book any day
        </span>
        <span>{t.sessions} sessions</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          onClick={() => onOpen(t)}
          className="cl-secondary-btn"
          style={{ flex: 1, padding: '9px 0', borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: `1px solid ${C.line}`, backgroundColor: 'transparent', color: C.greenDark }}
        >
          {isMentor ? 'View request' : 'View profile'}
        </button>
        <button
          onClick={() => onOpen(t)}
          className="cl-primary-btn"
          style={{ flex: 1, padding: '9px 0', borderRadius: 999, fontSize: 12.5, fontWeight: 700, border: 'none', backgroundColor: C.greenDark, color: '#fff' }}
        >
          {isMentor ? 'Respond' : 'Book'}
        </button>
      </div>
    </Card>
  );
}

function TutorsPage({ role, dept, setDept, query, setQuery, filtered, onOpen }) {
  const isMentor = role === 'Mentor';
  return (
    <div className="cl-page" style={{ maxWidth: 1152, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: C.ink, margin: 0 }}>
          {isMentor ? 'Student requests' : 'Find a tutor'}
        </h1>
        <div style={{ fontSize: 13.5, color: C.muted, marginTop: 2 }}>
          {isMentor
            ? 'Review mentee requests and respond to students seeking guided support.'
            : 'Every tutor is verified by university email.'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} color={C.muted} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course code or name"
            className="cl-input"
            style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 12, fontSize: 13.5, border: `1px solid ${C.line}`, backgroundColor: '#FAFAF6', color: C.ink }}
          />
        </div>
        <div className="cl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {DEPARTMENTS.map((d) => {
            const active = dept === d;
            return (
              <button
                key={d}
                onClick={() => setDept(d)}
                className="cl-chip-btn"
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: `1px solid ${active ? C.greenDark : C.line}`,
                  backgroundColor: active ? C.greenDark : C.card,
                  color: active ? '#fff' : C.ink,
                  flexShrink: 0,
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, color: C.ink }}>
          {filtered.length} tutor{filtered.length === 1 ? '' : 's'} available
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', fontSize: 13.5, color: C.muted, padding: '64px 0' }}>
          {isMentor
            ? 'No mentee requests match your search yet — try adjusting the priority or course.'
            : 'No tutors match that search yet — try a different course code.'}
        </div>
      ) : (
        <div className="cl-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {filtered.map((t) => (
            <TutorCard key={t.id} t={t} onOpen={onOpen} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Tutor profile + booking
--------------------------------------------------------------- */
function TicketCard({ booking, tutorTitle }) {
  return (
    <div
      className="cl-pop"
      style={{
        maxWidth: 420,
        borderRadius: 22,
        border: `1px solid ${C.line}`,
        boxShadow: '0 22px 50px -26px rgba(15,81,50,0.32)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8, backgroundColor: C.greenDark }}>
        <BadgeCheck size={18} color={C.gold} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: '#fff', fontSize: 14.5 }}>Session confirmed</span>
      </div>
      <div style={{ padding: 20, backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted }}>Tutor</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{booking.tutorName}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{tutorTitle}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.muted }}>Course</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{booking.course}</div>
          </div>
        </div>
        <div
          style={{
            borderTop: `1px dashed ${C.line}`,
            paddingTop: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: C.muted }}>When</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{booking.day}, {booking.time}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.muted }}>Ticket code</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, color: C.greenDark, letterSpacing: 0.5 }}>
              {booking.code}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function todayIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function TutorProfilePage({ tutor, user, onBack, onBooked, onRequestSent, onOpenChat }) {
  // A mentor with no course set on their profile has an empty `courses`
  // array — falling back here avoids literal "undefined" showing up in
  // mentee-facing request/booking text (and in the course column itself).
  const primaryCourse = tutor.courses && tutor.courses[0] ? tutor.courses[0] : 'general mentoring';
  // { date: 'YYYY-MM-DD', time: free text } — any day is bookable, and the
  // mentee types their own preferred time rather than picking from a fixed
  // list, since real per-mentor availability isn't tracked yet.
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const hasFullSlot = Boolean(selectedDate && selectedTime.trim());
  const slotDisplay = hasFullSlot ? `${formatBookingDate(selectedDate)} at ${selectedTime.trim()}` : '';
  const [confirmed, setConfirmed] = useState(null);
  const [requestSent, setRequestSent] = useState(false);

  return (
    <div className="cl-page" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 600, color: C.green, border: 'none', background: 'none', width: 'fit-content', padding: 0 }}
      >
        <ChevronLeft size={16} /> Back to tutors
      </button>

      {confirmed ? (
        <TicketCard booking={confirmed} tutorTitle={tutor.title} />
      ) : (
        <div className="cl-split" style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4 }}>
              <Avatar initials={tutor.initials} size={72} />
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, color: C.ink, marginTop: 6 }}>{tutor.name}</div>
              <div style={{ fontSize: 13, color: C.green }}>{tutor.title}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 700, color: C.ink, marginTop: 2 }}>
                {tutor.rating != null ? (
                  <>
                    <Star size={14} fill={C.gold} color={C.gold} /> {tutor.rating} ({tutor.sessions})
                  </>
                ) : (
                  <span style={{ color: C.muted, fontWeight: 600 }}>New mentor</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, width: '100%' }}>
                <button
                  onClick={() => {
                    const slotLabel = hasFullSlot ? slotDisplay : 'Flexible timing';
                    const sharedId = Date.now();
                    const sessionCode = makeCode();
                    const request = {
                      id: sharedId,
                      name: user?.name || 'Student',
                      initials: (user?.name || 'ST')
                        .split(' ')
                        .map((part) => part[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase(),
                      major: user?.course || 'Your course',
                      course: primaryCourse,
                      focus: `Looking for support with ${primaryCourse} and a session ${slotLabel.toLowerCase()}.`,
                      urgency: 'New request',
                      match: 92,
                      availability: [slotLabel],
                      title: 'Mentee request',
                      verified: false,
                      sessions: 0,
                      price: 0,
                      bio: `${user?.name || 'A student'} is requesting help from ${tutor.name} for ${primaryCourse}.`,
                      testimonial: { name: user?.name || 'Student', text: 'Looking for support from a mentor.' },
                      mentorName: tutor.name,
                      tutorId: tutor.id,
                      status: 'pending',
                      code: sessionCode,
                    };
                    setRequestSent(true);
                    onRequestSent(request);
                    if (hasFullSlot) {
                      const booking = {
                        id: sharedId,
                        initials: tutor.initials,
                        tutorName: tutor.name,
                        tutorId: tutor.id,
                        course: primaryCourse,
                        day: formatBookingDate(selectedDate),
                        time: selectedTime.trim(),
                        code: sessionCode,
                        status: 'pending',
                      };
                      setConfirmed(booking);
                      onBooked(booking);
                    }
                  }}
                  className="cl-primary-btn"
                  style={{ flex: 1, padding: '11px 0', borderRadius: 999, fontSize: 13.5, fontWeight: 700, border: 'none', backgroundColor: C.greenDark, color: '#fff' }}
                >
                  {requestSent ? 'Request sent' : 'Request session'}
                </button>
                <button
                  onClick={() => onOpenChat && onOpenChat(tutor)}
                  className="cl-icon-btn"
                  style={{ width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: `1px solid ${C.line}`, backgroundColor: 'transparent' }}
                  type="button"
                  aria-label={`Message ${tutor.name}`}
                >
                  <MessageCircle size={16} color={C.ink} />
                </button>
              </div>
            </Card>

            <Card style={{ padding: 20 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 6 }}>About</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: C.muted, margin: 0 }}>{tutor.bio}</p>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, color: C.ink, marginTop: 14, marginBottom: 8 }}>Courses</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tutor.courses.map((c) => (
                  <Pill key={c}>{c}</Pill>
                ))}
              </div>
            </Card>

            {tutor.testimonial && (
              <Card style={{ padding: 16 }}>
                <p style={{ fontSize: 13, fontStyle: 'italic', color: C.muted, margin: 0, lineHeight: 1.5 }}>“{tutor.testimonial.text}”</p>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginTop: 6 }}>— {tutor.testimonial.name}</div>
              </Card>
            )}
          </div>

          <Card style={{ padding: 20, height: 'fit-content' }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, color: C.ink, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Calendar size={15} /> Pick a date &amp; time
            </div>
            <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 16px' }}>
              Book any day that works for you — {tutor.name} will confirm once they accept your request.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>Date</span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: `1px solid ${C.line}`,
                    borderRadius: 10,
                    padding: '0 12px',
                  }}
                >
                  <Calendar size={15} color={C.muted} />
                  <input
                    type="date"
                    className="cl-input"
                    min={todayIsoDate()}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', padding: '10px 0', fontSize: 13.5, background: 'transparent', color: C.ink }}
                  />
                </div>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>Time</span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: `1px solid ${C.line}`,
                    borderRadius: 10,
                    padding: '0 12px',
                  }}
                >
                  <Clock size={15} color={C.muted} />
                  <input
                    type="text"
                    className="cl-input"
                    placeholder="e.g. 4:30 PM"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', padding: '10px 0', fontSize: 13.5, background: 'transparent', color: C.ink }}
                  />
                </div>
              </label>
            </div>

            <button
              disabled={!hasFullSlot}
              onClick={() => {
                const sharedId = Date.now();
                const sessionCode = makeCode();
                const bookingDay = formatBookingDate(selectedDate);
                const bookingTime = selectedTime.trim();
                const booking = {
                  id: sharedId,
                  initials: tutor.initials,
                  tutorName: tutor.name,
                  tutorId: tutor.id,
                  course: primaryCourse,
                  day: bookingDay,
                  dateIso: selectedDate,
                  time: bookingTime,
                  code: sessionCode,
                  status: 'pending',
                  checkedInAt: null,
                };
                setConfirmed(booking);
                onBooked(booking);

                // Also send a mentor request linked by the same id, so the
                // mentor has something to accept and this booking's status
                // can flip to "approved" once they do.
                setRequestSent(true);
                onRequestSent({
                  id: sharedId,
                  name: user?.name || 'Student',
                  initials: (user?.name || 'ST')
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase(),
                  major: user?.course || 'Your course',
                  course: primaryCourse,
                  focus: `Booked a session on ${bookingDay} at ${bookingTime} for ${primaryCourse}.`,
                  urgency: `${bookingDay} at ${bookingTime}`,
                  match: 92,
                  availability: [`${bookingDay} ${bookingTime}`],
                  title: 'Mentee request',
                  verified: false,
                  sessions: 0,
                  price: 0,
                  bio: `${user?.name || 'A student'} booked a session with ${tutor.name} on ${bookingDay} at ${bookingTime} for ${primaryCourse}.`,
                  testimonial: { name: user?.name || 'Student', text: 'Looking forward to my session.' },
                  mentorName: tutor.name,
                  tutorId: tutor.id,
                  status: 'pending',
                  code: sessionCode,
                });
              }}
              className={hasFullSlot ? 'cl-primary-btn' : ''}
              style={{
                marginTop: 20,
                width: '100%',
                padding: '13px 0',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 13.5,
                border: 'none',
                backgroundColor: hasFullSlot ? C.greenDark : C.line,
                color: hasFullSlot ? '#fff' : C.faint,
                cursor: hasFullSlot ? 'pointer' : 'not-allowed',
              }}
            >
              {hasFullSlot ? `Confirm ${slotDisplay}` : 'Pick a date and time to continue'}
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Sessions
--------------------------------------------------------------- */
function SessionStatusPill({ status }) {
  if (status === 'accepted') {
    return <Pill tone="green">✓ Approved</Pill>;
  }
  if (status === 'declined' || status === 'cancelled' || status === 'missed') {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 999,
          backgroundColor: '#FBE9E7',
          color: '#B3261E',
          whiteSpace: 'nowrap',
        }}
      >
        {status === 'cancelled' ? 'Cancelled' : status === 'missed' ? 'Missed' : 'Declined'}
      </span>
    );
  }
  return <Pill tone="gold">Pending approval</Pill>;
}

function SessionCard({ booking: b, isMentor, mentors, onReschedule, onCancel, onCheckIn, onOpen }) {
  const [rescheduling, setRescheduling] = useState(false);
  // Any day is reschedulable, and the new time is free text — same as the
  // initial booking flow, rather than picking from a fixed slot list.
  const [pendingDate, setPendingDate] = useState('');
  const [pendingTime, setPendingTime] = useState('');

  const displayName = isMentor ? (b.menteeName || 'Mentee') : b.tutorName;
  const initials = b.initials || displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const status = b.status || 'pending';
  const isCancelled = status === 'cancelled';
  const when = b.day && b.time ? `${b.day}, ${b.time}` : 'Flexible timing';
  // Only the mentee checks in, and only once the mentor has actually
  // accepted — a still-pending request has nothing confirmed to show up to.
  const checkInState = !isMentor && status === 'accepted' ? getCheckInState(b) : 'unscheduled';
  // Same 5-minutes-out cutoff regardless of whether the mentor has accepted
  // yet — once the clock's that close, changing plans stops being a
  // low-friction tap for either side.
  const locked = !isMentor && isLockedForChanges(b);

  const hasChosenNewSlot = Boolean(pendingDate && pendingTime.trim());
  const pendingDayLabel = pendingDate ? formatBookingDate(pendingDate) : '';

  // If the lock window closes while the reschedule form happens to be open,
  // don't leave it dangling — collapse it back down.
  useEffect(() => {
    if (locked && rescheduling) setRescheduling(false);
  }, [locked]);

  return (
    <div style={{ borderRadius: 20, border: `1px solid ${C.line}`, boxShadow: '0 16px 40px -26px rgba(15,81,50,0.22)', overflow: 'hidden' }}>
      <div
        onClick={() => onOpen && onOpen(b)}
        role={onOpen ? 'button' : undefined}
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: C.greenDark,
          cursor: onOpen ? 'pointer' : 'default',
        }}
      >
        <span style={{ color: '#fff', fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3 }}>SESSION TICKET</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 0.4 }}>{b.code || '—'}</span>
      </div>
      <div style={{ padding: 16, backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          onClick={() => onOpen && onOpen(b)}
          role={onOpen ? 'button' : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: onOpen ? 'pointer' : 'default' }}
        >
          <Avatar initials={initials} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{displayName}</div>
              <SessionStatusPill status={status} />
              {!isCancelled && <SessionTimingBadge day={b.day} time={b.time} />}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{b.course} · {when}</div>
          </div>
        </div>

        {checkInState === 'checkable' && (
          <button
            type="button"
            onClick={() => onCheckIn(b)}
            className="cl-primary-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 0',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: 'none',
              backgroundColor: C.greenDark,
              color: '#fff',
            }}
          >
            <CheckCircle2 size={14} /> Check in
          </button>
        )}
        {checkInState === 'checked' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 0',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              backgroundColor: C.greenSoft,
              color: C.greenDark,
            }}
          >
            <CheckCircle2 size={14} /> Checked in
          </div>
        )}
        {checkInState === 'overdue' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 0',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              backgroundColor: '#FBE9E7',
              color: '#B3261E',
            }}
          >
            <AlertCircle size={14} /> Overdue
          </div>
        )}

        {!isMentor && !isCancelled && (
          locked ? (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 999,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: C.muted,
                backgroundColor: '#F7F7F3',
              }}
            >
              Too close to start time to reschedule or cancel
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setRescheduling((prev) => !prev)}
                className="cl-secondary-btn"
                style={{ flex: 1, padding: '9px 0', borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: `1px solid ${C.line}`, backgroundColor: 'transparent', color: C.greenDark }}
              >
                {rescheduling ? 'Close' : 'Reschedule'}
              </button>
              <button
                type="button"
                onClick={() => onCancel(b)}
                className="cl-secondary-btn"
                style={{ flex: 1, padding: '9px 0', borderRadius: 999, fontSize: 12.5, fontWeight: 700, border: `1px solid ${C.line}`, backgroundColor: 'transparent', color: '#B3261E' }}
              >
                Cancel booking
              </button>
            </div>
          )
        )}

        {rescheduling && !locked && (
          <div style={{ padding: 12, borderRadius: 14, backgroundColor: '#F7F7F3', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>New date</span>
                <input
                  type="date"
                  className="cl-input"
                  min={todayIsoDate()}
                  value={pendingDate}
                  onChange={(e) => setPendingDate(e.target.value)}
                  style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: C.ink, background: '#fff' }}
                />
              </label>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>New time</span>
                <input
                  type="text"
                  className="cl-input"
                  placeholder="e.g. 4:30 PM"
                  value={pendingTime}
                  onChange={(e) => setPendingTime(e.target.value)}
                  style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: C.ink, background: '#fff' }}
                />
              </label>
            </div>
            <button
              type="button"
              disabled={!hasChosenNewSlot}
              onClick={() => {
                onReschedule(b, pendingDayLabel, pendingTime.trim(), pendingDate);
                setRescheduling(false);
              }}
              className={hasChosenNewSlot ? 'cl-primary-btn' : ''}
              style={{
                padding: '10px 0',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 12.5,
                border: 'none',
                backgroundColor: hasChosenNewSlot ? C.greenDark : C.line,
                color: hasChosenNewSlot ? '#fff' : C.faint,
                cursor: hasChosenNewSlot ? 'pointer' : 'not-allowed',
              }}
            >
              {hasChosenNewSlot ? `Save ${pendingDayLabel} at ${pendingTime.trim()}` : 'Pick a new date and time'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionsPage({ bookings, role, mentors, onReschedule, onCancel, onCheckIn, onOpen }) {
  const isMentor = role === 'Mentor';
  return (
    <div className="cl-page" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: C.ink, margin: 0 }}>
        {isMentor ? 'My mentoring sessions' : 'My sessions'}
      </h1>
      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', fontSize: 13.5, color: C.muted, padding: '64px 0' }}>
          {isMentor
            ? 'No mentee sessions scheduled yet. Visit Requests to confirm your first booking.'
            : 'No sessions booked yet. Head to Find tutors to book your first ticket.'}
        </div>
      ) : (
        <div className="cl-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {bookings.map((b) => (
            <SessionCard
              key={b.id}
              booking={b}
              isMentor={isMentor}
              mentors={mentors}
              onReschedule={onReschedule}
              onCancel={onCancel}
              onCheckIn={onCheckIn}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Profile
--------------------------------------------------------------- */
// Lets someone turn real push notifications (arrive even with CampusLink
// fully closed — see public/sw.js and src/lib/push.js) on or off for this
// specific browser/device. Deliberately its own self-contained card rather
// than baked into the profile form: this is a per-device browser
// permission, not an account field that saves anywhere else.
function PushNotificationsCard({ userId }) {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSupported(isPushSupported());
    hasActivePushSubscription().then(setSubscribed);
  }, []);

  async function handleToggle() {
    setBusy(true);
    setMessage('');
    const result = subscribed ? await unsubscribeFromPush() : await subscribeToPush(userId);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error || 'Something went wrong.');
      return;
    }
    setSubscribed(!subscribed);
  }

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13.5, color: C.ink }}>Push notifications</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {supported
              ? 'Get notified on this device for new messages and request updates, even when CampusLink is closed.'
              : "This browser doesn't support push notifications."}
          </div>
        </div>
        {supported && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={busy}
            className={subscribed ? 'cl-secondary-btn' : 'cl-primary-btn'}
            style={{
              flexShrink: 0,
              padding: '9px 16px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: subscribed ? `1px solid ${C.line}` : 'none',
              backgroundColor: subscribed ? 'transparent' : C.greenDark,
              color: subscribed ? C.greenDark : '#fff',
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Working…' : subscribed ? 'Turn off' : 'Enable'}
          </button>
        )}
      </div>
      {message && <div style={{ fontSize: 12, color: '#B3261E', marginTop: 10 }}>{message}</div>}
    </Card>
  );
}

function ProfilePage({ onLogout, user, editing, editProfile, onEdit, onCancel, onSave, onChange, status }) {
  const initials = user?.name ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'CL';

  return (
    <div className="cl-page" style={{ maxWidth: 768, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: C.ink, margin: 0 }}>My profile</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            onClick={onLogout}
            className="cl-primary-btn"
            style={{ borderRadius: 999, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, border: 'none', backgroundColor: C.greenDark, color: '#fff' }}
            type="button"
          >
            Log out
          </button>
          <button
            type="button"
            onClick={editing ? onCancel : onEdit}
            className="cl-secondary-btn"
            style={{ borderRadius: 999, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, border: '1px solid rgba(15,81,50,0.12)', backgroundColor: '#fff', color: C.greenDark }}
          >
            {editing ? 'Cancel' : 'Edit profile'}
          </button>
        </div>
      </div>

      {status?.type && status.type !== 'idle' && (
        <div
          role="status"
          style={{
            padding: 14,
            borderRadius: 18,
            background: status.type === 'success' ? '#EAF6EE' : '#FEEFEF',
            color: status.type === 'success' ? '#145a33' : '#8a1b1b',
            border: status.type === 'success' ? '1px solid #c7e6d3' : '1px solid #f2c5c5',
          }}
        >
          {status.message}
        </div>
      )}

      <div className="cl-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4 }}>
          <Avatar initials={initials} size={72} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, color: C.ink, marginTop: 6 }}>{user?.name || 'CampusLink User'}</div>
          <div style={{ fontSize: 13, color: C.faint }}>{user?.email || 'student@campuslink.test'}</div>
          <div style={{ fontSize: 13, color: C.faint, marginTop: 12 }}>Role: {user?.role || 'Mentee'}</div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {editing ? (
            <Card style={{ padding: 20 }}>
              <form onSubmit={onSave} style={{ display: 'grid', gap: 16 }}>
                <label style={{ display: 'grid', gap: 8, fontSize: 13, color: C.ink }}>
                  <span>Full name</span>
                  <input
                    value={editProfile.full_name}
                    onChange={(e) => onChange('full_name', e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: `1px solid ${C.line}`, fontSize: 14 }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 8, fontSize: 13, color: C.ink }}>
                  <span>Email</span>
                  <input
                    value={editProfile.email}
                    readOnly
                    disabled
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: `1px solid ${C.line}`, fontSize: 14, backgroundColor: '#f7f7f7', color: C.muted }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 8, fontSize: 13, color: C.ink }}>
                  <span>University</span>
                  <input
                    value={editProfile.university}
                    onChange={(e) => onChange('university', e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: `1px solid ${C.line}`, fontSize: 14 }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 8, fontSize: 13, color: C.ink }}>
                  <span>Course</span>
                  <input
                    value={editProfile.course}
                    onChange={(e) => onChange('course', e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: `1px solid ${C.line}`, fontSize: 14 }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 8, fontSize: 13, color: C.ink }}>
                  <span>Role</span>
                  <select
                    value={editProfile.role}
                    onChange={(e) => onChange('role', e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: `1px solid ${C.line}`, fontSize: 14, backgroundColor: '#fff', color: C.ink }}
                  >
                    <option value="Mentee">Mentee</option>
                    <option value="Mentor">Mentor</option>
                  </select>
                </label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
                  <button type="submit" className="cl-primary-btn" style={{ borderRadius: 999, padding: '12px 18px', border: 'none' }}>
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="cl-secondary-btn"
                    style={{ borderRadius: 999, padding: '12px 18px', border: '1px solid rgba(15,81,50,0.12)', backgroundColor: '#fff' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Card>
          ) : (
            <>
              <Card style={{ padding: 16 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13.5, color: C.ink, marginBottom: 8 }}>Academic info</div>
                {[
                  ['University', user?.university || 'Not set yet'],
                  ['Course', user?.course || 'Not set yet'],
                  ['Role', user?.role || 'Mentee'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: label !== 'Role' ? `1px solid ${C.line}` : 'none' }}>
                    <span style={{ color: C.muted }}>{label}</span>
                    <span style={{ color: C.ink, fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </Card>

              <Card style={{ padding: 16 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13.5, color: C.ink, marginBottom: 8 }}>Primary course</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <Pill tone="green">{user?.course || 'Not set yet'}</Pill>
                </div>
              </Card>
            </>
          )}
          <PushNotificationsCard userId={user?.id} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   App shell
--------------------------------------------------------------- */
export default function CampusLinkApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState('home');
  const [activeTutor, setActiveTutor] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  // True when tutorProfile/mentorRequestDetail was opened by tapping a
  // session card, so the "Back" button and nav highlight return to Sessions
  // instead of Find tutors/Requests.
  const [sessionsOrigin, setSessionsOrigin] = useState(false);
  const [dept, setDept] = useState('All');
  const [query, setQuery] = useState('');
  const [bookings, setBookings] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('campuslink-bookings') || '[]');
    } catch {
      return [];
    }
  });
  const [requests, setRequests] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('campuslink-requests') || '[]');
    } catch {
      return [];
    }
  });
  const [mentorsBase, setMentorsBase] = useState(null);
  const [profilesTableMissing, setProfilesTableMissing] = useState(false);
  const [requestsTableMissing, setRequestsTableMissing] = useState(false);
  const [bookingsTableMissing, setBookingsTableMissing] = useState(false);
  const [chatMessagesTableMissing, setChatMessagesTableMissing] = useState(false);
  const [user, setUser] = useState(null);
  // While true, we haven't yet determined whether there's a real logged-in
  // user (sessionStorage read is instant, but confirming/restoring a
  // Supabase session is async) — used to avoid ever rendering the app with
  // a placeholder "logged in as" state before redirecting to /login.
  const [checkingSession, setCheckingSession] = useState(true);
  const navigateView = (nextView) => {
    setView(nextView);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const [editing, setEditing] = useState(false);
  const [editProfile, setEditProfile] = useState({ full_name: '', email: '', university: '', course: '', role: 'Mentee' });
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [showChat, setShowChat] = useState(false);
  const [activeChatContact, setActiveChatContact] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  // True once the initial chat_messages fetch has completed. Guards the
  // read-state cache write below from firing on the empty pre-fetch state.
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [chatThreads, setChatThreads] = useState(() => {
    if (typeof window === 'undefined') return {};
    // When Supabase is configured, chat_messages is the source of truth and
    // the fetch effect below only ever merges rows in — it never clears out
    // threads that don't belong to the current user. Seeding from a shared,
    // un-scoped localStorage key here would let another account's threads
    // (from a different tab in this same browser) leak into this one and
    // never get cleaned up. Start empty and let the real fetch populate it.
    if (hasSupabaseConfig) return {};
    try {
      return JSON.parse(localStorage.getItem('campuslink-chat-threads') || '{}');
    } catch {
      return {};
    }
  });

  const unreadCount = useMemo(() => {
    if (!user?.id) return 0;
    return Object.values(chatThreads).reduce((count, thread) => {
      const lastSeen = thread.lastSeenBy?.[user.id];
      return (thread.messages || []).reduce((threadCount, message) => {
        if (String(message.senderId) === String(user.id)) return threadCount;
        if (!lastSeen) return threadCount + 1;
        return Number(message.id) > Number(lastSeen) ? threadCount + 1 : threadCount;
      }, 0) + count;
    }, 0);
  }, [chatThreads, user]);

  // One preview per thread with an unread message — feeds the bell icon's
  // notification dropdown (swap proposals land here too, since those are
  // just chat_messages rows under the hood).
  const unreadNotifications = useMemo(() => {
    if (!user?.id) return [];
    return Object.values(chatThreads)
      .map((thread) => {
        const lastSeen = thread.lastSeenBy?.[user.id];
        const unreadMessages = (thread.messages || []).filter((message) => {
          if (String(message.senderId) === String(user.id)) return false;
          return !lastSeen || Number(message.id) > Number(lastSeen);
        });
        if (unreadMessages.length === 0) return null;
        const latest = unreadMessages[unreadMessages.length - 1];
        const contactId = thread.participants?.find((id) => String(id) !== String(user.id));
        return {
          threadId: thread.threadId,
          contactId,
          contactName: (contactId && thread.names?.[contactId]) || latest.senderName || 'Someone',
          text: latest.text,
          time: latest.time,
          count: unreadMessages.length,
          latestId: Number(latest.id) || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.latestId - a.latestId);
  }, [chatThreads, user]);

  function isMissingProfilesTableError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes("could not find the table 'public.profiles'") || message.includes('table "public.profiles" does not exist');
  }

  function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function makeThreadId(userId, contactId) {
    if (!userId || !contactId) return null;
    const a = String(userId);
    const b = String(contactId);
    return a < b ? `${a}_${b}` : `${b}_${a}`;
  }

  // "Read" status (lastSeenBy) only ever lives in local React state — the
  // chat_messages table has no read-receipt column — so it has to be cached
  // per-user (not under the shared/global chat-threads key, which Supabase
  // mode intentionally ignores on load to avoid cross-account leakage) or it
  // resets to unread for everyone on every page reload.
  function chatReadStorageKey(userId) {
    return `campuslink-chat-read-${userId}`;
  }

  function loadChatReadState(userId) {
    if (typeof window === 'undefined' || !userId) return {};
    try {
      return JSON.parse(localStorage.getItem(chatReadStorageKey(userId)) || '{}');
    } catch {
      return {};
    }
  }

  // Merges one chat_messages row into the chatThreads shape. Used both for
  // the initial bulk fetch and for realtime INSERTs, so a new message is
  // appended directly instead of re-querying the whole table.
  function mergeMessageRow(prevThreads, row) {
    const threadId = row.thread_id || makeThreadId(row.sender_id, row.recipient_id);
    if (!threadId) return prevThreads;
    const existing = prevThreads[threadId] || {
      threadId,
      participants: [row.sender_id, row.recipient_id],
      names: {},
      messages: [],
      lastSeenBy: prevThreads[threadId]?.lastSeenBy || {},
    };
    const message = {
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      text: row.text,
      time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const alreadyHas = existing.messages.some((m) => String(m.id) === String(message.id));
    return {
      ...prevThreads,
      [threadId]: {
        ...existing,
        participants: [row.sender_id, row.recipient_id],
        names: {
          ...existing.names,
          [row.sender_id]: row.sender_name || existing.names?.[row.sender_id],
          [row.recipient_id]: row.recipient_name || existing.names?.[row.recipient_id],
        },
        messages: alreadyHas
          ? existing.messages
          : [...existing.messages, message].sort((a, b) => Number(a.id) - Number(b.id)),
      },
    };
  }

  function sendChatMessage() {
    if (!activeChatContact || !user?.id) return;
    const trimmed = chatMessage.trim();
    if (!trimmed) return;
    const threadId = makeThreadId(user.id, activeChatContact.id);
    if (!threadId) return;

    const messageId = Date.now();
    const nextMessage = {
      id: messageId,
      senderId: user.id,
      senderName: user.name || 'You',
      text: trimmed,
      time: formatTime(),
    };

    // Optimistic local update so the sender sees it immediately.
    setChatThreads((currentThreads) => {
      const existing = currentThreads[threadId] || {
        threadId,
        participants: [user.id, activeChatContact.id],
        names: { [user.id]: user.name || 'You', [activeChatContact.id]: activeChatContact.name },
        messages: [],
        lastSeenBy: {},
      };

      return {
        ...currentThreads,
        [threadId]: {
          ...existing,
          participants: [user.id, activeChatContact.id],
          names: { ...existing.names, [user.id]: user.name || 'You', [activeChatContact.id]: activeChatContact.name },
          messages: [...(existing.messages || []), nextMessage],
          lastSeenBy: { ...existing.lastSeenBy, [user.id]: nextMessage.id },
        },
      };
    });

    setChatMessage('');

    if (!hasSupabaseConfig || chatMessagesTableMissing) return;
    const client = getSupabase();
    if (!client) return;

    client
      .from('chat_messages')
      .insert({
        id: String(messageId),
        thread_id: threadId,
        sender_id: String(user.id),
        sender_name: user.name || 'You',
        recipient_id: String(activeChatContact.id),
        recipient_name: activeChatContact.name,
        text: trimmed,
      })
      .then(({ error }) => {
        if (!error) return;
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('chat_messages') || msg.includes('does not exist') || msg.includes('could not find')) {
          setChatMessagesTableMissing(true);
        }
        console.error('Failed to save chat message to Supabase:', error.message);
      });
  }

  function markThreadRead(threadId) {
    if (!threadId || !user?.id) return;
    setChatThreads((currentThreads) => {
      const thread = currentThreads[threadId];
      if (!thread?.messages?.length) return currentThreads;
      const latest = thread.messages[thread.messages.length - 1];
      if (String(thread.lastSeenBy?.[user.id]) === String(latest.id)) return currentThreads;
      return {
        ...currentThreads,
        [threadId]: {
          ...thread,
          lastSeenBy: { ...thread.lastSeenBy, [user.id]: latest.id },
        },
      };
    });
  }

  // Marks every thread as read for the current user — used when the chat
  // drawer is opened from the floating icon (not a specific contact), so the
  // unread badge clears as soon as it's opened rather than only once each
  // thread is individually opened.
  function markAllThreadsRead() {
    if (!user?.id) return;
    setChatThreads((currentThreads) => {
      let changed = false;
      const next = {};
      for (const [threadId, thread] of Object.entries(currentThreads)) {
        const latest = thread.messages?.[thread.messages.length - 1];
        if (latest && String(thread.lastSeenBy?.[user.id]) !== String(latest.id)) {
          changed = true;
          next[threadId] = { ...thread, lastSeenBy: { ...thread.lastSeenBy, [user.id]: latest.id } };
        } else {
          next[threadId] = thread;
        }
      }
      return changed ? next : currentThreads;
    });
  }

  function openChatContact(contact) {
    if (!contact?.id || !contact?.name) return;
    setActiveChatContact({ id: contact.id, name: contact.name });
    setShowChat(true);
    const threadId = makeThreadId(user?.id, contact.id);
    if (threadId) {
      markThreadRead(threadId);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('campuslink-chat-threads', JSON.stringify(chatThreads));
  }, [chatThreads]);

  // Cache just this user's read state (per thread, scoped by user id — not
  // the shared key above) so a reload doesn't wipe it back to "unread".
  // Gated on messagesLoaded when Supabase is configured: without this, this
  // effect fires the instant user.id becomes available — before the fetch
  // below has loaded anything — and writes an *empty* read-state, wiping
  // out the very cache the fetch is about to try to restore from.
  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return;
    if (hasSupabaseConfig && !messagesLoaded) return;
    const readState = {};
    for (const [threadId, thread] of Object.entries(chatThreads)) {
      const seen = thread.lastSeenBy?.[user.id];
      if (seen != null) readState[threadId] = seen;
    }
    localStorage.setItem(chatReadStorageKey(user.id), JSON.stringify(readState));
  }, [chatThreads, user?.id, messagesLoaded]);

  // Chat messages are real database rows once Supabase is configured — the
  // localStorage copy above is only a same-browser fallback/cache. Without
  // this, a message sent from one device never reaches the other person's.
  useEffect(() => {
    if (!hasSupabaseConfig || !user?.id) return;
    const client = getSupabase();
    if (!client) return;

    async function fetchMessages() {
      const { data, error } = await client
        .from('chat_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('chat_messages') || msg.includes('does not exist') || msg.includes('could not find')) {
          setChatMessagesTableMissing(true);
          console.warn('chat_messages table not found; chat only works on this device for now.');
        } else {
          console.error('Failed to load chat messages:', error.message);
        }
        setMessagesLoaded(true);
        return;
      }

      setChatMessagesTableMissing(false);
      const rows = Array.isArray(data) ? data : [];
      // The fetch rebuilds threads from scratch on every mount, which would
      // otherwise reset lastSeenBy to {} and make every thread look unread
      // again after a reload — restore this user's cached read state on top.
      const readState = loadChatReadState(user.id);
      setChatThreads((prev) => {
        const merged = rows.reduce((acc, row) => mergeMessageRow(acc, row), prev);
        if (Object.keys(readState).length === 0) return merged;
        const next = { ...merged };
        for (const [threadId, lastSeenId] of Object.entries(readState)) {
          if (!next[threadId]) continue;
          next[threadId] = {
            ...next[threadId],
            lastSeenBy: { ...next[threadId].lastSeenBy, [user.id]: lastSeenId },
          };
        }
        return next;
      });
      setMessagesLoaded(true);
    }

    fetchMessages();

    // Live updates merge the new message directly instead of re-querying —
    // avoids racing our own optimistic insert with a stale re-fetch.
    const channel = client
      .channel(`chat-messages-realtime-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const row = payload.new;
        if (String(row.sender_id) !== String(user.id) && String(row.recipient_id) !== String(user.id)) return;
        setChatThreads((prev) => mergeMessageRow(prev, row));
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('campuslink-requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // This cross-tab sync is only for the no-Supabase fallback. With
    // Supabase configured, `campuslink-requests` is a shared key written by
    // whoever is currently logged in on ANY tab in this browser — a mentor
    // tab refreshing would blast its own tutor-scoped data into a mentee
    // tab's state via this listener, an easy way for one account's view to
    // clobber another's. Real cross-user sync is handled by the Supabase
    // realtime subscription above instead, which is scoped per logged-in user.
    if (hasSupabaseConfig) return;
    function handleRequestsStorage(event) {
      if (event.key !== 'campuslink-requests') return;
      try {
        setRequests(JSON.parse(event.newValue || '[]'));
      } catch {
        setRequests([]);
      }
    }
    function handleRequestsEvent(event) {
      const next = event?.detail;
      if (Array.isArray(next)) {
        setRequests(next);
      }
    }
    window.addEventListener('storage', handleRequestsStorage);
    window.addEventListener('campuslink-requests-updated', handleRequestsEvent);
    return () => {
      window.removeEventListener('storage', handleRequestsStorage);
      window.removeEventListener('campuslink-requests-updated', handleRequestsEvent);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('campuslink-bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Same reasoning as the requests listener above: only meaningful as a
    // no-Supabase fallback. With Supabase configured this key is shared
    // across every logged-in account in this browser, so blindly applying
    // whatever another tab last wrote here — e.g. the mentor's own
    // tutor-scoped bookings — would overwrite a mentee tab's correct,
    // mentee-scoped list. That's exactly what made a cancelled booking
    // reappear after refreshing a different account's tab.
    if (hasSupabaseConfig) return;
    function handleBookingsStorage(event) {
      if (event.key !== 'campuslink-bookings') return;
      try {
        setBookings(JSON.parse(event.newValue || '[]'));
      } catch {
        setBookings([]);
      }
    }
    function handleBookingsEvent(event) {
      const next = event?.detail;
      if (Array.isArray(next)) {
        setBookings(next);
      }
    }
    window.addEventListener('storage', handleBookingsStorage);
    window.addEventListener('campuslink-bookings-updated', handleBookingsEvent);
    return () => {
      window.removeEventListener('storage', handleBookingsStorage);
      window.removeEventListener('campuslink-bookings-updated', handleBookingsEvent);
    };
  }, []);

  // Mentor requests are real database rows once Supabase is configured — the
  // localStorage copy above is only a same-browser fallback/cache.
  useEffect(() => {
    if (!hasSupabaseConfig || user?.role !== 'Mentor') return;
    const client = getSupabase();
    if (!client) return;

    async function fetchRequests() {
      const { data, error } = await client
        .from('mentee_requests')
        .select('*')
        // Scoped to this mentor's own requests — this used to fetch every
        // mentee's request platform-wide (bio, testimonial, personal focus
        // text and all), regardless of who it was addressed to.
        .eq('tutor_id', String(user.id))
        .order('created_at', { ascending: false });

      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('mentee_requests') || msg.includes('does not exist') || msg.includes('could not find')) {
          setRequestsTableMissing(true);
          console.warn('mentee_requests table not found; showing locally cached requests only.');
        } else {
          console.error('Failed to load mentee requests:', error.message);
        }
        return;
      }

      setRequestsTableMissing(false);
      const rows = Array.isArray(data) ? data : [];
      setRequests(rows.map(mapRequestRow));
    }

    fetchRequests();

    // Live updates merge the changed row directly instead of re-querying the
    // whole table — a blanket re-fetch triggered by our own write can race
    // the write itself (PostgREST may briefly still see the pre-update row),
    // which would silently revert an optimistic local change like a cancel.
    const isRelevantRequest = (row) => String(row.tutor_id) === String(user.id);

    const channel = client
      .channel(`mentee-requests-realtime-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mentee_requests' }, (payload) => {
        const row = payload.new;
        if (!isRelevantRequest(row)) return;
        setRequests((prev) => {
          if (prev.some((r) => String(r.id) === String(row.id))) return prev;
          return [mapRequestRow(row), ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mentee_requests' }, (payload) => {
        const row = payload.new;
        if (!isRelevantRequest(row)) return;
        setRequests((prev) => prev.map((r) => (String(r.id) === String(row.id) ? mapRequestRow(row) : r)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mentee_requests' }, (payload) => {
        const row = payload.old;
        setRequests((prev) => prev.filter((r) => String(r.id) !== String(row.id)));
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  // Privacy-safe signal for "has this mentor ever received a request from
  // anyone" — used only to decide whether Find Tutors shows a real rating or
  // "New mentor". Deliberately fetches just tutor_id (no bio/personal text),
  // unlike the mentor-scoped fetch above which needs full detail but only
  // for that mentor's own requests. Runs for every logged-in user (mainly
  // useful for mentees, who are the only ones who browse Find Tutors).
  const [mentorsWithHistory, setMentorsWithHistory] = useState(() => new Set());
  useEffect(() => {
    if (!hasSupabaseConfig || !user?.id) return;
    const client = getSupabase();
    if (!client) return;

    client
      .from('mentee_requests')
      .select('tutor_id')
      .not('tutor_id', 'is', null)
      .then(({ data, error }) => {
        if (error) {
          console.warn('Could not load mentor request history:', error.message);
          return;
        }
        setMentorsWithHistory(new Set((data || []).map((row) => String(row.tutor_id))));
      });
  }, [user?.id]);

  // Bookings are real database rows too: mentees see their own bookings,
  // mentors see the sessions booked with them.
  useEffect(() => {
    if (!hasSupabaseConfig || !user?.id) return;
    const client = getSupabase();
    if (!client) return;

    async function fetchBookings() {
      const column = user.role === 'Mentor' ? 'tutor_id' : 'mentee_id';
      const { data, error } = await client
        .from('bookings')
        .select('*')
        .eq(column, String(user.id))
        .order('created_at', { ascending: false });

      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('bookings') || msg.includes('does not exist') || msg.includes('could not find')) {
          setBookingsTableMissing(true);
          console.warn('bookings table not found; showing locally cached bookings only.');
        } else {
          console.error('Failed to load bookings:', error.message);
        }
        return;
      }

      setBookingsTableMissing(false);
      const rows = Array.isArray(data) ? data : [];
      setBookings(rows.map(mapBookingRow));
    }

    fetchBookings();

    // Live updates merge the changed row directly instead of re-querying the
    // whole table — a blanket re-fetch triggered by our own write can race
    // the write itself (PostgREST may briefly still see the pre-update row),
    // which would silently revert an optimistic local change like a cancel.
    const isRelevantBooking = (row) =>
      String(row.mentee_id) === String(user.id) || String(row.tutor_id) === String(user.id);

    const channel = client
      .channel(`bookings-realtime-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        const row = payload.new;
        if (!isRelevantBooking(row)) return;
        setBookings((prev) => {
          if (prev.some((b) => String(b.id) === String(row.id))) return prev;
          return [mapBookingRow(row), ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
        const row = payload.new;
        if (!isRelevantBooking(row)) return;
        setBookings((prev) => prev.map((b) => (String(b.id) === String(row.id) ? mapBookingRow(row) : b)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'bookings' }, (payload) => {
        const row = payload.old;
        setBookings((prev) => prev.filter((b) => String(b.id) !== String(row.id)));
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    // Same reasoning as the requests/bookings listeners: only a meaningful
    // fallback without Supabase. With it configured, this would let one
    // account's chat threads overwrite another's via a shared browser key.
    if (hasSupabaseConfig) return;
    function handleStorageEvent(event) {
      if (event.key !== 'campuslink-chat-threads') return;
      try {
        const updated = JSON.parse(event.newValue || '{}');
        setChatThreads(updated);
      } catch {
        // ignore malformed storage value
      }
    }

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

  function normalizeRole(roleValue) {
    const role = String(roleValue || '').trim();
    if (!role) return 'Mentee';
    if (role.toLowerCase() === 'student' || role.toLowerCase() === 'mentee') return 'Mentee';
    if (role.toLowerCase() === 'tutor' || role.toLowerCase() === 'mentor') return 'Mentor';
    return role;
  }

  async function loadProfileData(userId, userEmail, userMetadata = {}) {
    const client = getSupabase();
    if (!client) {
      return {
      id: userId,
        email: userEmail || 'student@campuslink.test',
        role: normalizeRole(userMetadata?.role || 'Mentee'),
        university: userMetadata?.university || '',
        course: userMetadata?.course || '',
      };
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('full_name, email, university, course, role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      if (isMissingProfilesTableError(profileError)) {
        console.warn('Supabase profiles table missing. Falling back to auth user metadata.');
      } else {
        console.warn('Unable to load profile data:', profileError);
      }
      return {
        id: userId,
        name: userMetadata?.full_name || userEmail?.split('@')[0] || 'CampusLink User',
        email: userMetadata?.email || userEmail || 'student@campuslink.test',
        role: userMetadata?.role || 'Mentee',
        university: userMetadata?.university || '',
        course: userMetadata?.course || '',
      };
    }

    return {
      id: userId,
      name: profile?.full_name || userMetadata?.full_name || userEmail?.split('@')[0] || 'CampusLink User',
      email: profile?.email || userMetadata?.email || userEmail || 'student@campuslink.test',
      role: normalizeRole(profile?.role || userMetadata?.role || 'Mentee'),
      university: profile?.university || userMetadata?.university || '',
      course: profile?.course || userMetadata?.course || '',
    };
  }

  async function saveProfileChanges(event) {
    event.preventDefault();
    setStatus({ type: 'idle', message: '' });

    if (!hasSupabaseConfig) {
      setStatus({ type: 'error', message: 'Unable to save profile without Supabase configuration.' });
      return;
    }

    const client = getSupabase();
    if (!client) {
      setStatus({ type: 'error', message: 'Unable to initialize Supabase.' });
      return;
    }

    const { data, error: sessionError } = await client.auth.getSession();
    const session = data?.session;
    const userId = session?.user?.id;
    if (sessionError || !userId) {
      setStatus({ type: 'error', message: 'Unable to save profile because you are not signed in.' });
      return;
    }

    const updated = {
      id: userId,
      full_name: editProfile.full_name.trim(),
      email: editProfile.email,
      university: editProfile.university.trim(),
      course: editProfile.course.trim(),
      role: editProfile.role || 'Mentee',
    };

    if (!updated.full_name) {
      setStatus({ type: 'error', message: 'Please enter your full name.' });
      return;
    }

    const { error: updateError } = await client.from('profiles').upsert(updated, { onConflict: 'id' });
    if (updateError) {
      const message = String(updateError.message || '').toLowerCase();
      if (message.includes("could not find the table 'public.profiles'") || message.includes('table "public.profiles" does not exist')) {
        const { error: authMetaError } = await client.auth.updateUser({
          data: {
            full_name: updated.full_name,
            university: updated.university,
            course: updated.course,
            role: updated.role,
          },
        });
        if (authMetaError) {
          setStatus({ type: 'error', message: authMetaError.message || 'Unable to update profile metadata.' });
          return;
        }
      } else {
        setStatus({ type: 'error', message: updateError.message || 'Unable to update profile.' });
        return;
      }
    }

    const storedUser = {
      id: user?.id,
      name: updated.full_name,
      email: updated.email,
      university: updated.university,
      course: updated.course,
      role: updated.role,
    };
    setUser(storedUser);
    sessionStorage.setItem('campuslink-user', JSON.stringify(storedUser));
    setStatus({ type: 'success', message: 'Profile saved successfully.' });
    setEditing(false);
  }

  function beginEditingProfile() {
    setEditProfile({
      full_name: user?.name || '',
      email: user?.email || '',
      university: user?.university || '',
      course: user?.course || '',
      role: user?.role || 'Mentee',
    });
    setStatus({ type: 'idle', message: '' });
    setEditing(true);
  }

  function cancelEditingProfile() {
    setEditing(false);
    setStatus({ type: 'idle', message: '' });
  }

  function updateEditField(field, value) {
    setEditProfile((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    let cancelled = false;
    const raw = sessionStorage.getItem('campuslink-user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
        setCheckingSession(false);
        touchRememberedSession();
        return;
      } catch (error) {
        setUser(null);
        // fall through — try to recover a real session below instead of
        // just giving up on a corrupted cache entry
      }
    }

    // No usable cached user — this is what a genuinely fresh browsing
    // context looks like (a new tab, or the installed app reopened after
    // being closed), since that cache lives in sessionStorage too. Before
    // giving up, see whether this device has a remembered login from within
    // the last 5 days and, if so, point this fresh context at the same
    // storage key so the getSession() check below finds it. Rather than
    // ever rendering the app as if someone were logged in (the old behavior
    // fell back to a placeholder "Alex" account), if that comes up empty
    // too, send the visitor to /login instead.
    tryAdoptRememberedSession();
    if (!hasSupabaseConfig) {
      navigate('/login');
      return;
    }

    const client = getSupabase();
    if (!client) {
      navigate('/login');
      return;
    }

    async function syncUserFromProfile() {
      const { data, error } = await client.auth.getSession();
      const session = data?.session;
      if (error || !session?.user) {
        if (!cancelled) navigate('/login');
        return;
      }

      const userEmail = session.user.email;
      const userId = session.user.id;
      const userMetadata = session.user.user_metadata || {};
      const profileUser = await loadProfileData(userId, userEmail, userMetadata);
      if (!profileUser) {
        if (!cancelled) navigate('/login');
        return;
      }

      sessionStorage.setItem('campuslink-user', JSON.stringify(profileUser));
      if (!cancelled) {
        setUser(profileUser);
        setCheckingSession(false);
        touchRememberedSession();
      }
    }

    syncUserFromProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keeps the device-level "remembered login" (see supabaseClient.js) from
  // expiring out from under someone who's actually still using the app —
  // touched on a steady interval for a long-lived open tab, and again
  // whenever the tab/app comes back into view after being backgrounded,
  // which is the far more common case for a phone or installed app.
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(touchRememberedSession, 15 * 60 * 1000);
    function handleVisibility() {
      if (document.visibilityState === 'visible') touchRememberedSession();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setMentorsBase([]);
      return;
    }

    const client = getSupabase();
    if (!client) {
      setMentorsBase([]);
      return;
    }

    async function loadMentors() {
      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, email, university, course, role');

      if (error) {
        const missingTable = isMissingProfilesTableError(error);
        if (missingTable) {
          console.warn('Supabase profiles table missing; no mentors to show.');
          setProfilesTableMissing(true);
          setMentorsBase([]);
          return;
        }

        console.error('Failed to load mentors:', error.message);
        setMentorsBase([]);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      const mentorsFromProfiles = rows
        .map((profile) => ({
          ...profile,
          role: normalizeRole(profile.role),
        }))
        .filter((profile) => profile.role === 'Mentor');

      // Rating, testimonial, and bio are intentionally left out here — every
      // mentor used to get the same fabricated "4.8 rating" and canned quote
      // the moment they signed up, before ever actually mentoring anyone.
      // The `mentors` memo below fills those in only once a mentee has
      // actually sent this specific mentor a request, so a new account
      // starts out honestly blank instead of pre-dressed as experienced.
      setMentorsBase(
        mentorsFromProfiles.map((profile) => ({
          id: profile.id,
          name: profile.full_name || profile.email || 'Mentor',
          initials: profile.full_name
            ? profile.full_name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            : 'MT',
          dept: profile.university || 'All',
          title: profile.course ? `${profile.course} mentor` : 'Campus mentor',
          courses: profile.course ? [profile.course] : [],
          sessions: 0,
          verified: true,
          quote: `Mentor from ${profile.university || 'your campus'}`,
        }))
      );
    }

    loadMentors();
  }, []);

  // A mentor's rating/testimonial/bio only populate once someone has
  // actually requested them. Reads `mentorsWithHistory` (a lightweight,
  // privacy-safe set of tutor_ids that have ever received a request) rather
  // than `requests` — `requests` only ever holds a mentor's own requests or
  // a mentee's local cache, never a mentee's view of *other* people's
  // requests, so it could never tell a mentee anything true about a
  // mentor's actual track record.
  const mentors = useMemo(() => {
    if (mentorsBase === null) return null;
    return mentorsBase.map((mentor) => {
      const hasReceivedRequest = mentorsWithHistory.has(String(mentor.id));
      const matchPct = computeCourseMatch(user?.course, mentor.courses[0]);
      return {
        ...mentor,
        match: matchPct,
        rating: hasReceivedRequest ? computeMentorRating(matchPct) : null,
        bio: hasReceivedRequest
          ? (mentor.courses[0]
              ? `Experienced mentor available for ${mentor.courses[0]} support.`
              : `Experienced campus mentor ready to help with your coursework.`)
          : (mentor.courses[0]
              ? `New mentor on CampusLink, ready to help with ${mentor.courses[0]}.`
              : `New mentor on CampusLink, ready to help with your coursework.`),
        testimonial: hasReceivedRequest
          ? { name: 'Student', text: 'Great mentor matched through CampusLink.' }
          : null,
      };
    });
  }, [mentorsBase, mentorsWithHistory, user]);

  const mentorChatMenteeNames = useMemo(() => {
    if (user?.role !== 'Mentor') return [];
    return Object.values(chatThreads)
      .filter((thread) => thread.participants?.includes(user.id))
      .map((thread) => {
        const contactId = thread.participants?.find((id) => String(id) !== String(user.id));
        return thread.names?.[contactId] || null;
      })
      .filter(Boolean);
  }, [user, chatThreads]);

  // The mentor's Sessions page is "every mentee I've accepted" — not just the
  // ones who happened to pick a specific time slot. Accepted requests without
  // a linked booking (plain "Request session", no slot chosen) still need to
  // show up, just without a day/time/ticket code.
  const mentorSessions = useMemo(() => {
    if (user?.role !== 'Mentor') return [];
    return requests
      .filter((r) => (r.status || 'pending') === 'accepted' && String(r.tutorId ?? '') === String(user.id))
      .map((r) => {
        const linkedBooking = bookings.find((b) => String(b.id) === String(r.id));
        return {
          id: r.id,
          initials: r.initials,
          menteeName: r.name,
          course: r.course,
          day: linkedBooking?.day || null,
          time: linkedBooking?.time || null,
          code: linkedBooking?.code || r.code || null,
          status: 'accepted',
        };
      });
  }, [user, requests, bookings]);

  // Once a mentor accepts a request it moves to Sessions — it shouldn't keep
  // cluttering the Requests page. Also scoped to requests actually addressed
  // to this mentor (by tutorId) — the Requests page used to show every
  // mentee's request to every mentor regardless of who they'd asked for.
  const pendingRequests = useMemo(() => {
    if (user?.role !== 'Mentor') return [];
    return requests.filter(
      (r) => (r.status || 'pending') === 'pending' && String(r.tutorId ?? '') === String(user.id)
    );
  }, [requests, user]);

  // A cancelled booking shouldn't keep showing up for the mentee — once
  // cancelled it's done, not something to still act on.
  const activeBookings = useMemo(
    () => bookings.filter((b) => (b.status || 'pending') !== 'cancelled'),
    [bookings]
  );

  const filtered = useMemo(() => {
    const source = user?.role === 'Mentor' ? pendingRequests : mentors || [];

    return source.filter((item) => {
      const q = query.trim().toLowerCase();
      const itemDept = item.dept || item.major || '';
      const itemCourse = item.course || item.courses?.[0] || '';
      const itemText = [item.name, itemCourse, item.major, item.focus, item.bio, item.urgency].filter(Boolean).join(' ').toLowerCase();
      const matchesDept = dept === 'All' || itemDept === dept || item.major === dept || itemCourse.includes(dept);
      const matchesQuery = !q || itemText.includes(q);
      return matchesDept && matchesQuery;
    });
  }, [dept, query, user, mentors, pendingRequests]);

  const suggestedChatContacts = useMemo(() => {
    if (!user?.id) return [];

    if (user?.role === 'Mentor') {
      // Every accepted mentee should be reachable to chat, not just the ones
      // who happen to already have a message thread — otherwise a mentor
      // can't start the conversation with a mentee they just accepted.
      const fromThreads = Object.values(chatThreads)
        .filter((thread) => thread.participants?.includes(user.id))
        .map((thread) => {
          const contactId = thread.participants.find((id) => String(id) !== String(user.id));
          return {
            id: contactId,
            name: thread.names?.[contactId] || 'Mentee',
            subtitle: 'Active chat',
          };
        });

      const fromAcceptedRequests = requests
        .filter(
          (r) => (r.status || 'pending') === 'accepted' && r.menteeId && String(r.tutorId ?? '') === String(user.id)
        )
        .map((r) => ({
          id: r.menteeId,
          name: r.name || 'Mentee',
          subtitle: r.course || 'Accepted mentee',
        }));

      const seen = new Set();
      return [...fromThreads, ...fromAcceptedRequests].filter((contact) => {
        if (!contact.id || seen.has(String(contact.id))) return false;
        seen.add(String(contact.id));
        return true;
      });
    }

    if (mentors && mentors.length > 0) {
      return mentors.slice(0, 4).map((mentor) => ({
        id: mentor.id,
        name: mentor.name,
        subtitle: mentor.title,
      }));
    }

    return [];
  }, [user, mentors, chatThreads, requests]);

  const openTutor = (t) => {
    setActiveTutor(t);
    setActiveRequest(null);
    setSessionsOrigin(false);
    navigateView('tutorProfile');
  };

  const addRequest = (request) => {
    // Optimistic local update so the mentee sees it immediately.
    setRequests((prev) => {
      const next = [request, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('campuslink-requests', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('campuslink-requests-updated', { detail: next }));
      }
      return next;
    });

    if (!hasSupabaseConfig || requestsTableMissing) return;
    const client = getSupabase();
    if (!client) return;

    const row = {
      id: String(request.id),
      mentee_name: request.name,
      mentee_initials: request.initials,
      major: request.major || '',
      course: request.course || '',
      focus: request.focus || '',
      urgency: request.urgency || 'Flexible',
      match: request.match ?? 90,
      availability: request.availability ?? [],
      verified: request.verified ?? false,
      bio: request.bio || '',
      testimonial_name: request.testimonial?.name || '',
      testimonial_text: request.testimonial?.text || '',
      status: request.status || 'pending',
      mentee_id: user?.id ? String(user.id) : null,
      tutor_id: request.tutorId ? String(request.tutorId) : null,
      code: request.code || null,
    };

    client
      .from('mentee_requests')
      .insert(row)
      .then(({ error }) => {
        if (!error) return;
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('mentee_requests') || msg.includes('does not exist') || msg.includes('could not find')) {
          setRequestsTableMissing(true);
        }
        console.error('Failed to save mentee request to Supabase:', error.message);
      });
  };

  const addBooking = (booking) => {
    // Optimistic local update so the mentee sees the ticket immediately.
    setBookings((prev) => {
      const next = [booking, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('campuslink-bookings', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('campuslink-bookings-updated', { detail: next }));
      }
      return next;
    });

    if (!hasSupabaseConfig || bookingsTableMissing) return;
    const client = getSupabase();
    if (!client) return;

    const row = {
      id: String(booking.id),
      mentee_id: user?.id ? String(user.id) : null,
      mentee_name: user?.name || 'Student',
      tutor_id: booking.tutorId ? String(booking.tutorId) : null,
      tutor_name: booking.tutorName,
      tutor_initials: booking.initials,
      course: booking.course,
      day: booking.day,
      date: booking.dateIso || null,
      time: booking.time,
      code: booking.code,
      status: booking.status || 'pending',
      checked_in_at: booking.checkedInAt || null,
    };

    client
      .from('bookings')
      .insert(row)
      .then(({ error }) => {
        if (!error) return;
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('bookings') || msg.includes('does not exist') || msg.includes('could not find')) {
          setBookingsTableMissing(true);
        }
        console.error('Failed to save booking to Supabase:', error.message);
      });
  };

  // Mentor accepts a pending request: flips its status to "accepted" and, if
  // the request came from a booked slot (same id), flips the matching
  // booking too so it shows "Approved" on the mentee's Sessions page.
  const handleAcceptRequest = (request) => {
    setRequests((prev) => {
      const next = prev.map((r) => (String(r.id) === String(request.id) ? { ...r, status: 'accepted' } : r));
      if (typeof window !== 'undefined') {
        localStorage.setItem('campuslink-requests', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('campuslink-requests-updated', { detail: next }));
      }
      return next;
    });
    setBookings((prev) => {
      const next = prev.map((b) => (String(b.id) === String(request.id) ? { ...b, status: 'accepted' } : b));
      if (typeof window !== 'undefined') {
        localStorage.setItem('campuslink-bookings', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('campuslink-bookings-updated', { detail: next }));
      }
      return next;
    });
    setActiveRequest((prev) => (prev && String(prev.id) === String(request.id) ? { ...prev, status: 'accepted' } : prev));

    if (!hasSupabaseConfig) return;
    const client = getSupabase();
    if (!client) return;

    if (!requestsTableMissing) {
      client
        .from('mentee_requests')
        .update({ status: 'accepted' })
        .eq('id', String(request.id))
        .then(({ error }) => {
          if (error) console.warn('Could not persist accepted request status to Supabase:', error.message);
        });
    }
    if (!bookingsTableMissing) {
      client
        .from('bookings')
        .update({ status: 'accepted' })
        .eq('id', String(request.id))
        .then(({ error }) => {
          if (error) console.warn('Could not persist accepted booking status to Supabase:', error.message);
        });
    }
  };

  // Mentee reschedules an existing booking to a different day/time. Takes
  // effect immediately — no mentor re-approval needed. The mentor's Sessions
  // view picks up the new time automatically since it reads the linked
  // booking's day/time live. `dateIso` must be updated alongside the display
  // label — getBookingStartDate/getCheckInState trust dateIso over `day` for
  // computing whether a session is live/overdue, so leaving it stale would
  // make a freshly-rescheduled future session immediately read as overdue
  // (and eventually get auto-marked "missed") based on its old date.
  const handleRescheduleBooking = (booking, day, time, dateIso) => {
    setBookings((prev) => {
      const next = prev.map((b) => (String(b.id) === String(booking.id) ? { ...b, day, time, dateIso, checkedInAt: null } : b));
      if (typeof window !== 'undefined') {
        localStorage.setItem('campuslink-bookings', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('campuslink-bookings-updated', { detail: next }));
      }
      return next;
    });

    if (!hasSupabaseConfig || bookingsTableMissing) return;
    const client = getSupabase();
    if (!client) return;

    client
      .from('bookings')
      .update({ day, time, date: dateIso || null, checked_in_at: null })
      .eq('id', String(booking.id))
      .then(({ error }) => {
        if (error) console.warn('Could not persist rescheduled time to Supabase:', error.message);
      });
  };

  // Mentee cancels a booking: flips its status (and the linked request's, if
  // any) to "cancelled" so it drops off the mentor's accepted sessions list.
  const handleCancelBooking = (booking) => {
    setBookings((prev) => {
      const next = prev.map((b) => (String(b.id) === String(booking.id) ? { ...b, status: 'cancelled' } : b));
      if (typeof window !== 'undefined') {
        localStorage.setItem('campuslink-bookings', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('campuslink-bookings-updated', { detail: next }));
      }
      return next;
    });
    setRequests((prev) => {
      const next = prev.map((r) => (String(r.id) === String(booking.id) ? { ...r, status: 'cancelled' } : r));
      if (typeof window !== 'undefined') {
        localStorage.setItem('campuslink-requests', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('campuslink-requests-updated', { detail: next }));
      }
      return next;
    });

    if (!hasSupabaseConfig) return;
    const client = getSupabase();
    if (!client) return;

    if (!bookingsTableMissing) {
      client
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', String(booking.id))
        .then(({ error }) => {
          if (error) console.warn('Could not persist cancelled booking status to Supabase:', error.message);
        });
    }
    if (!requestsTableMissing) {
      client
        .from('mentee_requests')
        .update({ status: 'cancelled' })
        .eq('id', String(booking.id))
        .then(({ error }) => {
          if (error) console.warn('Could not persist cancelled request status to Supabase:', error.message);
        });
    }
  };

  // Mentee checks in to a confirmed session ticket once it's started (and
  // within the 1-hour check-in window — see getCheckInState). Recorded as a
  // timestamp rather than a plain flag so "when" is kept too.
  const handleCheckIn = (booking) => {
    const checkedInAt = new Date().toISOString();
    setBookings((prev) => {
      const next = prev.map((b) => (String(b.id) === String(booking.id) ? { ...b, checkedInAt } : b));
      if (typeof window !== 'undefined') {
        localStorage.setItem('campuslink-bookings', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('campuslink-bookings-updated', { detail: next }));
      }
      return next;
    });

    if (!hasSupabaseConfig || bookingsTableMissing) return;
    const client = getSupabase();
    if (!client) return;

    client
      .from('bookings')
      .update({ checked_in_at: checkedInAt })
      .eq('id', String(booking.id))
      .then(({ error }) => {
        if (error) console.warn('Could not persist check-in to Supabase:', error.message);
      });
  };

  // A confirmed booking that goes unchecked for more than an hour past its
  // start time flips to "missed" on its own — nothing else naturally
  // re-renders the Sessions page once you've stopped looking at it, so this
  // re-checks on a timer rather than only reacting to other state changes.
  useEffect(() => {
    function markOverdueBookingsMissed() {
      setBookings((prev) => {
        const next = prev.map((b) =>
          (b.status || 'pending') === 'accepted' && getCheckInState(b) === 'overdue'
            ? { ...b, status: 'missed' }
            : b
        );
        const newlyMissed = next.filter((b, i) => b.status === 'missed' && prev[i]?.status !== 'missed');
        if (newlyMissed.length === 0) return prev;

        if (typeof window !== 'undefined') {
          localStorage.setItem('campuslink-bookings', JSON.stringify(next));
          window.dispatchEvent(new CustomEvent('campuslink-bookings-updated', { detail: next }));
        }
        if (hasSupabaseConfig && !bookingsTableMissing) {
          const client = getSupabase();
          if (client) {
            newlyMissed.forEach((b) => {
              client
                .from('bookings')
                .update({ status: 'missed' })
                .eq('id', String(b.id))
                .then(({ error }) => {
                  if (error) console.warn('Could not persist missed booking status to Supabase:', error.message);
                });
            });
          }
        }
        return next;
      });
    }

    markOverdueBookingsMissed();
    const interval = setInterval(markOverdueBookingsMissed, 60000);
    return () => clearInterval(interval);
  }, [bookingsTableMissing]);

  const openRequest = (request) => {
    setActiveRequest(request);
    setActiveTutor(null);
    setSessionsOrigin(false);
    navigateView('mentorRequestDetail');
  };

  // Tapping a session now opens the *person's* profile rather than a ticket
  // detail card: a mentor sees the mentee's full request (same page used from
  // Requests), a mentee sees the tutor's profile (same page used from Find
  // tutors). Both share the session's id with the underlying request row.
  const openSession = (session) => {
    if (user?.role === 'Mentor') {
      const request = requests.find((r) => String(r.id) === String(session.id));
      if (!request) return;
      setActiveRequest(request);
      setActiveTutor(null);
    } else {
      // mentors can still be null here — bookings load in their own effect
      // and can resolve before the mentors list does.
      const tutor = (mentors || []).find((m) => String(m.id) === String(session.tutorId));
      if (!tutor) return;
      setActiveTutor(tutor);
      setActiveRequest(null);
    }
    setSessionsOrigin(true);
    navigateView(user?.role === 'Mentor' ? 'mentorRequestDetail' : 'tutorProfile');
  };

  // Deep-link support: the landing dashboard's "Contact" button on another
  // mentor's card navigates here with { openChatWith: { id, name } } in
  // router state, so tapping it lands straight in that conversation instead
  // of just the generic Home page. Consumed once the user is loaded, then
  // cleared from history state so a refresh or back-navigation doesn't
  // reopen the same thread.
  useEffect(() => {
    const target = location.state?.openChatWith;
    if (!target || !user?.id) return;
    openChatContact(target);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, user?.id]);

  // Never render the app (or any placeholder "logged in as ..." content)
  // until we actually know who's logged in. While that's being resolved,
  // or once we've determined there's no session and are redirecting to
  // /login, show a minimal loading state instead.
  if (checkingSession || !user) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.bg,
          fontFamily: FONT_BODY,
          color: C.muted,
          fontSize: 14,
        }}
      >
        Loading your account…
      </div>
    );
  }

  return (
    <div className="cl-root" style={{ width: '100%', minHeight: '100%', backgroundColor: C.bg, fontFamily: FONT_BODY }}>
      <style>{globalCss}</style>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <NavBar
        view={view}
        navigateView={navigateView}
        user={user}
        sessionsOrigin={sessionsOrigin}
        unreadCount={unreadCount}
        unreadNotifications={unreadNotifications}
        onOpenNotification={(n) => openChatContact({ id: n.contactId, name: n.contactName })}
      />

      <button
        type="button"
        onClick={() => {
          setShowChat((prev) => {
            const next = !prev;
            if (next) markAllThreadsRead();
            return next;
          });
        }}
        id="campuslink-floating-chat-button"
        aria-label="Open chat"
        style={{
          position: 'fixed',
          left: 24,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: C.greenDark,
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 18px 35px rgba(15, 81, 50, 0.2)',
          zIndex: 1200,
          cursor: 'pointer',
        }}
      >
        <MessageCircle size={24} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: '#ff4d4f',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 5px',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {showChat && (
        <div
          role="dialog"
          aria-label="Chat drawer"
          style={{
            position: 'fixed',
            left: 24,
            bottom: 110,
            width: 320,
            maxHeight: '60vh',
            borderRadius: 24,
            backgroundColor: '#fff',
            boxShadow: '0 24px 60px rgba(15, 81, 50, 0.25)',
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', backgroundColor: C.greenDark, color: '#fff' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{activeChatContact ? activeChatContact.name : 'Chat contacts'}</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {activeChatContact && (
                <button
                  type="button"
                  onClick={() => setActiveChatContact(null)}
                  style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 14 }}
                >
                  ← Back
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowChat(false)}
                style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 18 }}
              >
                ×
              </button>
            </div>
          </div>
          {chatMessagesTableMissing && (
            <div style={{ padding: '10px 16px', fontSize: 11.5, color: C.goldDark, backgroundColor: C.goldSoft }}>
              The Supabase `chat_messages` table is not available, so chat only works on this device for now.
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', overflowY: 'auto', backgroundColor: '#F7F7F3' }}>
            {!activeChatContact ? (
              <>
                {Object.keys(chatThreads).length > 0 ? (
                  <div>
                    <div style={{ marginBottom: 10, fontWeight: 700, color: C.ink }}>Recent chats</div>
                    {Object.values(chatThreads)
                      .sort((a, b) => {
                        const aLast = a.messages?.[a.messages.length - 1]?.id || 0;
                        const bLast = b.messages?.[b.messages.length - 1]?.id || 0;
                        return bLast - aLast;
                      })
                      .map((thread) => {
                        const contactId = thread.participants?.find((id) => String(id) !== String(user?.id));
                        const contactName = contactId ? thread.names?.[contactId] || 'Contact' : 'Contact';
                        return (
                          <button
                            key={thread.threadId}
                            type="button"
                            onClick={() => openChatContact({ id: contactId, name: contactName })}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '12px 14px',
                              borderRadius: 16,
                              border: `1px solid ${C.line}`,
                              background: '#fff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: C.ink }}>{contactName}</div>
                              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                                {thread.messages?.length || 0} message{thread.messages?.length === 1 ? '' : 's'}
                              </div>
                            </div>
                            <div style={{ fontSize: 12, color: C.muted }}>
                              {thread.messages?.[thread.messages.length - 1]?.time || ''}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
                    {user?.role === 'Mentor'
                      ? 'No mentees have messaged you yet.'
                      : 'You have no active chat contacts yet. Start a conversation with a mentor.'}
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 10, fontWeight: 700, color: C.ink }}>
                    {user?.role === 'Mentor' ? 'Mentee contacts' : 'Mentor contacts'}
                  </div>
                  {suggestedChatContacts.length > 0 ? (
                    suggestedChatContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => openChatContact({ id: contact.id, name: contact.name })}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '12px 14px',
                          borderRadius: 16,
                          border: `1px solid ${C.line}`,
                          background: '#fff',
                          cursor: 'pointer',
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ fontWeight: 700, color: C.ink }}>{contact.name}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{contact.subtitle}</div>
                      </button>
                    ))
                  ) : (
                    <div style={{ fontSize: 13, color: C.muted }}>
                      No contacts available yet.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {(() => {
                  const threadId = makeThreadId(user?.id, activeChatContact.id);
                  const messages = threadId ? chatThreads[threadId]?.messages || [] : [];
                  return messages.length === 0 ? (
                    <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
                      No messages yet with {activeChatContact.name}. Start the conversation below.
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        style={{ alignSelf: String(message.senderId) === String(user?.id) ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, color: C.muted, marginBottom: 6 }}>
                          <span>{message.senderName || (String(message.senderId) === String(user?.id) ? 'You' : activeChatContact.name)}</span>
                          <span>{message.time}</span>
                        </div>
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: 18,
                            backgroundColor: String(message.senderId) === String(user?.id) ? C.greenDark : C.card,
                            color: String(message.senderId) === String(user?.id) ? '#fff' : C.ink,
                            fontSize: 13,
                            lineHeight: 1.5,
                          }}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))
                  );
                })()}
              </>
            )}
          </div>
          {activeChatContact && (
            <div style={{ display: 'flex', gap: 10, padding: 14, borderTop: `1px solid ${C.line}`, backgroundColor: '#fff' }}>
              <input
                type="text"
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && sendChatMessage()}
                placeholder={`Message ${activeChatContact.name}...`}
                style={{ flex: 1, borderRadius: 999, border: `1px solid ${C.line}`, padding: '12px 14px', fontSize: 13, outline: 'none' }}
              />
              <button
                type="button"
                onClick={sendChatMessage}
                className="cl-primary-btn"
                style={{ borderRadius: 999, padding: '12px 18px', fontSize: 13, fontWeight: 700, border: 'none', backgroundColor: C.greenDark, color: '#fff' }}
              >
                Send
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'home' && (user?.role === 'Mentor' ? (
        <MentorHomePage upcoming={mentorSessions} requests={pendingRequests} onOpenRequest={openRequest} onAccept={handleAcceptRequest} navigateView={navigateView} user={user} />
      ) : (
        <HomePage upcoming={activeBookings} mentors={mentors} onOpenTutor={openTutor} navigateView={navigateView} user={user} />
      ))}
      {view === 'tutors' && (
        user?.role === 'Mentor'
          ? <MentorRequestsPage dept={dept} setDept={setDept} query={query} setQuery={setQuery} filtered={filtered} onOpen={openRequest} onAccept={handleAcceptRequest} />
          : <TutorsPage role={user?.role || 'Mentee'} dept={dept} setDept={setDept} query={query} setQuery={setQuery} filtered={filtered} onOpen={openTutor} />
      )}
      {view === 'tutors' && user?.role !== 'Mentor' && mentors === null && (
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '32px 24px', color: C.muted, fontSize: 13.5 }}>
          Loading mentors...
        </div>
      )}
      {view === 'tutors' && user?.role !== 'Mentor' && profilesTableMissing && (
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '24px', color: C.muted, fontSize: 13.5, backgroundColor: '#FEF7E3', borderRadius: 12, border: `1px solid ${C.gold}` }}>
          The Supabase `profiles` table is not available, so no mentors can be loaded right now.
        </div>
      )}
      {view === 'tutors' && user?.role !== 'Mentor' && !profilesTableMissing && mentors !== null && mentors.length === 0 && hasSupabaseConfig && (
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '32px 24px', color: C.muted, fontSize: 13.5 }}>
          No mentors found yet in the database.
        </div>
      )}
      {(view === 'home' || view === 'tutors') && user?.role === 'Mentor' && requestsTableMissing && (
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '24px', color: C.muted, fontSize: 13.5, backgroundColor: '#FEF7E3', borderRadius: 12, border: `1px solid ${C.gold}` }}>
          The Supabase `mentee_requests` table is not available, so student requests are only cached on this device for now.
        </div>
      )}
      {view === 'sessions' && bookingsTableMissing && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px', color: C.muted, fontSize: 13.5, backgroundColor: '#FEF7E3', borderRadius: 12, border: `1px solid ${C.gold}` }}>
          The Supabase `bookings` table is not available, so sessions are only cached on this device for now.
        </div>
      )}
      {view === 'tutorProfile' && activeTutor && (
        <TutorProfilePage
          tutor={activeTutor}
          user={user}
          onBack={() => navigateView(sessionsOrigin ? 'sessions' : 'tutors')}
          onBooked={addBooking}
          onRequestSent={addRequest}
          onOpenChat={(t) => openChatContact({ id: t.id, name: t.name })}
        />
      )}
      {view === 'mentorRequestDetail' && activeRequest && (
        <MentorRequestDetailPage
          request={activeRequest}
          onBack={() => navigateView(sessionsOrigin ? 'sessions' : 'tutors')}
          onAccept={handleAcceptRequest}
        />
      )}
      {view === 'sessions' && (
        <SessionsPage
          bookings={user?.role === 'Mentor' ? mentorSessions : activeBookings}
          role={user?.role || 'Mentee'}
          mentors={mentors}
          onReschedule={handleRescheduleBooking}
          onCancel={handleCancelBooking}
          onCheckIn={handleCheckIn}
          onOpen={openSession}
        />
      )}
      {view === 'profile' && <ProfilePage
        onLogout={async () => {
          const client = getSupabase();
          if (client) {
            await client.auth.signOut();
          }
          sessionStorage.removeItem('campuslink-auth');
          sessionStorage.removeItem('campuslink-user');
          // An explicit logout should mean it — otherwise reopening the app
          // within the 5-day window would silently sign back in as if
          // nothing happened.
          forgetRememberedSession();
          navigate('/login');
        }}
        user={user}
        editing={editing}
        editProfile={editProfile}
        onEdit={beginEditingProfile}
        onCancel={cancelEditingProfile}
        onSave={saveProfileChanges}
        onChange={updateEditField}
        status={status}
      />}
    </div>
  );
}

function MentorHomePage({ upcoming, requests, onOpenRequest, onAccept, navigateView, user }) {
  const displayName = user?.name || 'Mentor';
  const visibleRequests = requests;
  const highlighted = visibleRequests[0] || null;
  const averageMatch = visibleRequests.length > 0
    ? Math.round(visibleRequests.reduce((sum, r) => sum + (r.match || 0), 0) / visibleRequests.length)
    : null;

  return (
    <div className="cl-page" style={{ maxWidth: 1152, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13.5, color: C.muted }}>Welcome back,</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, color: C.ink, margin: '2px 0 0' }}>
            {displayName}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigateView('tutors')}
          className="cl-primary-btn"
          style={{ borderRadius: 999, padding: '12px 20px', fontSize: 13.5, fontWeight: 700, border: 'none', backgroundColor: C.greenDark, color: '#fff' }}
        >
          View student requests
        </button>
      </div>

      <div className="cl-split" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <Card style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.ink }}>Your mentor dashboard</div>
              <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4 }}>Track active student requests, upcoming sessions, and new matches.</div>
            </div>
            <Pill tone="green">Mentor</Pill>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            <Card style={{ padding: 18, backgroundColor: C.greenSoft }}>
              <div style={{ fontSize: 12.5, color: C.muted }}>Open requests</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: C.ink }}>{visibleRequests.length}</div>
            </Card>
            <Card style={{ padding: 18, backgroundColor: C.goldSoft }}>
              <div style={{ fontSize: 12.5, color: C.muted }}>Live bookings</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: C.ink }}>{upcoming.length}</div>
            </Card>
            <Card style={{ padding: 18, backgroundColor: '#F6F6F3' }}>
              <div style={{ fontSize: 12.5, color: C.muted }}>Average match</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: C.ink }}>{averageMatch !== null ? `${averageMatch}%` : '—'}</div>
            </Card>
          </div>
        </Card>

        <Card style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, color: C.ink }}>Next priority request</div>
          <div style={{ fontSize: 13.5, color: C.muted }}>Review the most urgent learner request and respond quickly.</div>
          {highlighted ? (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Pill>{highlighted.course}</Pill>
                <Pill>{highlighted.urgency}</Pill>
                <Pill>{highlighted.match}% match</Pill>
              </div>
              <button
                type="button"
                onClick={() => onOpenRequest(highlighted)}
                className="cl-primary-btn"
                style={{ borderRadius: 999, padding: '12px 0', fontSize: 13.5, fontWeight: 700, border: 'none', backgroundColor: C.greenDark, color: '#fff' }}
              >
                Open request
              </button>
            </>
          ) : (
            <div style={{ fontSize: 13.5, color: C.muted }}>No active requests yet. New mentee requests will show here once someone requests help.</div>
          )}
        </Card>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, color: C.ink }}>Recent student requests</div>
          <button
            type="button"
            onClick={() => navigateView('tutors')}
            className="cl-secondary-btn"
            style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 999, border: `1px solid ${C.line}`, backgroundColor: 'transparent', color: C.greenDark }}
          >
            See all requests
          </button>
        </div>
        {visibleRequests.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: 13.5, color: C.muted, padding: '48px 0' }}>
            No student requests yet.
          </div>
        ) : (
          <div className="cl-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {visibleRequests.slice(0, 3).map((request) => (
              <MentorRequestCard key={request.id} request={request} onOpen={onOpenRequest} onAccept={onAccept} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MentorRequestCard({ request, onOpen, onAccept }) {
  const status = request.status || 'pending';
  const isPending = status === 'pending';
  return (
    <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, color: C.ink }}>{request.name}</div>
          <div style={{ fontSize: 12.5, color: C.muted }}>{request.major} · {request.course}</div>
        </div>
        <MatchBadge pct={request.match} />
      </div>
      <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>{request.focus}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Pill tone="line">Urgency: {request.urgency}</Pill>
        <Pill tone="line">Available: {request.availability.join(', ')}</Pill>
        <SessionStatusPill status={status} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <button
          type="button"
          onClick={() => onOpen(request)}
          className="cl-secondary-btn"
          style={{ flex: 1, padding: '10px 0', borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: `1px solid ${C.line}`, backgroundColor: 'transparent', color: C.greenDark }}
        >
          View details
        </button>
        {isPending ? (
          <button
            type="button"
            onClick={() => onAccept && onAccept(request)}
            className="cl-primary-btn"
            style={{ flex: 1, padding: '10px 0', borderRadius: 999, fontSize: 12.5, fontWeight: 700, border: 'none', backgroundColor: C.greenDark, color: '#fff' }}
          >
            Accept
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpen(request)}
            className="cl-primary-btn"
            style={{ flex: 1, padding: '10px 0', borderRadius: 999, fontSize: 12.5, fontWeight: 700, border: 'none', backgroundColor: C.greenDark, color: '#fff' }}
          >
            Respond
          </button>
        )}
      </div>
    </Card>
  );
}

function MentorRequestsPage({ dept, setDept, query, setQuery, filtered, onOpen, onAccept }) {
  return (
    <div className="cl-page" style={{ maxWidth: 1152, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: C.ink, margin: 0 }}>Student requests</h1>
        <div style={{ fontSize: 13.5, color: C.muted, marginTop: 2 }}>
          Review open mentee requests and respond with your best support plan.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} color={C.muted} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student, course, or focus"
            className="cl-input"
            style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 12, fontSize: 13.5, border: `1px solid ${C.line}`, backgroundColor: '#FAFAF6', color: C.ink }}
          />
        </div>
        <div className="cl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {DEPARTMENTS.map((d) => {
            const active = dept === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDept(d)}
                className="cl-chip-btn"
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: `1px solid ${active ? C.greenDark : C.line}`,
                  backgroundColor: active ? C.greenDark : C.card,
                  color: active ? '#fff' : C.ink,
                  flexShrink: 0,
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, color: C.ink }}>
          {filtered.length} request{filtered.length === 1 ? '' : 's'} available
        </span>
        <Pill tone="green">Mentor only</Pill>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', fontSize: 13.5, color: C.muted, padding: '64px 0' }}>
          No mentee requests match your search yet — try broadening the course or keyword.
        </div>
      ) : (
        <div className="cl-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {filtered.map((request) => (
            <MentorRequestCard key={request.id} request={request} onOpen={onOpen} onAccept={onAccept} />
          ))}
        </div>
      )}
    </div>
  );
}

function MentorRequestDetailPage({ request, onBack, onAccept }) {
  const status = request.status || 'pending';
  const isPending = status === 'pending';
  return (
    <div className="cl-page" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 600, color: C.green, border: 'none', background: 'none', width: 'fit-content', padding: 0 }}
      >
        <ChevronLeft size={16} /> Back to requests
      </button>

      <Card style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.muted }}>Request from</span>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 22, color: C.ink, marginTop: 4 }}>{request.name}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{request.major} · {request.course}</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Pill>Urgency: {request.urgency}</Pill>
            <Pill>{request.match}% match</Pill>
            <Pill>Sessions: {request.sessions}</Pill>
            <SessionStatusPill status={status} />
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Focus area</div>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: 0 }}>{request.focus}</p>

          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Student notes</div>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: 0 }}>{request.bio}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12.5, color: C.muted }}>Preferred availability</div>
              <div style={{ fontWeight: 700, color: C.ink, marginTop: 6 }}>{request.availability.join(', ')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12.5, color: C.muted }}>Match score</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, color: C.ink }}>{request.match}%</div>
            </div>
          </div>

          {isPending ? (
            <button
              type="button"
              onClick={() => onAccept && onAccept(request)}
              className="cl-primary-btn"
              style={{ padding: '14px 0', borderRadius: 999, border: 'none', backgroundColor: C.greenDark, color: '#fff', fontSize: 13.5, fontWeight: 700 }}
            >
              Accept request
            </button>
          ) : (
            <div
              style={{
                padding: '14px 0',
                borderRadius: 999,
                textAlign: 'center',
                fontSize: 13.5,
                fontWeight: 700,
                color: C.greenDark,
                backgroundColor: C.greenSoft,
              }}
            >
              You accepted this request — the student will see it as Approved on their Sessions page.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
