// Vercel serverless function. This is the one piece of this otherwise fully
// static app that has to run somewhere other than the browser: sending a
// real Web Push message requires signing it with the VAPID *private* key,
// which can never be shipped to the client.
//
// Supabase Database Webhooks call this endpoint whenever a row is
// inserted/updated in a table we care about (see the setup instructions
// given alongside this file) with a payload shaped like:
//   { type: 'INSERT' | 'UPDATE' | 'DELETE', table, record, old_record, schema }
//
// This function figures out, per table/event, who to notify and with what,
// looks up that user's registered devices in push_subscriptions, and sends
// each one a push via web-push.
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
const WEBHOOK_SECRET = process.env.PUSH_WEBHOOK_SECRET;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Maps a raw database webhook event to "who gets notified, with what" — or
// null if this particular row change isn't something worth a push for.
// Extending to more tables/events (bookings, etc.) is just another branch
// here; nothing else about the pipeline needs to change.
function buildNotification(payload) {
  const { type, table, record, old_record } = payload || {};
  if (!record) return null;

  if (table === 'chat_messages' && type === 'INSERT') {
    return {
      userId: record.recipient_id,
      title: record.sender_name || 'New message',
      body: record.text ? String(record.text).slice(0, 140) : 'You have a new message.',
      url: '/home',
    };
  }

  if (table === 'mentee_requests' && type === 'INSERT') {
    return {
      userId: record.tutor_id,
      title: 'New mentoring request',
      body: `${record.mentee_name || 'A student'} requested help${record.course ? ` with ${record.course}` : ''}.`,
      url: '/home',
    };
  }

  if (table === 'mentee_requests' && type === 'UPDATE') {
    const prevStatus = old_record?.status;
    const nextStatus = record.status;
    if (prevStatus !== nextStatus && (nextStatus === 'accepted' || nextStatus === 'declined')) {
      return {
        userId: record.mentee_id,
        title: nextStatus === 'accepted' ? 'Your request was accepted' : 'Your request was declined',
        body: record.course ? `For ${record.course}` : 'Check CampusLink for details.',
        url: '/home',
      };
    }
    return null;
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!WEBHOOK_SECRET || req.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT || !SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({ error: 'Push notifications are not fully configured on the server.' });
    return;
  }

  const notification = buildNotification(req.body);
  if (!notification?.userId) {
    res.status(200).json({ skipped: true });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', String(notification.userId));

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const payload = JSON.stringify({ title: notification.title, body: notification.body, url: notification.url });

  const results = await Promise.allSettled(
    (subscriptions || []).map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      } catch (err) {
        // 404/410 means the browser itself dropped this subscription (user
        // cleared site data, uninstalled, etc.) — clean it up so we stop
        // wasting sends on it, rather than erroring on it forever.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
        throw err;
      }
    })
  );

  res.status(200).json({
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  });
}
