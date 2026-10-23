import { Gauge, Calendar, Users } from 'lucide-react';
import { Badge, Card, CarImg, Progress } from './ui.jsx';
import { S, eur, eur0, pct, num, funded, progress, pledgeOf } from '../lib/calc.js';

export const label = (v) => `${v.marque} ${v.modele}`;

export function StatusBadge({ status }) {
  if (status === S.FIN) return <Badge tone="gold">En financement</Badge>;
  if (status === S.F100) return <Badge tone="amber">100 % — paiement en cours</Badge>;
  if (status === S.COM) return <Badge tone="blue">Commercialisé</Badge>;
  return <Badge tone="green">Vendu</Badge>;
}

export const PAYMENT_LABEL = {
  EN_ATTENTE: 'En attente',
  DECLARE: 'Virement déclaré',
  RECU: 'Fonds confirmés',
};

export function Anonymized({ v, members, meId }) {
  return (
    <ul className="divide-y divide-ink-700 text-sm">
      {v.pledges.length === 0 && <li className="py-2 text-zinc-500">Aucun investisseur positionné pour l’instant.</li>}
      {v.pledges.map((p) => {
        const m = members.find((x) => x.id === p.uid);
        return (
          <li key={p.uid} className="flex justify-between gap-3 py-2">
            <span className={p.uid === meId ? 'font-semibold text-gold-300' : 'text-zinc-300'}>
              Investisseur #{m?.num ?? '?'} {p.uid === meId && '(vous)'}
            </span>
            <span className="text-zinc-400">
              {eur0(p.amount)} <span className="text-zinc-500">({pct((p.amount / v.prixAchat) * 100, 1)})</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function VehicleCard({ v, meId, onOpen }) {
  const mine = pledgeOf(v, meId);
  const prog = progress(v);
  return (
    <Card className="group cursor-pointer overflow-hidden !p-0 transition hover:border-gold-400/60" onClick={onOpen}>
      <div className="relative aspect-[16/10] overflow-hidden">
        <CarImg src={v.photos[0]} alt={label(v)} className="h-full w-full transition duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3"><StatusBadge status={v.status} /></div>
        {mine && <div className="absolute right-3 top-3"><Badge tone="gold">Ma participation</Badge></div>}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">{label(v)}</h3>
          <p className="text-sm text-zinc-400">{v.finition} · {v.motorisation}</p>
        </div>
        <div className="flex gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><Calendar size={13} /> {v.annee}</span>
          <span className="flex items-center gap-1"><Gauge size={13} /> {num(v.km)} km</span>
          <span className="flex items-center gap-1"><Users size={13} /> {v.pledges.length}</span>
        </div>
        {(v.status === S.FIN || v.status === S.F100) && (
          <div>
            <Progress value={prog} />
            <div className="mt-1.5 flex justify-between text-xs text-zinc-400">
              <span>{eur0(funded(v))} / {eur0(v.prixAchat)}</span>
              <span className="font-semibold text-gold-300">{Math.round(prog)} %</span>
            </div>
          </div>
        )}
        {v.status === S.COM && <div className="text-sm text-zinc-300">Mis en vente à <b className="text-white">{eur0(v.valeurVente)}</b></div>}
        {v.status === S.VENDU && <div className="text-sm text-zinc-300">Vendu <b className="text-white">{eur0(v.prixVenteReel)}</b> · marge {eur0(v.margeFinale)}</div>}
        <div className="flex justify-between border-t border-ink-700 pt-3 text-xs text-zinc-400">
          <span>Achat <b className="text-zinc-200">{eur0(v.prixAchat)}</b></span>
          <span>Marge visée <b className="text-zinc-200">{eur0(v.margeVisee)}</b></span>
          <span>Royalties <b className="text-gold-300">{pct(v.pctRoyalties, 0)}</b></span>
        </div>
      </div>
    </Card>
  );
}
