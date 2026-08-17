import { getSupabase, hasSupabaseConfig } from './supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// The Push API wants the VAPID public key as a raw Uint8Array, but it's
// handed out (and stored in env vars) as a URL-safe base64 string — this is
// the standard conversion, copied from the Web Push spec's own examples.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

// null when unsupported, otherwise the standard Notification.permission
// values: 'default' | 'granted' | 'denied'.
export function getPushPermission() {
  if (!isPushSupported()) return null;
  return Notification.permission;
}

// Turns push on for this device: asks for notification permission (must be
// called from a user gesture — a button click — or most browsers ignore the
// prompt), subscribes via the service worker, and saves the subscription so
// the server knows where to deliver to. Upserts on the subscription's own
// endpoint, so re-enabling on the same browser/device just refreshes the
// existing row instead of piling up duplicates.
export async function subscribeToPush(userId) {
  if (!isPushSupported()) return { ok: false, error: 'Push notifications are not supported in this browser.' };
  if (!userId) return { ok: false, error: 'No signed-in user to subscribe.' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, error: permission === 'denied' ? 'Notification permission was denied.' : 'Notification permission was dismissed.' };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    // subscribe() talks to the browser's own push service (FCM for
    // Chrome/Edge) to mint an endpoint — normally near-instant, but with no
    // built-in timeout of its own it can otherwise hang the "Enable" button
    // forever if that service is ever unreachable, rather than surfacing a
    // real error.
    try {
      subscription = await Promise.race([
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
      ]);
    } catch (err) {
      return {
        ok: false,
        error: err?.message === 'timeout'
          ? "Couldn't reach the push service — check your connection and try again."
          : `Couldn't subscribe to push notifications: ${err?.message || 'unknown error'}`,
      };
    }
  }

  const json = subscription.toJSON();
  if (hasSupabaseConfig) {
    const client = getSupabase();
    if (client) {
      const { error } = await client.from('push_subscriptions').upsert(
        {
          user_id: String(userId),
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
        { onConflict: 'endpoint' }
      );
      if (error) return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

// Turns push off for this device: unsubscribes the browser and removes the
// matching row so the server stops trying to deliver to it.
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return { ok: false, error: 'Push notifications are not supported in this browser.' };

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return { ok: true };

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  if (hasSupabaseConfig) {
    const client = getSupabase();
    if (client) {
      const { error } = await client.from('push_subscriptions').delete().eq('endpoint', endpoint);
      if (error) return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

// Whether this exact browser/device already has an active push
// subscription — used to render the toggle in its correct starting state.
export async function hasActivePushSubscription() {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}
