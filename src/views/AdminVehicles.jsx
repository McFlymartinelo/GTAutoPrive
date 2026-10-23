import { useState } from 'react';
import { Check, Clock, Banknote, Flag } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Btn, Badge, Card, Field, Input, FileDrop, Modal, Progress, SectionTitle } from '../components/ui.jsx';
import { StatusBadge, PAYMENT_LABEL, label } from '../components/vehicle.jsx';
import { S, eur, eur0, pct, funded, progress, repartition, poolOf } from '../lib/calc.js';

function memberName(members, uid) {
  const m = members.find((x) => x.id === uid);
  return m ? `#${m.num} ${m.prenom} ${m.nom}` : uid;
}

function PledgeTable({ v, members, actions }) {
  const { dispatch } = useStore();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs uppercase text-zinc-500">
          <tr><th className="py-2">Investisseur</th><th>Promis</th><th>Quote-part</th>{actions && <><th>Convention</th><th>Paiement</th><th /></>}</tr>
        </thead>
        <tbody className="divide-y divide-ink-700">
          {v.pledges.map((p) => (
            <tr key={p.uid}>
              <td className="py-2.5 text-white">{memberName(members, p.uid)}</td>
              <td>{eur0(p.amount)}</td>
              <td className="text-zinc-400">{pct((p.amount / v.prixAchat) * 100, 2)}</td>
              {actions && (
                <>
                  <td>{p.contractSigned ? <Badge tone="green">Signée</Badge> : <Badge tone="amber">En attente</Badge>}</td>
                  <td>
                    {p.payment === 'RECU' ? <Badge tone="green">Fonds reçus sur compte pro</Badge> : p.payment === 'DECLARE' ? <Badge tone="blue">Virement déclaré par le client</Badge> : <Badge tone="amber">En attente</Badge>}
                  </td>
                  <td className="text-right">
                    {p.payment !== 'RECU' && (
                      <Btn variant="success" size="sm" onClick={() => dispatch({ type: 'CONFIRM_PAYMENT', vid: v.id, uid: p.uid })}>
                        <Check size={14} /> Confirmer la réception du virement
                      </Btn>
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
          {v.pledges.length === 0 && <tr><td colSpan={6} className="py-4 text-zinc-500">Aucune promesse.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function CloseModal({ v, onClose }) {
  const { state, dispatch } = useStore();
  const [prix, setPrix] = useState('');
  const [marge, setMarge] = useState('');
  const [fact, setFact] = useState(null);
  const [vente, setVente] = useState(null);
  const rows = repartition(v, +marge || 0);
  const tot = (k) => rows.reduce((s, r) => s + r[k], 0);
  const ok = +prix > 0 && marge !== '' && fact && vente;

  const submit = async () => {
    const doc = (f) => ({ name: f.name, url: URL.createObjectURL(f) });
    const res = await dispatch({ type: 'CLOSE_VEHICLE', vid: v.id, prixVenteReel: +prix, margeFinale: +marge, docs: { factures: doc(fact), vente: doc(vente) }, files: { factures: fact, vente } });
    if (res !== false) onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Clôture comptable — ${label(v)}`} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prix de vente réel (€)"><Input type="number" value={prix} onChange={(e) => setPrix(e.target.value)} /></Field>
        <Field label="Marge nette HT finale réalisée (€)"><Input type="number" value={marge} onChange={(e) => setMarge(e.target.value)} /></Field>
        <FileDrop label="Fichier 1 — Factures de dépenses (PDF/ZIP) *" file={fact} onFile={setFact} />
        <FileDrop label="Fichier 2 — Facture de vente finale (PDF) *" file={vente} onFile={setVente} />
      </div>
      <h4 className="font-display mb-2 mt-6 font-semibold text-white">Répartition automatique — pool royalties {eur(poolOf(v, +marge || 0))} ({pct(v.pctRoyalties, 0)} de la marge)</h4>
      <div className="overflow-x-auto rounded-xl border border-ink-700">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead className="bg-ink-800 text-xs uppercase text-zinc-400">
            <tr><th className="p-2.5 text-left">Investisseur</th><th>Quote-part</th><th>Capital</th><th>Royalties brutes</th><th>Flat tax 30 %</th><th>Net à virer</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {rows.map((r) => (
              <tr key={r.uid}>
                <td className="p-2.5 text-left text-white">{memberName(state.members, r.uid)}</td>
                <td>{pct(r.quotePart, 2)}</td><td>{eur(r.capital)}</td><td>{eur(r.brut)}</td>
                <td className="text-red-300">− {eur(r.flatTax)}</td>
                <td className="font-semibold text-emerald-300">{eur(r.total)}</td>
              </tr>
            ))}
            <tr className="bg-ink-800 font-semibold">
              <td className="p-2.5 text-left">Total</td><td /><td>{eur(tot('capital'))}</td><td>{eur(tot('brut'))}</td><td className="text-red-300">− {eur(tot('flatTax'))}</td><td className="text-emerald-300">{eur(tot('total'))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
        <Btn disabled={!ok} onClick={submit}><Flag size={16} /> Clôturer en « Vendu »</Btn>
      </div>
    </Modal>
  );
}

function Detail({ v }) {
  const { state, dispatch } = useStore();
  const [vente, setVente] = useState('');
  const [closing, setClosing] = useState(false);
  const allOk = v.pledges.length > 0 && v.pledges.every((p) => p.contractSigned && p.payment === 'RECU');
  const signed = v.pledges.filter((p) => p.contractSigned).length;
  const paid = v.pledges.filter((p) => p.payment === 'RECU').length;

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-white">{label(v)} <span className="text-sm text-zinc-500">{v.id}</span></h3>
          <p className="text-sm text-zinc-400">Achat {eur0(v.prixAchat)} · marge visée {eur0(v.margeVisee)} · royalties {pct(v.pctRoyalties, 0)}</p>
        </div>
        <StatusBadge status={v.status} />
      </div>

      {(v.status === S.FIN || v.status === S.F100) && (
        <>
          <div>
            <Progress value={progress(v)} />
            <p className="mt-1.5 text-sm text-zinc-400">{eur0(funded(v))} promis sur {eur0(v.prixAchat)} ({Math.round(progress(v))} %)</p>
          </div>
          {v.status === S.F100 && <p className="text-sm text-zinc-300"><Clock size={14} className="mr-1 inline text-amber-300" /> Conventions signées : <b>{signed}/{v.pledges.length}</b> · Fonds reçus : <b>{paid}/{v.pledges.length}</b></p>}
          <PledgeTable v={v} members={state.members} actions={v.status === S.F100} />
        </>
      )}

      {v.status === S.F100 && (
        <div className="flex flex-wrap items-end gap-3 border-t border-ink-700 pt-4">
          <Field label="Valeur de vente actuelle (€)"><Input type="number" value={vente} onChange={(e) => setVente(e.target.value)} className="!w-48" /></Field>
          <Btn disabled={!allOk || !(+vente > 0)} onClick={() => dispatch({ type: 'MARK_COMMERCIALISE', vid: v.id, valeurVente: +vente })}>
            <Banknote size={16} /> Basculer en « Commercialisé »
          </Btn>
          {!allOk && <span className="text-xs text-amber-300">Requiert toutes les conventions signées et tous les virements reçus.</span>}
        </div>
      )}

      {v.status === S.COM && (
        <>
          <p className="text-sm text-zinc-300">Valeur de vente actuelle : <b className="text-white">{eur0(v.valeurVente)}</b></p>
          <PledgeTable v={v} members={state.members} />
          <Btn onClick={() => setClosing(true)}><Flag size={16} /> Clôturer en « Vendu »</Btn>
          {closing && <CloseModal v={v} onClose={() => setClosing(false)} />}
        </>
      )}

      {v.status === S.VENDU && (
        <>
          <p className="text-sm text-zinc-300">Vendu <b className="text-white">{eur0(v.prixVenteReel)}</b> · marge finale <b className="text-emerald-300">{eur0(v.margeFinale)}</b> · pool royalties {eur(poolOf(v, v.margeFinale))}</p>
          <div className="overflow-x-auto rounded-xl border border-ink-700">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead className="bg-ink-800 text-xs uppercase text-zinc-400"><tr><th className="p-2.5 text-left">Investisseur</th><th>Capital</th><th>Brutes</th><th>Flat tax</th><th>Net à virer</th></tr></thead>
              <tbody className="divide-y divide-ink-700">
                {repartition(v).map((r) => (
                  <tr key={r.uid}><td className="p-2.5 text-left text-white">{memberName(state.members, r.uid)}</td><td>{eur(r.capital)}</td><td>{eur(r.brut)}</td><td className="text-red-300">− {eur(r.flatTax)}</td><td className="font-semibold text-emerald-300">{eur(r.total)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-500">Justificatifs : {v.docs?.factures?.name} · {v.docs?.vente?.name}</p>
        </>
      )}
    </Card>
  );
}

export default function AdminVehicles() {
  const { state } = useStore();
  const [sel, setSel] = useState(state.vehicles.find((v) => v.status === S.F100)?.id || state.vehicles[0]?.id);
  const v = state.vehicles.find((x) => x.id === sel);
  const groups = [[S.FIN, 'En financement'], [S.F100, '100 % — paiements'], [S.COM, 'Commercialisés'], [S.VENDU, 'Vendus']];

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        {groups.map(([st, t]) => {
          const list = state.vehicles.filter((x) => x.status === st);
          return (
            <div key={st}>
              <div className="mb-1.5 text-xs uppercase tracking-wide text-zinc-500">{t} ({list.length})</div>
              <div className="space-y-1">
                {list.map((x) => (
                  <button key={x.id} onClick={() => setSel(x.id)} className={`block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${x.id === sel ? 'border-gold-400 bg-gold-400/10 text-white' : 'border-ink-700 text-zinc-300 hover:border-ink-600'}`}>
                    {label(x)} <span className="text-xs text-zinc-500">{x.id}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </aside>
      <div>{v ? <Detail key={v.id + v.status} v={v} /> : <SectionTitle>Aucun véhicule</SectionTitle>}</div>
    </div>
  );
}
