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
}

export function getRoleStorageKey(role) {
  const roleSlug = role ? String(role).trim().toLowerCase() : 'guest';
  return `${DEFAULT_STORAGE_KEY}-${roleSlug}-${getOrCreateTabId()}`;
}

export function createSupabaseClient({ storageKey, detectSessionInUrl = false } = {}) {
  if (!hasSupabaseConfig) return null;
  const authStorageKey = storageKey || getTabAuthStorageKey();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: authStorageKey,
      persistSession: true,
      detectSessionInUrl,
    },
  });
}

export function getSupabase() {
  return createSupabaseClient();
}

// Every other page opts out of Supabase's automatic "read tokens out of the
// URL" behavior (see the tab-isolation comment above) since it would step
// on the per-tab storage key scheme. The email-confirmation landing page is
// the one place that genuinely needs it — Supabase's confirmation link
// redirects here with the session in the URL, and there's nothing else
// that would consume it.
export function getSupabaseForEmailConfirm() {
  return createSupabaseClient({ storageKey: 'sb-campuslink-confirm-token', detectSessionInUrl: true });
}

export const supabase = getSupabase();
