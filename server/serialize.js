// Construit l'état renvoyé au front, filtré selon le rôle (un investisseur ne voit jamais les données d'un autre).
import { db, getRib, getTemplates } from './db.js';
import { M, S } from '../src/lib/calc.js';

const eur = (c) => (c == null ? null : c / 100);
const fileName = (id) => (id ? db.prepare('SELECT original_name FROM files WHERE id = ?').get(id)?.original_name : null);
const doc = (id) => (id ? { name: fileName(id), url: `/api/files/${id}` } : null);

export function memberOut(m, { admin = false } = {}) {
  const out = {
    id: m.id,
    num: m.num,
    prenom: m.prenom,
    nom: m.nom,
    parrain: m.parrain,
    status: m.status,
    dob: m.dob,
    lieu: m.lieu,
    email: null,
    createdAt: m.created_at,
    charte: m.charte_signed_at ? { date: m.charte_signed_at } : null,
    kyc: { rib: fileName(m.kyc_rib), id: fileName(m.kyc_id), domicile: fileName(m.kyc_domicile) },
  };
  if (admin) {
    out.kycUrl = { rib: m.kyc_rib && `/api/files/${m.kyc_rib}`, id: m.kyc_id && `/api/files/${m.kyc_id}`, domicile: m.kyc_domicile && `/api/files/${m.kyc_domicile}` };
    if (m.user_id) out.email = db.prepare('SELECT email FROM users WHERE id = ?').get(m.user_id)?.email;
  }
  return out;
}

function vehicleOut(v, user) {
  const admin = user.role === 'admin';
  const myId = user.member?.id;
  const rows = db.prepare('SELECT * FROM pledges WHERE vehicle_id = ? ORDER BY rowid').all(v.id);
  const mine = rows.some((p) => p.member_id === myId);
  const pledges = rows.map((p) => {
    const own = admin || p.member_id === myId;
    return {
      uid: p.member_id,
      amount: eur(p.amount),
      // Les statuts de contrat/paiement des autres investisseurs ne sont pas exposés.
      contractSigned: own ? !!p.contract_signed : false,
      signedAt: own ? p.signed_at : null,
      payment: own ? p.payment : 'EN_ATTENTE',
    };
  });
  const showDocs = v.status === S.VENDU && (admin || mine);
  return {
    id: v.id, marque: v.marque, modele: v.modele, finition: v.finition, motorisation: v.motorisation,
    annee: v.annee, km: v.km, photos: JSON.parse(v.photos), prixAchat: eur(v.prix_achat), margeVisee: eur(v.marge_visee),
    pctRoyalties: v.pct_royalties, infos: v.infos, status: v.status, valeurVente: eur(v.valeur_vente),
    prixVenteReel: eur(v.prix_vente_reel), margeFinale: eur(v.marge_finale), joursRotation: v.jours_rotation, dateCom: v.date_com,
    docs: showDocs ? { factures: doc(v.doc_factures), vente: doc(v.doc_vente) } : undefined,
    pledges,
  };
}

export function buildState(user) {
  const admin = user.role === 'admin';
  const me = user.member;
  const vehicles = me?.status === M.ACTIF || admin
    ? db.prepare('SELECT * FROM vehicles ORDER BY created_at DESC, id DESC').all().map((v) => vehicleOut(v, user))
    : [];
  const notifRows = db.prepare(`SELECT id, type, title, body, link, read_at, created_at FROM notifications
    WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 40`).all(user.id);
  const unread = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL').get(user.id).c;
  const notifications = notifRows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    link: r.link ? JSON.parse(r.link) : null,
    read: !!r.read_at,
    createdAt: r.created_at,
  }));
  const base = { live: true, memberOffset: 0, vehicles, templates: getTemplates(), notifications, unread };

  if (admin) {
    const members = db.prepare('SELECT * FROM members ORDER BY created_at').all().map((m) => memberOut(m, { admin: true }));
    return { ...base, me: { id: 'admin', role: 'admin', email: user.email, prenom: 'Admin', nom: '' }, members, rib: getRib() };
  }

  const actives = db.prepare('SELECT id, num FROM members WHERE status = ?').all(M.ACTIF).map((m) => ({ id: m.id, num: m.num, status: M.ACTIF }));
  const mine = { ...memberOut(me), email: user.email, role: 'investor' };
  return {
    ...base,
    me: mine,
    members: actives,
    // Le RIB n'est communiqué qu'aux membres actifs (appel de fonds).
    rib: me.status === M.ACTIF ? getRib() : { titulaire: '', banque: '', iban: '', bic: '' },
  };
}
