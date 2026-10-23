// Calculs financiers et helpers — source unique de vérité pour simulateur, dashboard et clôture admin.
export const FLAT_TAX = 0.3;
export const MAX_MEMBERS = 149;
// Délai pour virer les fonds une fois le financement validé à 100 %.
export const PLEDGE_PAY_DELAY = '7 jours';

// Statuts
export const S = {
  FIN: 'EN_COURS_FINANCEMENT',
  F100: 'FINANCE_100_ATTENTE_PAIEMENT',
  COM: 'COMMERCIALISE',
  VENDU: 'VENDU',
};
export const M = {
  ATT: 'EN_ATTENTE_VALIDATION_ADMIN',
  E2: 'ETAPE2_AUTORISEE',
  KYC: 'KYC_SOUMIS',
  ACTIF: 'ACTIF',
  REFUSE: 'REFUSE',
};

export const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const fmt = (d) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d });
const f2 = fmt(2);
const f0 = fmt(0);
const nb = (s) => s.replace(/ /g, ' ');
export const eur = (n) => nb(f2.format(n || 0));
// Montants ronds (prix) sans décimales, sinon repli sur 2 décimales pour rester exact.
export const eur0 = (n) => nb(Number.isInteger(n || 0) ? f0.format(n || 0) : f2.format(n));
export const pct = (n, d = 1) => nb(`${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d }).format(n || 0)} %`);
export const num = (n) => nb(new Intl.NumberFormat('fr-FR').format(n || 0));
export const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export const slug = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

// Cœur du calcul : identique pour la simulation (marge visée) et la clôture (marge finale).
export function simulate({ invested, prixAchat, marge, pctRoyalties }) {
  const quotePart = prixAchat ? (invested / prixAchat) * 100 : 0;
  const pool = r2((marge * pctRoyalties) / 100);
  const brut = r2((pool * invested) / (prixAchat || 1));
  const flatTax = r2(brut * FLAT_TAX);
  const net = r2(brut - flatTax);
  const total = r2(invested + net);
  const roi = invested ? (net / invested) * 100 : 0;
  return { quotePart, pool, brut, flatTax, net, total, roi };
}

export const funded = (v) => r2(v.pledges.reduce((s, p) => s + p.amount, 0));
export const remaining = (v) => Math.max(0, r2(v.prixAchat - funded(v)));
export const progress = (v) => (v.prixAchat ? Math.min(100, (funded(v) / v.prixAchat) * 100) : 0);
export const pledgeOf = (v, uid) => v.pledges.find((p) => p.uid === uid);
export const poolOf = (v, marge) => r2((marge * v.pctRoyalties) / 100);

// Tableau de reversement à la clôture (marge finale réalisée).
export function repartition(v, marge = v.margeFinale || 0) {
  return v.pledges.map((p) => ({
    uid: p.uid,
    capital: p.amount,
    ...simulate({ invested: p.amount, prixAchat: v.prixAchat, marge, pctRoyalties: v.pctRoyalties }),
  }));
}

export const refVirement = (v, member) => `ROY-${v.id}-${slug(member?.nom)}`;

export const render = (tpl, vars) => (tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? `{{${k}}}`));

export function charteVars(m) {
  return {
    nom: m.nom,
    prenom: m.prenom,
    nom_investisseur: m.nom,
    prenom_investisseur: m.prenom,
    date_naissance: m.dob ? dateFr(m.dob) : '[date de naissance]',
    lieu_naissance: m.lieu || '[lieu de naissance]',
    date_du_jour: new Date().toLocaleDateString('fr-FR'),
  };
}

export function conventionVars(m, v, amount) {
  const quote = v.prixAchat ? (amount / v.prixAchat) * 100 : 0;
  return {
    ...charteVars(m),
    marque: v.marque,
    modele: v.modele,
    finition: v.finition,
    motorisation: v.motorisation,
    annee: String(v.annee),
    kilometrage: `${num(v.km)} km`,
    prix_achat: eur0(v.prixAchat),
    montant_investi: eur(amount),
    quote_part_pourcentage: pct(quote, 2),
    pourcentage_royalties: pct(v.pctRoyalties, 1),
    marge_visee_ht: eur0(v.margeVisee),
  };
}

export function clubStats(state) {
  const { vehicles, members } = state;
  const sold = vehicles.filter((v) => v.status === S.VENDU);
  const financed = vehicles.filter((v) => v.status !== S.FIN);
  const rentab = sold.length ? sold.reduce((s, v) => s + (v.margeFinale / v.prixAchat) * 100, 0) / sold.length : 0;
  const rotation = sold.length ? sold.reduce((s, v) => s + (v.joursRotation || 0), 0) / sold.length : 0;
  return {
    // Démo : 40 membres historiques + membres actifs présents dans la base de démonstration.
    membres: (state.memberOffset ?? 40) + members.filter((m) => m.status === M.ACTIF).length,
    volume: financed.reduce((s, v) => s + v.prixAchat, 0),
    royalties: sold.reduce((s, v) => s + poolOf(v, v.margeFinale), 0),
    rentab,
    rotation,
    nbFin: vehicles.filter((v) => v.status === S.FIN || v.status === S.F100).length,
    nbCom: vehicles.filter((v) => v.status === S.COM).length,
    nbVendu: sold.length,
  };
}
