import crypto from 'node:crypto';
import { db } from './db.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// --- Mots de passe : scrypt + sel aléatoire ---
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}
export function verifyPassword(pw, stored) {
  const [alg, salt, hash] = String(stored).split(':');
  if (alg !== 'scrypt') return false;
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(pw, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const validatePassword = (pw) => {
  if (typeof pw !== 'string' || pw.length < 10) throw new HttpError(400, 'Le mot de passe doit contenir au moins 10 caractères.');
  if (pw.length > 200) throw new HttpError(400, 'Mot de passe trop long.');
};
export const validEmail = (e) => typeof e === 'string' && e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// --- Sessions : jeton aléatoire en cookie httpOnly, seule l'empreinte SHA-256 est stockée ---
const COOKIE = 'gt_session';
const TTL = 7 * 24 * 3600 * 1000;
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

export function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha(token), userId, Date.now() + TTL);
  const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TTL / 1000}${secure}`);
}
export function destroySession(req, res) {
  const t = readCookie(req);
  if (t) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(t));
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}
function readCookie(req) {
  const m = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  return m ? m.slice(COOKIE.length + 1) : null;
}

// Charge req.user = { id, email, role, member } si la session est valide.
export function loadUser(req, _res, next) {
  const t = readCookie(req);
  if (t) {
    const row = db
      .prepare('SELECT u.id, u.email, u.role, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?')
      .get(sha(t));
    if (row && row.expires_at > Date.now()) {
      const member = db.prepare('SELECT * FROM members WHERE user_id = ?').get(row.id) || null;
      req.user = { id: row.id, email: row.email, role: row.role, member };
    } else if (row) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(t));
  }
  next();
}

export const requireAuth = (req, _res, next) => (req.user ? next() : next(new HttpError(401, 'Authentification requise.')));
export const requireAdmin = (req, _res, next) => (req.user?.role === 'admin' ? next() : next(new HttpError(req.user ? 403 : 401, 'Accès réservé à l’administrateur.')));
export const requireMember = (req, _res, next) => (req.user?.member ? next() : next(new HttpError(403, 'Accès réservé aux membres.')));

// --- Limiteur de débit en mémoire (anti brute-force) ---
const hits = new Map();
const WINDOWS = new Map(); // name -> windowMs, pour purger les entrées expirées
setInterval(() => {
  const now = Date.now();
  for (const [key, arr] of hits) {
    const win = WINDOWS.get(key.split(':')[0]) || 0;
    if (!arr.length || now - arr[arr.length - 1] >= win) hits.delete(key);
  }
}, 60_000).unref();
export const rateLimit = (name, max, windowMs) => {
  WINDOWS.set(name, windowMs);
  return (req, _res, next) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return next(new HttpError(429, 'Trop de tentatives, réessayez plus tard.'));
    arr.push(now);
    hits.set(key, arr);
    next();
  };
};
