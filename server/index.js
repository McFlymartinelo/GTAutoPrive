import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, tx, audit, getRib, getTemplates, setSetting, UPLOAD_DIR } from './db.js';
import {
  HttpError, hashPassword, verifyPassword, validatePassword, validEmail,
  createSession, destroySession, loadUser, requireAuth, requireAdmin, requireMember, rateLimit,
} from './auth.js';
import { buildState } from './serialize.js';
import { M, S, MAX_MEMBERS, render, charteVars, conventionVars } from '../src/lib/calc.js';

const app = express();
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const DUMMY_HASH = hashPassword('dummy-password-for-timing');

app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
if (process.env.COOKIE_SECURE === '1' && !process.env.TRUST_PROXY) console.warn('TRUST_PROXY non défini derrière HTTPS : le rate-limit verra une seule IP (celle du proxy).');
// Anti-CSRF : une requête qui modifie l'état doit venir de notre origine (en plus de SameSite=Lax).
// Les navigateurs envoient toujours Origin sur un POST/PUT ; son absence = client non navigateur (curl…).
app.use((req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    let host = null;
    try {
      host = new URL(origin).host;
    } catch { /* origine illisible */ }
    if (host !== req.headers.host) return next(new HttpError(403, 'Origine de la requête refusée.'));
  } else if (req.headers['sec-fetch-site'] === 'cross-site') {
    return next(new HttpError(403, 'Origine de la requête refusée.'));
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(loadUser);

// ---------- Uploads ----------
const EXT = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'application/zip': '.zip', 'application/x-zip-compressed': '.zip' };
const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_r, f, cb) => cb(null, uid() + (EXT[f.mimetype] || '.bin')) }),
  limits: { fileSize: 15 * 1024 * 1024, files: 6 },
  fileFilter: (_r, f, cb) => (EXT[f.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Type de fichier non autorisé (PDF, image JPG/PNG/WebP, ZIP).'))),
});
// Vérification des « magic bytes » : le type déclaré par le client n'est jamais cru sur parole.
function sniffOk(file) {
  const b = Buffer.alloc(12);
  const fd = fs.openSync(file.path, 'r');
  fs.readSync(fd, b, 0, 12, 0);
  fs.closeSync(fd);
  const m = file.mimetype;
  if (m === 'application/pdf') return b.subarray(0, 4).toString() === '%PDF';
  if (m === 'image/png') return b[0] === 0x89 && b.subarray(1, 4).toString() === 'PNG';
  if (m === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (m === 'image/webp') return b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP';
  return b[0] === 0x50 && b[1] === 0x4b; // zip
}
const allFiles = (req) => Object.values(req.files || {}).flat();
const cleanup = (req) => allFiles(req).forEach((f) => fs.rm(f.path, { force: true }, () => {}));
const IMG_ONLY = ['image/png', 'image/jpeg', 'image/webp'];
const DOC_OR_IMG = [...IMG_ONLY, 'application/pdf'];

function takeFile(req, field, allowed, meta) {
  const f = req.files?.[field]?.[0];
  if (!f) return null;
  if (!allowed.includes(f.mimetype) || !sniffOk(f)) throw new HttpError(400, `Fichier « ${f.originalname} » invalide pour ce champ.`);
  const id = uid();
  db.prepare('INSERT INTO files (id, member_id, vehicle_id, kind, original_name, stored_name, mime, size, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, meta.memberId || null, meta.vehicleId || null, meta.kind, f.originalname.slice(0, 200), f.filename, f.mimetype, f.size, now());
  return id;
}

// Enveloppe : nettoie les fichiers uploadés si la route échoue.
const h = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    cleanup(req);
    next(e);
  }
};

