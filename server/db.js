// Base SQLite (module natif node:sqlite, Node >= 22.5). Montants stockés en CENTIMES (entiers).
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { CHARTE_TPL, CONVENTION_TPL } from '../src/data/templates.js';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'club.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','investor')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  parrain TEXT NOT NULL,
  status TEXT NOT NULL,
  dossier_code TEXT NOT NULL UNIQUE,
  dob TEXT, lieu TEXT,
  num INTEGER UNIQUE,
  kyc_rib TEXT, kyc_id TEXT, kyc_domicile TEXT,
  charte_signed_at TEXT, charte_signature TEXT, charte_text TEXT, charte_meta TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  member_id TEXT, vehicle_id TEXT,
  kind TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  marque TEXT NOT NULL, modele TEXT NOT NULL, finition TEXT NOT NULL, motorisation TEXT NOT NULL,
  annee INTEGER NOT NULL, km INTEGER NOT NULL,
  photos TEXT NOT NULL DEFAULT '[]',
  prix_achat INTEGER NOT NULL, marge_visee INTEGER NOT NULL, pct_royalties REAL NOT NULL,
  infos TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  valeur_vente INTEGER, prix_vente_reel INTEGER, marge_finale INTEGER,
  jours_rotation INTEGER, date_com TEXT,
  doc_factures TEXT, doc_vente TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pledges (
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  amount INTEGER NOT NULL,
  contract_signed INTEGER NOT NULL DEFAULT 0,
  signed_at TEXT, signature TEXT, contract_text TEXT,
  payment TEXT NOT NULL DEFAULT 'EN_ATTENTE',
  PRIMARY KEY (vehicle_id, member_id)
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL, user_id TEXT, action TEXT NOT NULL, detail TEXT
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at);
`);

export const getSetting = (key, fallback) => {
  const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return r ? JSON.parse(r.value) : fallback;
};
export const setSetting = (key, value) =>
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value));

export const DEFAULT_RIB = { titulaire: '', banque: '', iban: '', bic: '' };
export const getRib = () => getSetting('rib', DEFAULT_RIB);
export const getTemplates = () => ({
  charte: getSetting('tpl_charte', CHARTE_TPL),
  convention: getSetting('tpl_convention', CONVENTION_TPL),
});

export const audit = (userId, action, detail = '') =>
  db.prepare('INSERT INTO audit (ts, user_id, action, detail) VALUES (?, ?, ?, ?)').run(new Date().toISOString(), userId, action, String(detail).slice(0, 500));

export function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
