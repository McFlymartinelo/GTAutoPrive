// Notifications in-app + push navigateur : une ligne par destinataire (compte users.id).
import crypto from 'node:crypto';
import webpush from 'web-push';
import { db, getSetting, setSetting, onCommit } from './db.js';
import { M } from '../src/lib/calc.js';

const insert = db.prepare(
  'INSERT INTO notifications (id, user_id, type, title, body, link, created_at) VALUES (?,?,?,?,?,?,?)',
);

export function notifyUsers(userIds, { type, title, body, link = null }) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  const linkJson = link ? JSON.stringify(link) : null;
  const created = new Date().toISOString();
  for (const userId of ids) insert.run(crypto.randomUUID(), userId, type, title, body, linkJson, created);
  onCommit(() => deliverPush(ids, { title, body, link }));
}

function linkToUrl(link) {
  if (!link) return '/';
  const q = new URLSearchParams();
  if (link.kind === 'vehicle' && link.id) {
    q.set('open', 'vehicle');
    q.set('id', link.id);
  } else if (link.kind === 'admin') {
    q.set('open', 'admin');
    if (link.tab) q.set('tab', link.tab);
    if (link.vid) q.set('vid', link.vid);
  }
  const s = q.toString();
  return s ? `/?${s}` : '/';
}

let vapidPublic = null;
export function vapidPublicKey() {
  if (vapidPublic) return vapidPublic;
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    const saved = getSetting('vapid', null);
    if (saved?.publicKey && saved?.privateKey) {
      publicKey = saved.publicKey;
      privateKey = saved.privateKey;
    } else {
      const keys = webpush.generateVAPIDKeys();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;
      setSetting('vapid', { publicKey, privateKey });
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:club@gt-auto-prive.local', publicKey, privateKey);
  vapidPublic = publicKey;
  return publicKey;
}

async function deliverPush(userIds, { title, body, link }) {
  if (!userIds.length) return;
  vapidPublicKey();
  const subs = db.prepare(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN (${userIds.map(() => '?').join(',')})`,
  ).all(...userIds);
  const payload = JSON.stringify({ title, body, link, url: linkToUrl(link) });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
      else console.error('push', err.statusCode || err.message);
    }
  }
}

export const activeMemberUserIds = () =>
  db.prepare('SELECT user_id FROM members WHERE status = ? AND user_id IS NOT NULL').all(M.ACTIF).map((r) => r.user_id);

export const adminUserIds = (except) =>
  db.prepare("SELECT id FROM users WHERE role = 'admin'").all().map((r) => r.id).filter((id) => id !== except);

export const participantUserIds = (vehicleId) =>
  db.prepare(`SELECT m.user_id FROM pledges p JOIN members m ON m.id = p.member_id
    WHERE p.vehicle_id = ? AND m.user_id IS NOT NULL`).all(vehicleId).map((r) => r.user_id);

export const memberUserId = (memberId) =>
  db.prepare('SELECT user_id FROM members WHERE id = ?').get(memberId)?.user_id || null;