// ---------- Helpers de validation ----------
const str = (v, name, max = 200) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) throw new HttpError(400, `Champ requis : ${name}.`);
  if (s.length > max) throw new HttpError(400, `Champ trop long : ${name}.`);
  return s;
};
const money = (v, name, { min = 0 } = {}) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) throw new HttpError(400, `Montant invalide : ${name}.`);
  return Math.round(n * 100);
};
const intIn = (v, name, lo, hi) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new HttpError(400, `Valeur invalide : ${name}.`);
  return n;
};
const vehicleRow = (id) => {
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
  if (!v) throw new HttpError(404, 'Véhicule introuvable.');
  return v;
};
const fundedCents = (vid) => db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM pledges WHERE vehicle_id = ?').get(vid).s;
// Forme « front » (euros) d'un véhicule/membre pour réutiliser le moteur de templates partagé.
const vForTpl = (v) => ({ ...v, prixAchat: v.prix_achat / 100, margeVisee: v.marge_visee / 100, pctRoyalties: v.pct_royalties });
const activeMember = (req) => {
  const m = req.user.member;
  if (!m || m.status !== M.ACTIF || !m.charte_signed_at) throw new HttpError(403, 'Charte à signer avant toute opération.');
  return m;
};
const checkSignature = (req) => {
  const { signature, password } = req.body || {};
  if (typeof signature !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > 400_000) throw new HttpError(400, 'Signature manuscrite invalide.');
  const u = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (typeof password !== 'string' || !verifyPassword(password, u.password_hash)) throw new HttpError(403, 'Mot de passe incorrect : signature non validée.');
  return { signature, meta: JSON.stringify({ ip: req.ip, ua: String(req.headers['user-agent'] || '').slice(0, 200), method: 'password-reconfirmation' }) };
};

const api = express.Router();

// ---------- Authentification ----------
const publicUser = (u) => ({ id: u.id, email: u.email, role: u.role, status: u.member?.status || null });

