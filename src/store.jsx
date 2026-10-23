import { createContext, useContext, useReducer, useMemo } from 'react';
import { seedState } from './data/seed.js';
import { S, M, funded, r2, remaining, eur } from './lib/calc.js';

export const Ctx = createContext(null);

const toast = (s, msg, kind = 'ok') => ({ ...s, toast: { id: Date.now() + Math.random(), msg, kind } });
const setVeh = (s, id, fn) => ({ ...s, vehicles: s.vehicles.map((v) => (v.id === id ? fn(v) : v)) });
const setMem = (s, id, fn) => ({ ...s, members: s.members.map((m) => (m.id === id ? fn(m) : m)) });
const setPledge = (v, uid, patch) => ({ ...v, pledges: v.pledges.map((p) => (p.uid === uid ? { ...p, ...patch } : p)) });

function reducer(s, a) {
  switch (a.type) {
    case 'VIEW':
      return { ...s, view: a.view, route: a.view === 'client' ? { name: 'showroom' } : s.route };
    case 'ROUTE':
      return { ...s, route: a.route };
    case 'NOTIFY':
      return toast(s, a.msg, a.kind);
    case 'RESET':
      return { ...seedState(), view: s.view };
    case 'SET_USER':
      return { ...s, activeUserId: a.id, route: { name: 'showroom' } };

    // --- Inscription ---
    case 'SUBMIT_REQUEST': {
      const id = `m${Date.now()}`;
      const m = { id, prenom: a.prenom, nom: a.nom, parrain: a.parrain, status: M.ATT, createdAt: new Date().toISOString() };
      return { ...s, members: [...s.members, m], candidateId: id };
    }
    case 'APPROVE_STEP1':
      return toast(setMem(s, a.id, (m) => ({ ...m, status: M.E2 })), 'Accès à l’étape 2 autorisé.');
    case 'REFUSE':
      return toast(setMem(s, a.id, (m) => ({ ...m, status: M.REFUSE })), 'Demande refusée.', 'warn');
    case 'SUBMIT_KYC':
      return toast(setMem(s, a.id, (m) => ({ ...m, ...a.data, status: M.KYC })), 'KYC transmis. Place à la signature de la charte.');
    case 'SIGN_CHARTE': {
      const next = setMem(s, a.id, (m) => ({ ...m, charte: a.signature, status: M.ACTIF, num: m.num || 50 + s.members.filter((x) => x.status === M.ACTIF).length }));
      return toast(next, 'Charte signée — bienvenue au Club !');
    }

    // --- Financement ---
    case 'ADD_PLEDGE': {
      const v = s.vehicles.find((x) => x.id === a.vid);
      if (!v || v.status !== S.FIN) return s;
      const amt = r2(Math.min(a.amount, remaining(v)));
      if (!(amt > 0)) return s;
      const exists = v.pledges.some((p) => p.uid === a.uid);
      const pledges = exists
        ? v.pledges.map((p) => (p.uid === a.uid ? { ...p, amount: r2(p.amount + amt) } : p))
        : [...v.pledges, { uid: a.uid, amount: amt, contractSigned: false, signedAt: null, payment: 'EN_ATTENTE' }];
      const nv = { ...v, pledges };
      const full = funded(nv) >= v.prixAchat;
      if (full) nv.status = S.F100;
      const next = { ...s, vehicles: s.vehicles.map((x) => (x.id === v.id ? nv : x)) };
      return toast(
        next,
        full
          ? `⚡ Objectif 100 % atteint pour ${v.marque} ${v.modele} ! Convention à signer et virement à effectuer.`
          : `Promesse de ${eur(amt)} enregistrée.`,
      );
    }
    case 'SIGN_CONVENTION':
      return toast(setVeh(s, a.vid, (v) => setPledge(v, a.uid, { contractSigned: true, signedAt: new Date().toISOString() })), 'Convention signée.');
    case 'DECLARE_PAYMENT':
      return toast(setVeh(s, a.vid, (v) => setPledge(v, a.uid, { payment: 'DECLARE' })), 'Virement déclaré — en attente de validation par l’opérateur.');
    case 'CONFIRM_PAYMENT':
      return toast(setVeh(s, a.vid, (v) => setPledge(v, a.uid, { payment: 'RECU' })), 'Réception du virement confirmée.');

    // --- Admin véhicules ---
    case 'CREATE_VEHICLE': {
      const id = `V${String(s.vehicles.length + 1).padStart(3, '0')}`;
      return toast({ ...s, vehicles: [{ ...a.vehicle, id, status: S.FIN, pledges: [] }, ...s.vehicles] }, `Véhicule ${id} créé — ouvert aux promesses.`);
    }
    case 'MARK_COMMERCIALISE':
      return toast(setVeh(s, a.vid, (v) => ({ ...v, status: S.COM, valeurVente: a.valeurVente, dateCom: new Date().toISOString() })), 'Véhicule commercialisé.');
    case 'CLOSE_VEHICLE':
      return toast(
        setVeh(s, a.vid, (v) => ({
          ...v,
          status: S.VENDU,
          prixVenteReel: a.prixVenteReel,
          margeFinale: a.margeFinale,
          docs: a.docs,
          joursRotation: Math.max(1, Math.round((Date.now() - new Date(v.dateCom || Date.now())) / 86400000)),
        })),
        'Opération clôturée — répartition calculée.',
      );
    case 'SET_RIB':
      return toast({ ...s, rib: a.rib }, 'RIB entreprise enregistré.');
    case 'SET_TEMPLATE':
      return toast({ ...s, templates: { ...s.templates, [a.key]: a.text } }, 'Modèle enregistré.');
    default:
      return s;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, seedState);
  const value = useMemo(() => {
    const me = state.members.find((m) => m.id === state.activeUserId);
    const candidate = state.members.find((m) => m.id === state.candidateId);
    const notify = (msg, kind) => dispatch({ type: 'NOTIFY', msg, kind });
    return { state, dispatch, me, candidate, notify };
  }, [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
