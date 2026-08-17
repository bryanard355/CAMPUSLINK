// Vercel serverless function. This is the one piece of this otherwise fully
// static app that has to run somewhere other than the browser: sending a
// real Web Push message requires signing it with the VAPID *private* key
// (and sending real email needs a Resend API key), neither of which can
// ever ship to the client.
//
// Supabase's pg_net triggers (see notify_push_webhook() in the DB) call
// this endpoint whenever a row is inserted/updated in a table we care about,
// with a payload shaped like:
//   { type: 'INSERT' | 'UPDATE' | 'DELETE', table, record, old_record, schema }
//
// This function figures out, per table/event, who to notify and with what,
// then fans out to both channels: push (via push_subscriptions) and, for
// events worth an inbox notification, email (via Resend). The two are
// independent — a Resend outage or missing key doesn't stop push from
// working, and vice versa.
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
const WEBHOOK_SECRET = process.env.PUSH_WEBHOOK_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'CampusLink <onboarding@resend.dev>';
const APP_URL = 'https://campuslink-phi-plum.vercel.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function emailHtml(heading, message, url) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 28px 24px; color: #102616;">
      <div style="font-size: 12.5px; font-weight: 700; letter-spacing: 0.5px; color: #1f7a4d; text-transform: uppercase; margin-bottom: 14px;">CampusLink</div>
      <h1 style="font-size: 20px; margin: 0 0 12px; line-height: 1.3;">${heading}</h1>
      <p style="font-size: 14.5px; line-height: 1.6; color: #3a5347; margin: 0 0 26px;">${message}</p>
      <a href="${url}" style="display: inline-block; background: #123626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-size: 14px; font-weight: 700;">Open CampusLink</a>
    </div>
  `;
}

async function sendEmail(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend ${response.status}: ${body}`);
  }
}

// Maps a raw database webhook event to "who gets notified, with what" — or
// null if this particular row change isn't something worth notifying for.
// `email` is only set on events worth an inbox notification too (not every
// push-worthy event needs one — a chat message doesn't, for instance).
// Extending to more tables/events is just another branch here; nothing else
// about the pipeline needs to change.
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
    const menteeName = record.mentee_name || 'A student';
    return {
      userId: record.tutor_id,
      title: 'New mentoring request',
      body: `${menteeName} requested help${record.course ? ` with ${record.course}` : ''}.`,
      url: '/home',
      email: {
        subject: `New mentoring request from ${menteeName}`,
        heading: 'You have a new mentoring request',
        message: `${menteeName} requested your help${record.course ? ` with <strong>${record.course}</strong>` : ''}. Open CampusLink to review and respond.`,
      },
    };
  }

  if (table === 'mentee_requests' && type === 'UPDATE') {
    const prevStatus = old_record?.status;
    const nextStatus = record.status;
    if (prevStatus === nextStatus || (nextStatus !== 'accepted' && nextStatus !== 'declined')) return null;

    const notification = {
      userId: record.mentee_id,
      title: nextStatus === 'accepted' ? 'Your request was accepted' : 'Your request was declined',
      body: record.course ? `For ${record.course}` : 'Check CampusLink for details.',
      url: '/home',
    };
    // Only the acceptance is worth an email — a decline is lower-stakes and
    // still shows up in-app; this can be widened later if that changes.
    if (nextStatus === 'accepted') {
      // The mentee_requests row only has tutor_id, not the tutor's name —
      // resolved by the handler (needs a DB lookup, so it can't happen here).
      notification.email = { subject: 'Your mentor request was accepted!', needsTutorName: true, course: record.course };
    }
    return notification;
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

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({ error: 'Supabase is not configured on the server.' });
    return;
  }

  const notification = buildNotification(req.body);
  if (!notification?.userId) {
    res.status(200).json({ skipped: true });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // --- Push ---
  let pushResult = { sent: 0, failed: 0, skipped: true };
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', String(notification.userId));

    if (error) {
      pushResult = { error: error.message };
    } else {
      const payload = JSON.stringify({ title: notification.title, body: notification.body, url: notification.url });
      const results = await Promise.allSettled(
        (subscriptions || []).map(async (sub) => {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
          } catch (err) {
            // 404/410 means the browser itself dropped this subscription
            // (user cleared site data, uninstalled, etc.) — clean it up so
            // we stop wasting sends on it, rather than erroring on it forever.
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
            throw err;
          }
        })
      );
      pushResult = {
        sent: results.filter((r) => r.status === 'fulfilled').length,
        failed: results.filter((r) => r.status === 'rejected').length,
      };
    }
  }

  // --- Email ---
  let emailResult = { attempted: false };
  if (RESEND_API_KEY && notification.email) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', String(notification.userId))
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);

      if (profile?.email) {
        let { subject, heading, message } = notification.email;
        if (notification.email.needsTutorName) {
          const { data: booking } = await supabase
            .from('bookings')
            .select('tutor_name')
            .eq('id', String(req.body.record.id))
            .maybeSingle();
          const tutorName = booking?.tutor_name || 'Your mentor';
          heading = 'Your request was accepted';
          message = `${tutorName} accepted your mentoring request${notification.email.course ? ` for <strong>${notification.email.course}</strong>` : ''}. Open CampusLink to see the session details.`;
        }
        await sendEmail(profile.email, subject, emailHtml(heading, message, `${APP_URL}${notification.url}`));
        emailResult = { attempted: true, sent: true, to: profile.email };
      } else {
        emailResult = { attempted: true, sent: false, reason: 'no email on profile' };
      }
    } catch (err) {
      emailResult = { attempted: true, sent: false, error: err.message };
    }
  }

  res.status(200).json({ push: pushResult, email: emailResult });
}