api.post('/auth/login', rateLimit('login', 10, 15 * 60_000), h(async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim();
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const ok = u ? verifyPassword(String(req.body?.password || ''), u.password_hash) : (verifyPassword('x', DUMMY_HASH), false);
  if (!ok) throw new HttpError(401, 'Identifiants incorrects.');
  createSession(res, u.id);
  const member = db.prepare('SELECT * FROM members WHERE user_id = ?').get(u.id) || null;
  audit(u.id, 'login');
  res.json({ user: publicUser({ ...u, member }) });
}));
api.post('/auth/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});
api.get('/auth/me', (req, res) => res.json({ user: req.user ? publicUser(req.user) : null }));

// ---------- Candidature (public) ----------
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => 'GT-' + Array.from({ length: 8 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');

api.post('/requests', rateLimit('request', 10, 3_600_000), h(async (req, res) => {
  const nom = str(req.body?.nom, 'nom', 100);
  const prenom = str(req.body?.prenom, 'prénom', 100);
  const parrain = str(req.body?.parrain, 'parrain', 200);
  const code = newCode();
  db.prepare('INSERT INTO members (id, nom, prenom, parrain, status, dossier_code, created_at) VALUES (?,?,?,?,?,?,?)')
    .run(uid(), nom, prenom, parrain, M.ATT, code, now());
  audit(null, 'request_created', `${prenom} ${nom} / parrain ${parrain}`);
  res.json({ code });
}));

const byCode = (code) => {
  const m = db.prepare('SELECT * FROM members WHERE dossier_code = ?').get(String(code || '').toUpperCase().trim());
  if (!m) throw new HttpError(404, 'Numéro de dossier inconnu.');
  return m;
};
api.post('/requests/status', rateLimit('status', 20, 15 * 60_000), h(async (req, res) => {
  const m = byCode(req.body?.code);
  res.json({ status: m.status, prenom: m.prenom, nom: m.nom, hasAccount: !!m.user_id });
}));

api.post('/requests/complete', rateLimit('complete', 10, 3_600_000), upload.fields([{ name: 'rib', maxCount: 1 }, { name: 'id', maxCount: 1 }, { name: 'domicile', maxCount: 1 }]), h(async (req, res) => {
  const m = byCode(req.body?.code);
  if (m.status !== M.E2 || m.user_id) throw new HttpError(403, 'Ce dossier n’est pas autorisé à passer à l’étape 2.');
  const email = String(req.body.email || '').toLowerCase().trim();
  if (!validEmail(email)) throw new HttpError(400, 'Adresse e-mail invalide.');
  validatePassword(req.body.password);
  const dob = String(req.body.dob || '');
  const d = new Date(dob);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || isNaN(d) || d.getFullYear() < 1900 || (Date.now() - d) / 31557600000 < 18) throw new HttpError(400, 'Date de naissance invalide (18 ans minimum).');
  const lieu = str(req.body.lieu, 'lieu de naissance', 120);
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'Cette adresse e-mail est déjà utilisée.');

  const userId = uid();
  tx(() => {
    const ids = {};
    for (const k of ['rib', 'id', 'domicile']) {
      ids[k] = takeFile(req, k, DOC_OR_IMG, { memberId: m.id, kind: `kyc_${k}` });
      if (!ids[k]) throw new HttpError(400, 'Les 3 pièces (RIB, identité, justificatif de domicile) sont obligatoires.');
    }
    db.prepare('INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?,?,?,?,?)').run(userId, email, hashPassword(req.body.password), 'investor', now());
    db.prepare('UPDATE members SET user_id=?, dob=?, lieu=?, kyc_rib=?, kyc_id=?, kyc_domicile=?, status=? WHERE id=?')
      .run(userId, dob, lieu, ids.rib, ids.id, ids.domicile, M.KYC, m.id);
  });
  audit(userId, 'kyc_submitted', m.id);
  createSession(res, userId);
  res.json({ user: { id: userId, email, role: 'investor', status: M.KYC } });
}));

// ---------- État ----------
api.get('/state', requireAuth, h(async (req, res) => res.json(buildState(req.user))));

// ---------- Fichiers ----------
api.get('/files/:id', requireAuth, h(async (req, res) => {
  const f = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!f) throw new HttpError(404, 'Fichier introuvable.');
  const me = req.user.member;
  let ok = req.user.role === 'admin' || (me && f.member_id === me.id);
  if (!ok && me?.status === M.ACTIF) {
    if (f.kind === 'photo') ok = true;
    else if (f.vehicle_id && ['factures', 'vente'].includes(f.kind)) {
      const v = db.prepare('SELECT status FROM vehicles WHERE id = ?').get(f.vehicle_id);
      ok = v?.status === S.VENDU && !!db.prepare('SELECT 1 FROM pledges WHERE vehicle_id = ? AND member_id = ?').get(f.vehicle_id, me.id);
    }
  }
  if (!ok) throw new HttpError(403, 'Accès refusé.');
  const inline = f.mime !== 'application/zip';
  res.setHeader('Content-Type', f.mime);
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.original_name)}`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.sendFile(path.join(UPLOAD_DIR, f.stored_name));
}));

// ---------- Membre : charte ----------
api.post('/me/charte', requireMember, h(async (req, res) => {
  const m = req.user.member;
  if (m.status !== M.KYC) throw new HttpError(409, 'Charte non signable à ce stade.');
  const { signature, meta } = checkSignature(req);
  const text = render(getTemplates().charte, charteVars({ ...m }));
  tx(() => {
    const num = db.prepare('SELECT COALESCE(MAX(num),0)+1 AS n FROM members').get().n;
    db.prepare('UPDATE members SET status=?, num=?, charte_signed_at=?, charte_signature=?, charte_text=?, charte_meta=? WHERE id=?')
      .run(M.ACTIF, num, now(), signature, text, meta, m.id);
  });
  audit(req.user.id, 'charte_signed');
  res.json({ ok: true });
}));

// ---------- Membre : opérations sur un véhicule ----------
api.post('/vehicles/:id/pledge', requireMember, h(async (req, res) => {
  const m = activeMember(req);
  const asked = money(req.body?.amount, 'montant', { min: 0.01 });
  const result = tx(() => {
    const v = vehicleRow(req.params.id);
    if (v.status !== S.FIN) throw new HttpError(409, 'Ce véhicule n’est plus ouvert aux promesses.');
    const rest = v.prix_achat - fundedCents(v.id);
    const amt = Math.min(asked, rest);
    if (amt <= 0) throw new HttpError(409, 'Financement déjà complet.');
    db.prepare(`INSERT INTO pledges (vehicle_id, member_id, amount) VALUES (?,?,?)
      ON CONFLICT(vehicle_id, member_id) DO UPDATE SET amount = amount + excluded.amount`).run(v.id, m.id, amt);
    const full = fundedCents(v.id) >= v.prix_achat;
    if (full) db.prepare('UPDATE vehicles SET status = ? WHERE id = ?').run(S.F100, v.id);
    return { amount: amt / 100, full };
  });
  audit(req.user.id, 'pledge', `${req.params.id} ${result.amount}`);
  res.json(result);
}));

api.post('/vehicles/:id/sign', requireMember, h(async (req, res) => {
  const m = activeMember(req);
  const v = vehicleRow(req.params.id);
  const p = db.prepare('SELECT * FROM pledges WHERE vehicle_id = ? AND member_id = ?').get(v.id, m.id);
  if (!p || v.status !== S.F100) throw new HttpError(409, 'Convention non signable pour ce véhicule.');
  if (p.contract_signed) throw new HttpError(409, 'Convention déjà signée.');
  const { signature, meta } = checkSignature(req);
  const text = render(getTemplates().convention, conventionVars(m, vForTpl(v), p.amount / 100));
  db.prepare('UPDATE pledges SET contract_signed=1, signed_at=?, signature=?, contract_text=? WHERE vehicle_id=? AND member_id=?').run(now(), signature, text + `\n\n[${meta}]`, v.id, m.id);
  audit(req.user.id, 'convention_signed', v.id);
  res.json({ ok: true });
}));

api.post('/vehicles/:id/declare', requireMember, h(async (req, res) => {
  const m = activeMember(req);
  const v = vehicleRow(req.params.id);
  const p = db.prepare('SELECT * FROM pledges WHERE vehicle_id = ? AND member_id = ?').get(v.id, m.id);
  if (!p || v.status !== S.F100) throw new HttpError(409, 'Opération impossible.');
  if (!p.contract_signed) throw new HttpError(409, 'Signez d’abord la convention.');
  if (p.payment !== 'EN_ATTENTE') throw new HttpError(409, 'Virement déjà déclaré.');
  db.prepare('UPDATE pledges SET payment = ? WHERE vehicle_id = ? AND member_id = ?').run('DECLARE', v.id, m.id);
  audit(req.user.id, 'payment_declared', v.id);
  res.json({ ok: true });
}));

// ---------- Admin ----------
const admin = express.Router();
admin.use(requireAdmin);

admin.post('/members/:id/approve', h(async (req, res) => {
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!m || m.status !== M.ATT) throw new HttpError(409, 'Demande introuvable ou déjà traitée.');
  const taken = db.prepare('SELECT COUNT(*) AS c FROM members WHERE status IN (?,?,?)').get(M.E2, M.KYC, M.ACTIF).c;
  if (taken >= MAX_MEMBERS) throw new HttpError(409, `Limite légale de ${MAX_MEMBERS} membres atteinte.`);
  db.prepare('UPDATE members SET status = ? WHERE id = ?').run(M.E2, m.id);
  audit(req.user.id, 'approve_step1', m.id);
  res.json({ ok: true });
}));
admin.post('/members/:id/refuse', h(async (req, res) => {
  const r = db.prepare('UPDATE members SET status = ? WHERE id = ? AND status = ?').run(M.REFUSE, req.params.id, M.ATT);
  if (!r.changes) throw new HttpError(409, 'Demande introuvable ou déjà traitée.');
  audit(req.user.id, 'refuse_step1', req.params.id);
  res.json({ ok: true });
}));

admin.post('/vehicles', upload.fields([0, 1, 2].map((i) => ({ name: `photo${i}`, maxCount: 1 }))), h(async (req, res) => {
  const b = req.body || {};
  const data = {
    marque: str(b.marque, 'marque', 60), modele: str(b.modele, 'modèle', 60), finition: str(b.finition, 'finition', 80), motorisation: str(b.motorisation, 'motorisation', 80),
    annee: intIn(b.annee, 'année', 1950, 2100), km: intIn(b.km, 'kilométrage', 0, 2_000_000),
    prix: money(b.prixAchat, 'prix d’achat', { min: 1 }), marge: money(b.margeVisee, 'marge visée'),
    pct: Number(b.pctRoyalties), infos: String(b.infos || '').slice(0, 5000),
  };
  if (!(data.pct >= 0 && data.pct <= 100)) throw new HttpError(400, 'Pourcentage de royalties invalide (0–100).');
  const id = tx(() => {
    const n = db.prepare('SELECT COUNT(*) AS c FROM vehicles').get().c + 1;
    const vid = `V${String(n).padStart(3, '0')}`;
    const photos = [0, 1, 2].map((i) => {
      const fid = takeFile(req, `photo${i}`, IMG_ONLY, { vehicleId: vid, kind: 'photo' });
      if (fid) return `/api/files/${fid}`;
      const url = String(b[`photo${i}`] || '').trim();
      if (/^https?:\/\/\S{1,1000}$/.test(url) || (url.startsWith('data:image/svg+xml,') && url.length < 30_000)) return url;
      return '';
    });
    db.prepare(`INSERT INTO vehicles (id, marque, modele, finition, motorisation, annee, km, photos, prix_achat, marge_visee, pct_royalties, infos, status, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(vid, data.marque, data.modele, data.finition, data.motorisation, data.annee, data.km, JSON.stringify(photos), data.prix, data.marge, data.pct, data.infos, S.FIN, now());
    return vid;
  });
  audit(req.user.id, 'vehicle_created', id);
  res.json({ id });
}));

