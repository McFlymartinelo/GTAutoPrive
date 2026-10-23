import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ScrollText } from 'lucide-react';
import { api } from '../lib/api.js';
import { Btn, Card, SectionTitle, inputCls } from '../components/ui.jsx';

const LABELS = {
  login: 'Connexion',
  request_created: 'Nouvelle candidature',
  approve_step1: 'Étape 1 validée',
  refuse_step1: 'Candidature refusée',
  kyc_submitted: 'KYC soumis',
  charte_signed: 'Charte signée',
  pledge: 'Promesse d’investissement',
  convention_signed: 'Convention signée',
  payment_declared: 'Virement déclaré',
  payment_confirmed: 'Réception confirmée',
  payment_unconfirmed: 'Confirmation annulée',
  vehicle_created: 'Véhicule créé',
  vehicle_updated: 'Véhicule modifié',
  commercialise: 'Véhicule commercialisé',
  vehicle_closed: 'Véhicule clôturé',
  rib_updated: 'RIB modifié',
  template_updated: 'Modèle modifié',
  admin_created: 'Admin créé',
  admin_password_reset: 'Mot de passe admin réinitialisé',
};
const dt = (iso) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });

// Journal d'audit en lecture seule (table `audit` de l'API).
export default function AdminAudit() {
  const [rows, setRows] = useState([]);
  const [actions, setActions] = useState([]);
  const [action, setAction] = useState('');
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (offset = 0) => {
      setBusy(true);
      setError('');
      try {
        const q = new URLSearchParams({ limit: '100', offset: String(offset) });
        if (action) q.set('action', action);
        const r = await api(`/admin/audit?${q}`);
        setRows((prev) => (offset ? [...prev, ...r.entries] : r.entries));
        setMore(r.hasMore);
        setActions(r.actions);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [action],
  );
  useEffect(() => {
    load(0);
  }, [load]);

  return (
    <div className="space-y-4">
      <SectionTitle
        icon={ScrollText}
        right={
          <div className="flex items-center gap-2">
            <select value={action} onChange={(e) => setAction(e.target.value)} className={`${inputCls} !w-auto !py-1.5 text-xs`} aria-label="Filtrer par action">
              <option value="">Toutes les actions</option>
              {actions.map((a) => <option key={a} value={a}>{LABELS[a] || a}</option>)}
            </select>
            <Btn variant="outline" size="sm" onClick={() => load(0)} disabled={busy}><RefreshCw size={13} /> Actualiser</Btn>
          </div>
        }
      >
        Journal d’audit
      </SectionTitle>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500"><tr><th className="p-3">Date</th><th>Auteur</th><th>Action</th><th>Détail</th></tr></thead>
          <tbody className="divide-y divide-ink-700">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap p-3 text-zinc-400">{dt(r.ts)}</td>
                <td className="text-zinc-300">{r.email || 'public'}</td>
                <td className="text-white">{LABELS[r.action] || r.action}</td>
                <td className="text-zinc-400">{r.detail}</td>
              </tr>
            ))}
            {!rows.length && !busy && <tr><td colSpan={4} className="p-4 text-zinc-500">Aucune entrée.</td></tr>}
          </tbody>
        </table>
      </Card>
      {more && <Btn variant="outline" onClick={() => load(rows.length)} disabled={busy}>Charger plus</Btn>}
    </div>
  );
}
