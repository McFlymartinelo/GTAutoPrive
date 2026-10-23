import { useState } from 'react';
import { ArrowLeft, Calendar, Gauge, Fuel, Tag, Info, Lock, AlertTriangle, FileText } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Btn, Card, CarImg, Progress, SectionTitle, Input, DlBtn } from '../components/ui.jsx';
import { StatusBadge, Anonymized, label } from '../components/vehicle.jsx';
import { S, eur, eur0, pct, num, funded, remaining, progress, pledgeOf, simulate, poolOf, repartition } from '../lib/calc.js';
import { downloadFactures, downloadFactureVente } from '../lib/docs.js';

const Row = ({ k, v, strong, accent, sub }) => (
  <div className={`flex items-baseline justify-between gap-3 py-2 text-sm ${strong ? 'border-t border-ink-600 font-semibold' : ''}`}>
    <span className="text-zinc-400">{k}</span>
    <span className={accent || 'text-white'}>
      {v}
      {sub && <span className="ml-2 text-xs text-zinc-500">{sub}</span>}
    </span>
  </div>
);

function Simulator({ v, amount, setAmount, max }) {
  const s = simulate({ invested: amount, prixAchat: v.prixAchat, marge: v.margeVisee, pctRoyalties: v.pctRoyalties });
  const clamp = (n) => Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0));
  return (
    <Card>
      <SectionTitle icon={Tag}>Simulateur de revenus</SectionTitle>
      <div className="mb-3 flex items-center gap-3">
        <Input type="number" min={0} max={max} step={100} value={amount || ''} onChange={(e) => setAmount(clamp(parseFloat(e.target.value)))} placeholder="Montant (€)" className="!w-40" />
        <span className="text-xs text-zinc-500">max {eur0(max)}</span>
      </div>
      <input type="range" min={0} max={max} step={100} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mb-4 w-full" />
      <Row k="Prix d'achat du véhicule" v={eur0(v.prixAchat)} />
      <Row k="Quote-part" v={pct(s.quotePart, 2)} />
      <Row k="Pool de royalties total" v={eur(s.pool)} sub={`${pct(v.pctRoyalties, 0)} de ${eur0(v.margeVisee)}`} />
      <Row k="Royalties brutes" v={eur(s.brut)} accent="text-gold-300" />
      <Row k="Flat Tax (30 %)" v={`− ${eur(s.flatTax)}`} accent="text-red-300" />
      <Row k="Royalties nettes" v={eur(s.net)} accent="text-emerald-300" strong />
      <Row k="Total récupéré net" v={eur(s.total)} sub={`ROI net ${pct(s.roi, 2)}`} accent="text-white text-base" strong />
      <p className="mt-3 text-xs text-zinc-500">Simulation sur la marge visée ; la marge réelle peut différer. Le capital n’est pas garanti.</p>
    </Card>
  );
}