admin.post('/vehicles/:id/confirm/:mid', h(async (req, res) => {
  const v = vehicleRow(req.params.id);
  if (v.status !== S.F100) throw new HttpError(409, 'Le véhicule n’est pas en attente de paiements.');
  const p = db.prepare('SELECT * FROM pledges WHERE vehicle_id = ? AND member_id = ?').get(v.id, req.params.mid);
  if (!p) throw new HttpError(404, 'Promesse introuvable.');
  if (!p.contract_signed) throw new HttpError(409, 'La convention de cet investisseur n’est pas signée : réception non confirmable.');
  if (p.payment === 'RECU') throw new HttpError(409, 'Réception déjà confirmée.');
  db.prepare('UPDATE pledges SET payment = ? WHERE vehicle_id = ? AND member_id = ?').run('RECU', v.id, p.member_id);
  audit(req.user.id, 'payment_confirmed', `${v.id} ${req.params.mid}`);
  res.json({ ok: true });
}));

// Annule une confirmation faite par erreur (tant que le véhicule n'est pas commercialisé).
admin.post('/vehicles/:id/unconfirm/:mid', h(async (req, res) => {
  const v = vehicleRow(req.params.id);
  if (v.status !== S.F100) throw new HttpError(409, 'Annulation impossible : le véhicule n’est plus en attente de paiements.');
  const r = db.prepare('UPDATE pledges SET payment = ? WHERE vehicle_id = ? AND member_id = ? AND payment = ?').run('DECLARE', v.id, req.params.mid, 'RECU');
  if (!r.changes) throw new HttpError(409, 'Aucune réception à annuler pour cet investisseur.');
  audit(req.user.id, 'payment_unconfirmed', `${v.id} ${req.params.mid}`);
  res.json({ ok: true });
}));

