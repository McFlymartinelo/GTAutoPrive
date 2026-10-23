import { useState } from 'react';
import { Calculator, TriangleAlert } from 'lucide-react';
import { Btn, Field, Input } from './ui.jsx';
import { FLAT_TAX, eur, eur0, pct, simulate } from '../lib/calc.js';

const TICKETS = [500, 1000, 2500, 5000, 10000];

// Aperçu en direct de ce que rapporte l'opération à chaque investisseur, selon le prix d'achat, la marge visée
// et le % de marge alloué aux royalties saisis dans le formulaire. Même calcul que la clôture (`simulate`).
// `onApplyPct` (optionnel) permet d'appliquer au formulaire le % calculé pour viser un rendement net donné.
export default function MarginPreview({ prixAchat, marge, pctRoyalties, onApplyPct }) {
  const [custom, setCustom] = useState('');
  const [target, setTarget] = useState('');

  if (!(prixAchat > 0)) {
    return <p className="rounded-xl border border-dashed border-ink-600 p-4 text-sm text-zinc-500">Renseignez le prix d’achat, la marge visée et le % de royalties pour voir ce que rapporte l’opération à chaque investisseur.</p>;
  }
  const m = Math.max(0, marge);
  const p = Math.min(100, Math.max(0, pctRoyalties));
  const row = (invested) => ({ invested, ...simulate({ invested, prixAchat, marge: m, pctRoyalties: p }) });
  const tickets = TICKETS.filter((t) => t <= prixAchat);
  const customN = Math.min(Number(custom) || 0, prixAchat);
  const rows = [...tickets.map(row), ...(customN > 0 ? [row(customN)] : [])];
  const pool = (m * p) / 100;
  const full = row(prixAchat); // ROI identique quel que soit le montant
  const targetN = Number(target);
  const neededPct = targetN > 0 && m > 0 ? (targetN * prixAchat) / (m * (1 - FLAT_TAX)) : null;

  return (
    <div className="space-y-4 rounded-2xl border border-gold-400/30 bg-gold-400/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gold-300"><Calculator size={16} /> Ce que rapporte l’opération (simulation en direct)</div>
      {marge < 0 && <p className="flex items-center gap-2 text-sm text-red-300"><TriangleAlert size={15} /> Marge négative : aucune royalty ne serait versée.</p>}

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <div><div className="text-xs uppercase text-zinc-400">Marge visée</div><div className="font-semibold text-white">{eur0(marge)}</div><div className="text-xs text-zinc-500">{pct((marge / prixAchat) * 100, 1)} du prix d’achat</div></div>
        <div><div className="text-xs uppercase text-zinc-400">Pool royalties ({pct(p, 1)})</div><div className="font-semibold text-white">{eur(pool)}</div><div className="text-xs text-zinc-500">réparti entre les investisseurs</div></div>
        <div><div className="text-xs uppercase text-zinc-400">Part de l’opérateur</div><div className="font-semibold text-white">{eur(m - pool)}</div><div className="text-xs text-zinc-500">{pct(100 - p, 1)} de la marge</div></div>
        <div><div className="text-xs uppercase text-zinc-400">Rendement net membre</div><div className="font-semibold text-emerald-300">{pct(full.roi, 2)}</div><div className="text-xs text-zinc-500">après flat tax {pct(FLAT_TAX * 100, 0)}</div></div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-700">
        <table className="w-full min-w-[560px] text-right text-sm">
          <thead className="bg-ink-800 text-xs uppercase text-zinc-400">
            <tr><th className="p-2.5 text-left">Un investisseur met</th><th>Quote-part</th><th>Royalties brutes</th><th>Flat tax</th><th>Net perçu</th><th>Total restitué</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-700 text-zinc-300">
            {rows.map((r, i) => (
              <tr key={r.invested + '-' + i}>
                <td className="p-2.5 text-left text-white">{eur0(r.invested)}</td>
                <td>{pct(r.quotePart, 2)}</td><td>{eur(r.brut)}</td><td className="text-red-300">− {eur(r.flatTax)}</td>
                <td className="font-semibold text-emerald-300">{eur(r.net)}</td><td>{eur(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Autre montant à simuler (€)"><Input type="number" min="0" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="ex. 7 500" /></Field>
        <Field label="Rendement net visé pour les membres (%)" hint={neededPct != null ? `Il faut allouer ${pct(neededPct, 1)} de la marge aux royalties.` : 'Calcule le % de marge à allouer.'}>
          <div className="flex gap-2">
            <Input type="number" min="0" step="0.1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="ex. 5" />
            {onApplyPct && neededPct != null && neededPct <= 100 && (
              <Btn variant="outline" size="sm" className="shrink-0" onClick={() => onApplyPct(Math.round(neededPct * 10) / 10)}>Appliquer</Btn>
            )}
          </div>
          {neededPct != null && neededPct > 100 && <span className="mt-1 block text-xs text-amber-300">Impossible avec cette marge : même 100 % ne suffit pas.</span>}
        </Field>
      </div>
      <p className="text-xs text-zinc-500">Marge visée = objectif, pas une garantie. Le net réel dépendra de la marge finale ; le capital n’est pas garanti.</p>
    </div>
  );
}