export default function VehicleDetail({ id }) {
  const { state, dispatch, me } = useStore();
  const v = state.vehicles.find((x) => x.id === id);
  const [img, setImg] = useState(0);
  const mine = v && pledgeOf(v, me.id);
  const rest = v ? remaining(v) : 0;
  const [amount, setAmount] = useState(() => (mine ? mine.amount : Math.min(1000, rest || v.prixAchat)));
  if (!v) return null;
  const pledgeAmt = Math.min(amount, rest);
  const simMax = v.status === S.FIN ? rest : v.prixAchat;
  const simAmount = Math.min(amount, simMax);
  const goDash = () => dispatch({ type: 'ROUTE', route: { name: 'dashboard' } });
  const mineRep = v.status === S.VENDU && mine ? repartition(v).find((r) => r.uid === me.id) : null;

  return (
    <div className="space-y-6">
      <button onClick={() => dispatch({ type: 'ROUTE', route: { name: 'showroom' } })} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Retour au showroom
      </button>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Galerie */}
        <div className="grid grid-cols-3 gap-2 lg:col-span-3">
          <CarImg src={v.photos[img]} alt={label(v)} className="col-span-3 aspect-[16/9] w-full rounded-2xl border border-ink-700" />
          {v.photos.map((p, i) => (
            <button key={i} onClick={() => setImg(i)} className={`overflow-hidden rounded-xl border-2 transition ${i === img ? 'border-gold-400' : 'border-transparent opacity-70 hover:opacity-100'}`}>
              <CarImg src={p} alt="" className="aspect-[16/9] w-full" />
            </button>
          ))}
        </div>

        {/* Fiche */}
        <div className="space-y-4 lg:col-span-2">
          <div>
            <StatusBadge status={v.status} />
            <h1 className="font-display mt-2 text-3xl font-bold text-white">{label(v)}</h1>
            <p className="text-zinc-400">{v.finition}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[[Fuel, v.motorisation], [Calendar, v.annee], [Gauge, `${num(v.km)} km`]].map(([I, t], i) => (
              <div key={i} className="rounded-xl border border-ink-700 bg-ink-900 p-3"><I size={16} className="mx-auto mb-1 text-gold-400" />{t}</div>
            ))}
          </div>
          <Card>
            <Row k="Prix d'achat convenu" v={eur0(v.prixAchat)} />
            <Row k="Marge nette HT visée" v={eur0(v.margeVisee)} />
            <Row k="Part de marge allouée aux royalties" v={pct(v.pctRoyalties, 0)} accent="text-gold-300" />
          </Card>
          <Card className="border-gold-400/20">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-300"><Info size={15} /> Infos complémentaires de l’opérateur</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{v.infos || '—'}</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bloc conditionnel */}
        <div className="space-y-6">
          {(v.status === S.FIN || v.status === S.F100) && (
            <Card>
              <SectionTitle icon={Tag}>Financement</SectionTitle>
              <Progress value={progress(v)} />
              <p className="mt-2 text-sm text-zinc-300">
                <b className="text-white">{eur0(funded(v))}</b> promis sur {eur0(v.prixAchat)} — <b className="text-gold-300">{Math.round(progress(v))} %</b>
              </p>
              <div className="mt-4"><Anonymized v={v} members={state.members} meId={me.id} /></div>

              {v.status === S.FIN && (
                <div className="mt-5 border-t border-ink-700 pt-4">
                  {!me.charte ? (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
                      <Lock size={16} className="mt-0.5 shrink-0" /> Vous devez signer la Charte du Club avant de promettre des fonds.
                    </div>
                  ) : (
                    <>
                      {mine && <p className="mb-2 text-sm text-zinc-400">Votre promesse actuelle : <b className="text-white">{eur0(mine.amount)}</b>. Vous pouvez l’augmenter.</p>}
                      <p className="mb-3 text-sm text-zinc-400">Montant à promettre (plafonné au reste à financer : <b className="text-white">{eur0(rest)}</b>) — ajustez-le dans le simulateur.</p>
                      <div className="flex flex-wrap gap-3">
                        <Btn size="lg" disabled={!(pledgeAmt > 0)} onClick={() => dispatch({ type: 'ADD_PLEDGE', vid: v.id, uid: me.id, amount: pledgeAmt })}>
                          Promettre {eur0(pledgeAmt)}
                        </Btn>
                        <Btn variant="outline" size="lg" onClick={() => setAmount(rest)}>Tout le reste</Btn>
                      </div>
                    </>
                  )}
                </div>
              )}

              {v.status === S.F100 && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    Financement à 100 % atteint.{' '}
                    {mine ? (
                      <>Convention à signer et virement à effectuer. <button onClick={goDash} className="font-semibold underline">Ouvrir mon tableau de bord</button></>
                    ) : 'L’opérateur collecte désormais les signatures et les virements.'}
                  </div>
                </div>
              )}
            </Card>
          )}

          {v.status === S.COM && (
            <Card>
              <SectionTitle icon={Tag}>En vente</SectionTitle>
              <Row k="Valeur de vente actuelle" v={eur0(v.valeurVente)} accent="text-white text-lg font-semibold" />
              {mine && <Row k="Votre montant financé" v={eur0(mine.amount)} accent="text-gold-300" sub={pct((mine.amount / v.prixAchat) * 100, 2)} />}
              <div className="mt-4"><Anonymized v={v} members={state.members} meId={me.id} /></div>
            </Card>
          )}

          {v.status === S.VENDU && (
            <Card>
              <SectionTitle icon={Tag}>Bilan de l’opération</SectionTitle>
              <Row k="Prix de vente réel" v={eur0(v.prixVenteReel)} />
              <Row k="Marge nette HT finale réalisée" v={eur0(v.margeFinale)} accent="text-emerald-300" />
              <Row k="Total des royalties versées" v={eur(poolOf(v, v.margeFinale))} accent="text-gold-300" sub="brut, avant flat tax" />
              <Row k="Durée de rotation" v={`${v.joursRotation} jours`} />
              {mineRep && (
                <div className="mt-3 rounded-xl border border-gold-400/30 bg-gold-400/5 p-3">
                  <div className="mb-1 text-xs uppercase tracking-wide text-gold-300">Votre participation</div>
                  <Row k="Capital restitué" v={eur(mineRep.capital)} />
                  <Row k="Royalties brutes" v={eur(mineRep.brut)} />
                  <Row k="Flat tax 30 %" v={`− ${eur(mineRep.flatTax)}`} accent="text-red-300" />
                  <Row k="Royalties nettes perçues" v={eur(mineRep.net)} accent="text-emerald-300" strong />
                </div>
              )}
              <div className="mt-4"><Anonymized v={v} members={state.members} meId={me.id} /></div>
              {mine && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <DlBtn onClick={() => downloadFactures(v)}><FileText size={14} /> Dossier des factures de dépenses</DlBtn>
                  <DlBtn onClick={() => downloadFactureVente(v)}><FileText size={14} /> Facture de vente finale</DlBtn>
                </div>
              )}
            </Card>
          )}
        </div>

        <Simulator v={v.status === S.VENDU ? { ...v, margeVisee: v.margeFinale } : v} amount={simAmount} setAmount={setAmount} max={simMax} />
      </div>
    </div>
  );
}