// Modification d'un véhicule à tout moment. Les champs descriptifs sont toujours modifiables ; les champs
// financiers sont verrouillés dès qu'ils ont servi de base à des engagements (promesses, conventions signées).
admin.patch('/vehicles/:id', upload.fields([0, 1, 2].map((i) => ({ name: `photo${i}`, maxCount: 1 }))), h(async (req, res) => {
  const v = vehicleRow(req.params.id);
  const b = req.body || {};
  const given = (k) => b[k] !== undefined && String(b[k]).trim() !== '';
  const set = {};
  const diff = (col, val) => {
    if (val !== v[col]) set[col] = val;
  };
  for (const [k, max] of [['marque', 60], ['modele', 60], ['finition', 80], ['motorisation', 80]]) if (given(k)) diff(k, str(b[k], k, max));
  if (given('annee')) diff('annee', intIn(b.annee, 'année', 1950, 2100));
  if (given('km')) diff('km', intIn(b.km, 'kilométrage', 0, 2_000_000));
  if (b.infos !== undefined) diff('infos', String(b.infos).slice(0, 5000));

  const nPledges = db.prepare('SELECT COUNT(*) AS c FROM pledges WHERE vehicle_id = ?').get(v.id).c;
  const nSigned = db.prepare('SELECT COUNT(*) AS c FROM pledges WHERE vehicle_id = ? AND contract_signed = 1').get(v.id).c;
  if (given('prixAchat')) {
    const c = money(b.prixAchat, 'prix d’achat', { min: 1 });
    if (c !== v.prix_achat) {
      if (nPledges) throw new HttpError(409, 'Prix d’achat verrouillé : des promesses d’investissement existent déjà.');
      set.prix_achat = c;
    }
  }
  if (given('margeVisee')) {
    const c = money(b.margeVisee, 'marge visée');
    if (c !== v.marge_visee) {
      if (nSigned) throw new HttpError(409, 'Marge visée verrouillée : des conventions mentionnant cette marge sont déjà signées.');
      set.marge_visee = c;
    }
  }
  if (given('pctRoyalties')) {
    const pct = Number(b.pctRoyalties);
    if (!(pct >= 0 && pct <= 100)) throw new HttpError(400, 'Pourcentage de royalties invalide (0–100).');
    if (pct !== v.pct_royalties) {
      if (nSigned) throw new HttpError(409, 'Pourcentage de royalties verrouillé : des conventions sont déjà signées.');
      set.pct_royalties = pct;
    }
  }

  const photos = JSON.parse(v.photos);
  let photosChanged = false;
  tx(() => {
    [0, 1, 2].forEach((i) => {
      const fid = takeFile(req, `photo${i}`, IMG_ONLY, { vehicleId: v.id, kind: 'photo' });
      if (fid) {
        photos[i] = `/api/files/${fid}`;
        photosChanged = true;
      } else if (given(`photo${i}`)) {
        const url = String(b[`photo${i}`]).trim();
        if (!(/^https?:\/\/\S{1,1000}$/.test(url) || (url.startsWith('data:image/svg+xml,') && url.length < 30_000))) throw new HttpError(400, `Adresse de la photo ${i + 1} invalide.`);
        if (url !== photos[i]) {
          photos[i] = url;
          photosChanged = true;
        }
      }
    });
    if (photosChanged) set.photos = JSON.stringify(photos);
    const cols = Object.keys(set);
    if (cols.length) db.prepare(`UPDATE vehicles SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map((c) => set[c]), v.id);
  });
  const changed = Object.keys(set);
  if (changed.length) audit(req.user.id, 'vehicle_updated', `${v.id}: ${changed.join(', ')}`);
  res.json({ ok: true, changed });
}));

// Journal d'audit (lecture seule). Les identifiants de membres sont remplacés par des noms lisibles.
admin.get('/audit', h(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const action = typeof req.query.action === 'string' && req.query.action ? req.query.action : null;
  const names = new Map(db.prepare('SELECT id, prenom, nom FROM members').all().map((m) => [m.id, `${m.prenom} ${m.nom}`]));
  const readable = (d) => String(d || '').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, (id) => names.get(id) || id);
  const rows = db.prepare(`SELECT a.id, a.ts, a.action, a.detail, u.email FROM audit a LEFT JOIN users u ON u.id = a.user_id
    WHERE (? IS NULL OR a.action = ?) ORDER BY a.id DESC LIMIT ? OFFSET ?`).all(action, action, limit + 1, offset);
  const actions = db.prepare('SELECT DISTINCT action FROM audit ORDER BY action').all().map((r) => r.action);
  res.json({ entries: rows.slice(0, limit).map((r) => ({ id: r.id, ts: r.ts, action: r.action, email: r.email, detail: readable(r.detail) })), hasMore: rows.length > limit, actions });
}));

admin.post('/vehicles/:id/commercialiser', h(async (req, res) => {
  const v = vehicleRow(req.params.id);
  if (v.status !== S.F100) throw new HttpError(409, 'Statut incompatible.');
  const vente = money(req.body?.valeurVente, 'valeur de vente', { min: 1 });
  const ps = db.prepare('SELECT * FROM pledges WHERE vehicle_id = ?').all(v.id);
  if (!ps.length || !ps.every((p) => p.contract_signed && p.payment === 'RECU')) throw new HttpError(409, 'Toutes les conventions doivent être signées et tous les virements reçus.');
  db.prepare('UPDATE vehicles SET status=?, valeur_vente=?, date_com=? WHERE id=?').run(S.COM, vente, now(), v.id);
  audit(req.user.id, 'commercialise', v.id);
  res.json({ ok: true });
}));

admin.post('/vehicles/:id/close', upload.fields([{ name: 'factures', maxCount: 1 }, { name: 'vente', maxCount: 1 }]), h(async (req, res) => {
  const v = vehicleRow(req.params.id);
  if (v.status !== S.COM) throw new HttpError(409, 'Seul un véhicule commercialisé peut être clôturé.');
  const prix = money(req.body?.prixVenteReel, 'prix de vente réel', { min: 1 });
  const marge = money(req.body?.margeFinale, 'marge finale', { min: 0 });
  tx(() => {
    const fact = takeFile(req, 'factures', [...DOC_OR_IMG, 'application/zip', 'application/x-zip-compressed'], { vehicleId: v.id, kind: 'factures' });
    const vente = takeFile(req, 'vente', DOC_OR_IMG, { vehicleId: v.id, kind: 'vente' });
    if (!fact || !vente) throw new HttpError(400, 'Les deux justificatifs (factures de dépenses, facture de vente) sont obligatoires.');
    const jours = Math.max(1, Math.round((Date.now() - new Date(v.date_com)) / 86_400_000));
    db.prepare('UPDATE vehicles SET status=?, prix_vente_reel=?, marge_finale=?, jours_rotation=?, doc_factures=?, doc_vente=? WHERE id=?')
      .run(S.VENDU, prix, marge, jours, fact, vente, v.id);
  });
  audit(req.user.id, 'vehicle_closed', v.id);
  res.json({ ok: true });
}));

admin.put('/rib', h(async (req, res) => {
  const b = req.body || {};
  const rib = { titulaire: str(b.titulaire, 'titulaire', 120), banque: str(b.banque, 'banque', 120), iban: str(b.iban, 'IBAN', 40), bic: str(b.bic, 'BIC', 20) };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9 ]{10,32}$/i.test(rib.iban)) throw new HttpError(400, 'IBAN invalide.');
  setSetting('rib', rib);
  audit(req.user.id, 'rib_updated');
  res.json({ ok: true });
}));
admin.put('/templates/:key', h(async (req, res) => {
  if (!['charte', 'convention'].includes(req.params.key)) throw new HttpError(404, 'Modèle inconnu.');
  setSetting(`tpl_${req.params.key}`, str(req.body?.text, 'texte', 60_000));
  audit(req.user.id, 'template_updated', req.params.key);
  res.json({ ok: true });
}));

api.use('/admin', admin);
api.use((_req, _res, next) => next(new HttpError(404, 'Route inconnue.')));
app.use('/api', api);

// ---------- Front compilé (production) ----------
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
}

// ---------- Erreurs ----------
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux (15 Mo max).' : 'Envoi de fichier invalide.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Requête invalide.' });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (/UNIQUE constraint/.test(String(err.message))) return res.status(409).json({ error: 'Conflit : donnée déjà existante.' });
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => console.log(`GT Auto Privé — API sur http://localhost:${PORT}`));
