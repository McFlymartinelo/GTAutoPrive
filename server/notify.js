// Notifications in-app : une ligne par destinataire (compte users.id).
import crypto from 'node:crypto';
import { db } from './db.js';
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
