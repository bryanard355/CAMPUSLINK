import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const DEFAULT_STORAGE_KEY = hasSupabaseConfig
  ? `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
  : 'sb-campuslink-auth-token';

export const AUTH_USER_KEY = 'campuslink-user';
export const AUTH_FLAG_KEY = 'campuslink-auth';
export const AUTH_TAB_KEY = 'campuslink-tab-auth-key';
const AUTH_TAB_ID_KEY = 'campuslink-tab-id';

// Supabase always persists sessions to localStorage, which is shared by every
// tab in the browser — even with a role-specific storageKey, two mentee tabs
// both resolve to the same "...-mentee" key and silently overwrite each
// other's session. sessionStorage, unlike localStorage, is genuinely
// per-tab, so we mint (and remember) a random id per tab the first time it's
// needed and fold it into the storage key, giving every tab — even two logged
// in as the same role — its own isolated slot.
function getOrCreateTabId() {
  if (typeof window === 'undefined') return 'server';
  let tabId = sessionStorage.getItem(AUTH_TAB_ID_KEY);
  if (!tabId) {
    tabId = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(AUTH_TAB_ID_KEY, tabId);
  }
  return tabId;
}

export function getTabAuthStorageKey() {
  if (typeof window === 'undefined') return DEFAULT_STORAGE_KEY;
  return sessionStorage.getItem(AUTH_TAB_KEY) || DEFAULT_STORAGE_KEY;
}

export function setTabAuthStorageKey(storageKey) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AUTH_TAB_KEY, storageKey);
  // Every call site that sets this is a genuine successful login, signup,
  // or Google role-selection — exactly the moments worth remembering across
  // a full app close, so this device can walk back into the same account
  // next time without a fresh sessionStorage tab id losing track of it.
  rememberSession(storageKey);
}

// --- Device-level "stay logged in" persistence --------------------------
// The per-tab scheme above is genuinely per-BROWSING-CONTEXT: its pointer
// lives in sessionStorage, which is wiped whenever that context actually
// closes (including an installed PWA getting killed in the background,
// which mobile OSes do often). The underlying token still sits untouched in
// localStorage, just orphaned — nothing points at it anymore. This section
// keeps a second, deliberately durable pointer in localStorage recording
// which key a fresh app load should try, so reopening the app (a new
// browsing context, with empty sessionStorage) can still find its way back
// to the same account instead of always landing on the login screen.
const REMEMBER_KEY = 'campuslink-remembered-session';
const REMEMBER_MAX_INACTIVITY_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

function readRememberedSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function rememberSession(storageKey) {
  if (typeof window === 'undefined' || !storageKey) return;
  try {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ storageKey, lastActiveAt: Date.now() }));
  } catch {
    // Best-effort — a full/blocked localStorage just means this device
    // won't stay logged in across closes, not something worth crashing over.
  }
}

// Bumps the "last used" timestamp without changing which key is
// remembered — call this periodically while someone is actually using the
// app so a long-lived open tab (or one reopened well within the window)
// keeps resetting its own 5-day inactivity clock.
export function touchRememberedSession() {
  const remembered = readRememberedSession();
  if (!remembered?.storageKey) return;
  rememberSession(remembered.storageKey);
}

export function forgetRememberedSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // no-op
  }
}

// Called once, early, on a fresh app load before any per-tab key has been
// chosen yet. If this device has a remembered login and it's been used
// inside the last 5 days, adopts that same storage key so the normal
// getSession() restore flow finds its token like nothing happened. Past 5
// days of nobody opening the app, it's treated as expired: the stale token
// itself is dropped (not just the pointer to it), so an old, unused device
// doesn't keep holding a live, indefinitely-valid refresh token, and the
// visitor is sent back to a real login instead.
export function tryAdoptRememberedSession() {
  if (typeof window === 'undefined') return false;
  const remembered = readRememberedSession();
  if (!remembered?.storageKey) return false;

  const inactiveFor = Date.now() - (remembered.lastActiveAt || 0);
  if (inactiveFor > REMEMBER_MAX_INACTIVITY_MS) {
    try {
      localStorage.removeItem(remembered.storageKey);
    } catch {
      // no-op
    }
    forgetRememberedSession();
    return false;
  }

  // Adopting the key doubles as a "used the app" touch — it's set via
  // setTabAuthStorageKey (not a raw sessionStorage write) specifically so
  // this refreshes the inactivity clock too.
  setTabAuthStorageKey(remembered.storageKey);
  return true;
}

export function getRoleStorageKey(role) {
  const roleSlug = role ? String(role).trim().toLowerCase() : 'guest';
  return `${DEFAULT_STORAGE_KEY}-${roleSlug}-${getOrCreateTabId()}`;
}

// Callers throughout the app call getSupabase() fresh, on demand, in every
// effect/handler that needs it rather than holding onto one instance —
// convenient, but naively minting a new GoTrueClient on every call means
// several can end up running concurrently against the very same storage key,
// which is a known source of flaky session behavior. Caching per storage key
// (rather than one client for the app's whole lifetime) fixes that while
// still creating a genuinely new client whenever the key actually changes —
// which does need to happen: setTabAuthStorageKey() switches it at login,
// signup, and role selection, and a stale cached client would keep writing
// to the pre-switch key instead.
const clientCache = new Map();

export function createSupabaseClient({ storageKey, detectSessionInUrl = false } = {}) {
  if (!hasSupabaseConfig) return null;
  const authStorageKey = storageKey || getTabAuthStorageKey();
  const cacheKey = `${authStorageKey}::${detectSessionInUrl}`;

  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: authStorageKey,
      persistSession: true,
      detectSessionInUrl,
    },
  });
  clientCache.set(cacheKey, client);
  return client;
}

export function getSupabase() {
  return createSupabaseClient();
}

// Every other page opts out of Supabase's automatic "read tokens out of the
// URL" behavior (see the tab-isolation comment above) since it would step
// on the per-tab storage key scheme. The email-confirmation page and the
// Google OAuth callback page are the two places that genuinely need it —
// Supabase redirects back to them with the session in the URL, and there's
// nothing else that would consume it. Once a real session is found, those
// pages re-persist it under the correct tab-scoped key (via setTabAuthStorageKey
// + a normal getSupabase() client) so the rest of the app can see it.
export function getSupabaseForAuthRedirect() {
  return createSupabaseClient({ storageKey: 'sb-campuslink-redirect-token', detectSessionInUrl: true });
}
