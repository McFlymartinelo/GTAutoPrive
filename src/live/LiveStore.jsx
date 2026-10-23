import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ctx } from '../store.jsx';
import { api } from '../lib/api.js';
import { eur } from '../lib/calc.js';

// Fournit la même interface que le store de démo ({ state, dispatch, me, candidate, notify }) :
// les vues existantes fonctionnent donc sans modification, mais chaque action passe par l'API.
const post = (path, json) => ({ method: 'POST', path, json });

function toRequest(a) {
  switch (a.type) {
    case 'SIGN_CHARTE':
      return { ...post('/me/charte', { signature: a.signature.image, password: a.signature.password }), msg: 'Charte signée — bienvenue au Club !' };
    case 'SIGN_CONVENTION':
      return { ...post(`/vehicles/${a.vid}/sign`, { signature: a.signature.image, password: a.signature.password }), msg: 'Convention signée.' };
    case 'DECLARE_PAYMENT':
      return { ...post(`/vehicles/${a.vid}/declare`), msg: 'Virement déclaré — en attente de validation par l’opérateur.' };
    case 'APPROVE_STEP1':
      return { ...post(`/admin/members/${a.id}/approve`), msg: 'Accès à l’étape 2 autorisé.' };
    case 'REFUSE':
      return { ...post(`/admin/members/${a.id}/refuse`), msg: 'Demande refusée.', kind: 'warn' };
    case 'CONFIRM_PAYMENT':
      return { ...post(`/admin/vehicles/${a.vid}/confirm/${a.uid}`), msg: 'Réception du virement confirmée.' };
    case 'MARK_COMMERCIALISE':
      return { ...post(`/admin/vehicles/${a.vid}/commercialiser`, { valeurVente: a.valeurVente }), msg: 'Véhicule commercialisé.' };
    case 'SET_RIB':
      return { method: 'PUT', path: '/admin/rib', json: a.rib, msg: 'RIB entreprise enregistré.' };
    case 'SET_TEMPLATE':
      return { method: 'PUT', path: `/admin/templates/${a.key}`, json: { text: a.text }, msg: 'Modèle enregistré.' };
    case 'CLOSE_VEHICLE': {
      const form = new FormData();
      form.append('prixVenteReel', a.prixVenteReel);
      form.append('margeFinale', a.margeFinale);
      form.append('factures', a.files.factures);
      form.append('vente', a.files.vente);
      return { method: 'POST', path: `/admin/vehicles/${a.vid}/close`, form, msg: 'Opération clôturée — répartition calculée.' };
    }
    case 'CREATE_VEHICLE': {
      const v = a.vehicle;
      const form = new FormData();
      ['marque', 'modele', 'finition', 'motorisation', 'annee', 'km', 'prixAchat', 'margeVisee', 'pctRoyalties', 'infos'].forEach((k) => form.append(k, v[k]));
      [0, 1, 2].forEach((i) => (v.photoFiles?.[i] ? form.append(`photo${i}`, v.photoFiles[i]) : form.append(`photo${i}`, v.photos[i] || '')));
      return { method: 'POST', path: '/admin/vehicles', form, msg: 'Véhicule créé — ouvert aux promesses.' };
    }
    default:
      return null;
  }
}

export function LiveProvider({ children, onLogout }) {
  const [data, setData] = useState(null);
  const [route, setRoute] = useState({ name: 'showroom' });
  const [toast, setToast] = useState(null);
  const notify = useCallback((msg, kind = 'ok') => setToast({ id: Date.now() + Math.random(), msg, kind }), []);

  const refresh = useCallback(async () => {
    try {
      setData(await api('/state'));
    } catch (e) {
      if (e.status === 401) onLogout();
      else notify(e.message, 'warn');
    }
  }, [onLogout, notify]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000); // récupère les validations de l'admin / des autres membres
    return () => clearInterval(id);
  }, [refresh]);

  const dispatch = useCallback(
    async (a) => {
      if (a.type === 'ROUTE') return setRoute(a.route);
      if (a.type === 'NOTIFY') return notify(a.msg, a.kind);
      try {
        if (a.type === 'ADD_PLEDGE') {
          const r = await api(`/vehicles/${a.vid}/pledge`, { method: 'POST', json: { amount: a.amount } });
          await refresh();
          notify(r.full ? '⚡ Objectif 100 % atteint ! Convention à signer et virement à effectuer.' : `Promesse de ${eur(r.amount)} enregistrée.`);
          return true;
        }
        const q = toRequest(a);
        if (!q) return undefined; // actions propres à la démo (VIEW, SET_USER, RESET…)
        await api(q.path, { method: q.method, json: q.json, form: q.form });
        await refresh();
        notify(q.msg, q.kind);
        return true;
      } catch (e) {
        if (e.status === 401) onLogout();
        else notify(e.message, 'warn');
        return false;
      }
    },
    [refresh, notify, onLogout],
  );

  const value = useMemo(() => {
    if (!data) return null;
    const state = { ...data, route, toast, view: data.me.role === 'admin' ? 'admin' : 'client', activeUserId: data.me.id, candidateId: data.me.id };
    return { state, dispatch, me: data.me, candidate: data.me, notify };
  }, [data, route, toast, dispatch, notify]);

  if (!value) return <div className="p-10 text-center text-zinc-400">Chargement…</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
