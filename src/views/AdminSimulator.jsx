import { useState } from 'react';
import { Calculator, RotateCcw, TriangleAlert } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Btn, Card, Field, Input, SectionTitle, Stat, inputCls } from '../components/ui.jsx';
import { label } from '../components/vehicle.jsx';
import { FLAT_TAX, eur, eur0, pct, simulate } from '../lib/calc.js';

const n = (s) => (s === '' || s == null ? 0 : Number(s) || 0);
const START = { mode: 'prix', prixAchat: '30000', prixVente: '36000', frais: '800', marge: '5200', pct: '40', invest: '5000', jours: '60' };
const PCTS = [20, 30, 40, 50, 60, 70];
const SCENARIOS = [-50, -25, 0, 25, 50];

// Simulateur de rentabilité pour l'administrateur : marge nette, % alloué aux royalties, part de l'opérateur,
// rendement d'un investisseur. Il réutilise `simulate` (calc.js), donc les mêmes règles que la clôture.
export default function AdminSimulator() {
  const { state } = useStore();
  const [f, setF] = useState(START);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const prixAchat = n(f.prixAchat);
  const margeNette = f.mode === 'prix' ? n(f.prixVente) - prixAchat - n(f.frais) : n(f.marge);
  const pctRoy = n(f.pct);
  const invest = Math.min(n(f.invest), prixAchat);
  const jours = Math.max(1, n(f.jours));

  const calc = (marge, p) => {
    const m = Math.max(0, marge); // le modèle ne distribue rien en cas de perte
    const s = simulate({ invested: invest, prixAchat, marge: m, pctRoyalties: p });
    return { ...s, marge, operateur: m - s.pool };
  };
  const cur = calc(margeNette, pctRoy);
  const annualise = cur.roi * (365 / jours);
  const margePct = prixAchat ? (margeNette / prixAchat) * 100 : 0;
  const invalid = prixAchat <= 0 || pctRoy < 0 || pctRoy > 100;

  const fromVehicle = (id) => {
    const v = state.vehicles.find((x) => x.id === id);
    if (!v) return;
    setF({ ...f, mode: 'marge', prixAchat: String(v.prixAchat), marge: String(v.margeVisee), pct: String(v.pctRoyalties) });
  };

  return (
    <div className="space-y-6">
      <SectionTitle icon={Calculator} right={<Btn variant="ghost" size="sm" onClick={() => setF(START)}><RotateCcw size={13} /> Réinitialiser</Btn>}>
        Simulateur de marge et de royalties
      </SectionTitle>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex gap-1 rounded-xl bg-ink-800 p-1 text-xs font-medium">
            {[['prix', 'Depuis les prix'], ['marge', 'Marge saisie']].map(([id, t]) => (
              <button key={id} onClick={() => setF({ ...f, mode: id, ...(id === 'marge' && f.mode === 'prix' ? { marge: String(Math.round(margeNette)) } : {}) })} className={`rounded-lg px-3 py-1.5 transition ${f.mode === id ? 'bg-gold-400 text-ink-950' : 'text-zinc-400 hover:text-white'}`}>{t}</button>
            ))}
          </div>
          {state.vehicles.length > 0 && (
            <select value="" onChange={(e) => fromVehicle(e.target.value)} className={`${inputCls} !w-auto !py-1.5 text-xs`} aria-label="Charger un véhicule">
              <option value="">Charger les valeurs d’un véhicule…</option>
              {state.vehicles.map((v) => <option key={v.id} value={v.id}>{label(v)} ({v.id})</option>)}
            </select>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Prix d’achat (€)"><Input type="number" min="0" value={f.prixAchat} onChange={set('prixAchat')} /></Field>
          {f.mode === 'prix' ? (
            <>
              <Field label="Prix de vente prévu (€)"><Input type="number" min="0" value={f.prixVente} onChange={set('prixVente')} /></Field>
              <Field label="Frais (préparation, carrosserie…) (€)"><Input type="number" min="0" value={f.frais} onChange={set('frais')} /></Field>
            </>
          ) : (
            <Field label="Marge nette HT (€)" className="sm:col-span-2"><Input type="number" value={f.marge} onChange={set('marge')} /></Field>
          )}
          <Field label="% de marge alloué aux royalties"><Input type="number" min="0" max="100" value={f.pct} onChange={set('pct')} /></Field>
          <Field label="Montant investi par un membre (€)" hint="Plafonné au prix d’achat"><Input type="number" min="0" value={f.invest} onChange={set('invest')} /></Field>
          <Field label="Durée de rotation (jours)"><Input type="number" min="1" value={f.jours} onChange={set('jours')} /></Field>
        </div>
        {invalid && <p role="alert" className="flex items-center gap-2 text-sm text-amber-300"><TriangleAlert size={15} /> Prix d’achat supérieur à 0 et pourcentage entre 0 et 100 requis.</p>}
        {margeNette < 0 && !invalid && <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><TriangleAlert size={15} /> Marge négative : aucune royalty n’est versée et le capital des investisseurs serait entamé. Le modèle ne traite pas les pertes.</p>}
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Marge nette HT" value={eur0(margeNette)} sub={`${pct(margePct, 1)} du prix d’achat`} accent={margeNette < 0 ? 'text-red-300' : undefined} />
        <Stat label={`Pool royalties (${pct(pctRoy, 0)})`} value={eur(cur.pool)} sub="Réparti entre les investisseurs" />
        <Stat label="Part de l’opérateur" value={eur(cur.operateur)} sub={`${pct(100 - pctRoy, 0)} de la marge`} />
        <Stat label="Net d’un membre" value={eur(cur.net)} accent="text-emerald-300" sub={`${pct(cur.roi, 2)} net · ${pct(annualise, 1)} annualisé`} />
      </div>

      <Card>
        <h3 className="font-display mb-3 font-semibold text-white">Détail pour {eur0(invest)} investis ({pct(cur.quotePart, 2)} du prix d’achat)</h3>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {[
            ['Royalties brutes', eur(cur.brut)],
            [`Flat tax (${pct(FLAT_TAX * 100, 0)})`, `− ${eur(cur.flatTax)}`],
            ['Royalties nettes', eur(cur.net)],
            ['Capital + royalties nettes restitués', eur(cur.total)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-ink-700 py-1.5"><dt className="text-zinc-400">{k}</dt><dd className="font-medium text-white">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-zinc-500">Si l’opération est financée à 100 % : pool {eur(cur.pool)}, flat tax totale {eur(cur.pool * FLAT_TAX)}, net distribué {eur(cur.pool * (1 - FLAT_TAX))}.</p>
      </Card>

      <Card className="overflow-x-auto !p-0">
        <h3 className="font-display p-4 pb-2 font-semibold text-white">Sensibilité au % alloué aux royalties</h3>
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="text-xs uppercase text-zinc-500"><tr><th className="p-3 text-left">% royalties</th><th>Pool</th><th>Part opérateur</th><th>Net membre</th><th>Rendement net</th></tr></thead>
          <tbody className="divide-y divide-ink-700">
            {[...new Set([...PCTS, pctRoy])].sort((a, b) => a - b).map((p) => {
              const r = calc(margeNette, p);
              return (
                <tr key={p} className={p === pctRoy ? 'bg-gold-400/10 text-white' : 'text-zinc-300'}>
                  <td className="p-3 text-left">{pct(p, 1)}{p === pctRoy && ' (actuel)'}</td><td>{eur(r.pool)}</td><td>{eur(r.operateur)}</td><td>{eur(r.net)}</td><td>{pct(r.roi, 2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto !p-0">
        <h3 className="font-display p-4 pb-2 font-semibold text-white">Et si la marge réelle diffère de la marge prévue ?</h3>
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="text-xs uppercase text-zinc-500"><tr><th className="p-3 text-left">Écart</th><th>Marge nette</th><th>Pool</th><th>Part opérateur</th><th>Net membre</th><th>Rendement net</th></tr></thead>
          <tbody className="divide-y divide-ink-700">
            {SCENARIOS.map((d) => {
              const r = calc(margeNette * (1 + d / 100), pctRoy);
              return (
                <tr key={d} className={d === 0 ? 'bg-gold-400/10 text-white' : 'text-zinc-300'}>
                  <td className="p-3 text-left">{d > 0 ? `+${d}` : d} %{d === 0 && ' (prévu)'}</td><td>{eur0(r.marge)}</td><td>{eur(r.pool)}</td><td>{eur(r.operateur)}</td><td>{eur(r.net)}</td><td>{pct(r.roi, 2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-zinc-500">Simulation indicative sur les règles de calcul du Club (flat tax 30 %). Les marges visées ne sont pas des garanties ; le capital n’est pas garanti.</p>
    </div>
  );
}
