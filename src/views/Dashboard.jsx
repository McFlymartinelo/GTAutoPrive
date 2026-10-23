import { useState } from 'react';
import { Zap, FileSignature, Landmark, Check, CheckCircle2, Wallet, Car, TrendingUp, Receipt, PiggyBank, Percent, FileText, Hourglass } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Btn, Badge, Card, SectionTitle, Stat, CopyBtn, DlBtn } from '../components/ui.jsx';
import SignatureModal from '../components/SignatureModal.jsx';
import { StatusBadge, PAYMENT_LABEL, label } from '../components/vehicle.jsx';
import { S, eur, eur0, pct, pledgeOf, repartition, render, conventionVars, charteVars, refVirement, dateFr } from '../lib/calc.js';
import { downloadRib, downloadFactures, downloadFactureVente } from '../lib/docs.js';
import { downloadPdf } from '../lib/pdf.js';

function UrgentCard({ v, p, me }) {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const { rib, templates } = state;
  const ref = refVirement(v, me);
  const text = render(templates.convention, conventionVars(me, v, p.amount));
  const declared = p.payment === 'DECLARE';

  return (
    <div className="alert-glow rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-500/10 via-ink-900 to-red-500/10 p-4 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-amber-400 p-2 text-ink-950"><Zap size={22} /></div>
        <div>
          <h3 className="font-display text-lg font-bold text-amber-300 sm:text-xl">⚡ OBJECTIF 100 % ATTEINT : Action requise pour débloquer l’achat du véhicule {label(v)}</h3>
          <p className="mt-1 text-sm text-zinc-300">Votre promesse de {eur(p.amount)} est maintenant à régler. Deux étapes :</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Étape A */}
        <div className="rounded-xl border border-ink-600 bg-ink-900/80 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-white"><FileSignature size={16} className="text-gold-400" /> Étape A — Signer la Convention</span>
            {p.contractSigned && <Badge tone="green"><Check size={12} /> Signée</Badge>}
          </div>
          <p className="mb-3 text-sm text-zinc-400">Convention de Revenus Futurs personnalisée pour ce véhicule.</p>
          {p.contractSigned ? (
            <DlBtn onClick={() => downloadPdf('Convention de revenus futurs', text, `Convention_${v.id}.pdf`)}>Télécharger ma convention</DlBtn>
          ) : (
            <Btn onClick={() => setOpen(true)}><FileSignature size={16} /> Lire et signer la convention</Btn>
          )}
          <SignatureModal
            open={open}
            onClose={() => setOpen(false)}
            title={`Convention de revenus futurs — ${label(v)}`}
            text={text}
            onSigned={() => { dispatch({ type: 'SIGN_CONVENTION', vid: v.id, uid: me.id }); setOpen(false); }}
          />
        </div>

        {/* Étape B */}
        <div className="rounded-xl border border-ink-600 bg-ink-900/80 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Landmark size={16} className="text-gold-400" /> Étape B — Virement bancaire manuel (hors app)</div>
          <div className="mb-3 text-xs uppercase tracking-wide text-zinc-400">Montant exact à virer</div>
          <div className="font-display mb-4 text-4xl font-bold text-amber-300 sm:text-5xl">{eur(p.amount)}</div>

          <dl className="mb-3 space-y-2 rounded-xl bg-ink-950 p-3 text-sm">
            {[['Titulaire', rib.titulaire], ['Banque', rib.banque], ['IBAN', rib.iban], ['BIC', rib.bic]].map(([k, val]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-zinc-500">{k}</dt><dd className="break-all text-right font-mono text-white">{val}</dd></div>
            ))}
          </dl>
          <div className="mb-3 flex flex-wrap gap-2">
            <CopyBtn text={rib.iban.replace(/\s/g, '')} label="Copier l’IBAN" />
            <DlBtn onClick={() => downloadRib(rib)}>Télécharger le RIB (PDF)</DlBtn>
          </div>

          <div className="mb-3 rounded-xl border border-gold-400/40 bg-gold-400/10 p-3">
            <div className="text-xs uppercase tracking-wide text-gold-300">Référence de virement obligatoire</div>
            <div className="my-1 break-all font-mono text-lg font-semibold text-white">{ref}</div>
            <CopyBtn text={ref} label="Copier la référence" />
          </div>

          {declared ? (
            <div className="flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-400/10 p-3 text-sm text-sky-200"><Hourglass size={16} /> Virement déclaré — en attente de validation par l’opérateur</div>
          ) : (
            <>
              <Btn size="lg" className="w-full" disabled={!p.contractSigned} onClick={() => dispatch({ type: 'DECLARE_PAYMENT', vid: v.id, uid: me.id })}>
                J’ai effectué le virement depuis ma banque
              </Btn>
              {!p.contractSigned && <p className="mt-2 text-xs text-amber-300">Signez d’abord la convention (étape A).</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const contractBadge = (v, p) => (v.status === S.FIN ? <Badge>—</Badge> : p.contractSigned ? <Badge tone="green">Signé</Badge> : <Badge tone="red">À signer</Badge>);
const paymentBadge = (v, p) => {
  if (v.status === S.FIN) return <Badge>En attente de 100 %</Badge>;
  if (p.payment === 'RECU') return <Badge tone="green">Fonds confirmés par l’admin</Badge>;
  if (p.payment === 'DECLARE') return <Badge tone="blue">Virement déclaré</Badge>;
  return <Badge tone="amber">À payer</Badge>;
};

export default function Dashboard() {
  const { state, dispatch, me } = useStore();
  const mine = state.vehicles.map((v) => ({ v, p: pledgeOf(v, me.id) })).filter((x) => x.p);
  const urgent = mine.filter(({ v, p }) => v.status === S.F100 && !(p.contractSigned && p.payment === 'RECU'));
  const active = mine.filter(({ v }) => v.status !== S.VENDU);
  const sold = mine.filter(({ v }) => v.status === S.VENDU).map((x) => ({ ...x, r: repartition(x.v).find((r) => r.uid === me.id) }));

  const immobilise = mine.filter(({ v, p }) => v.status === S.COM || (v.status === S.F100 && p.payment === 'RECU')).reduce((s, { p }) => s + p.amount, 0);
  const financees = mine.filter(({ v }) => v.status !== S.FIN).length;
  const brut = sold.reduce((s, x) => s + x.r.brut, 0);
  const tax = sold.reduce((s, x) => s + x.r.flatTax, 0);
  const net = sold.reduce((s, x) => s + x.r.net, 0);
  const capSold = sold.reduce((s, x) => s + x.p.amount, 0);
  const rendement = capSold ? (net / capSold) * 100 : 0;
  const openDoc = (v) => dispatch({ type: 'ROUTE', route: { name: 'vehicle', id: v.id } });

  return (
    <div className="space-y-8">
      {urgent.map(({ v, p }) => <UrgentCard key={v.id} v={v} p={p} me={me} />)}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat icon={Wallet} label="Capital immobilisé" value={eur0(immobilise)} />
        <Stat icon={Car} label="Voitures financées" value={financees} />
        <Stat icon={TrendingUp} label="Royalties brutes" value={eur(brut)} accent="text-gold-300" />
        <Stat icon={Receipt} label="Flat tax (30 %)" value={eur(tax)} accent="text-red-300" />
        <Stat icon={PiggyBank} label="Royalties nettes" value={eur(net)} accent="text-emerald-300" />
        <Stat icon={Percent} label="Rendement moyen" value={pct(rendement, 2)} sub="sur opérations vendues" />
      </section>

      <section>
        <SectionTitle icon={Car}>Mes opérations — promesses & en cours</SectionTitle>
        <div className="space-y-3">
          {active.length === 0 && <p className="text-sm text-zinc-500">Aucune opération en cours. Rendez-vous dans le showroom.</p>}
          {active.map(({ v, p }) => (
            <Card key={v.id} className="flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => openDoc(v)} className="text-left">
                <div className="font-display font-semibold text-white hover:text-gold-300">{label(v)}</div>
                <div className="text-xs text-zinc-400">{eur0(p.amount)} · quote-part {pct((p.amount / v.prixAchat) * 100, 2)}</div>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={v.status} /> {contractBadge(v, p)} {paymentBadge(v, p)}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={CheckCircle2}>Historique — opérations vendues</SectionTitle>
        <div className="space-y-3">
          {sold.length === 0 && <p className="text-sm text-zinc-500">Aucune opération clôturée.</p>}
          {sold.map(({ v, p, r }) => (
            <Card key={v.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button onClick={() => openDoc(v)} className="text-left">
                  <div className="font-display font-semibold text-white hover:text-gold-300">{label(v)}</div>
                  <div className="text-xs text-zinc-400">Investi {eur0(p.amount)} · marge finale {eur0(v.margeFinale)}</div>
                </button>
                <div className="text-right">
                  <div className="text-xs text-zinc-500">Gain net perçu</div>
                  <div className="font-display text-xl font-semibold text-emerald-300">+ {eur(r.net)}</div>
                  <div className="text-xs text-zinc-500">brut {eur(r.brut)} − flat tax {eur(r.flatTax)}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <DlBtn onClick={() => downloadFactures(v)}>Factures de dépenses</DlBtn>
                <DlBtn onClick={() => downloadFactureVente(v)}>Facture de vente</DlBtn>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={FileText}>Mes documents</SectionTitle>
        <Card className="divide-y divide-ink-700 !p-0">
          <DocRow name="Charte d’adhésion & risques" meta={me.charte ? `Signée le ${dateFr(me.charte.date)}` : 'Non signée'} ok={!!me.charte}
            onDl={() => downloadPdf('Charte signée', render(state.templates.charte, charteVars(me)), 'Charte_signee.pdf')} />
          {mine.filter(({ p }) => p.contractSigned).map(({ v, p }) => (
            <DocRow key={v.id} name={`Convention de revenus futurs — ${label(v)}`} meta={`Signée le ${dateFr(p.signedAt)}`} ok
              onDl={() => downloadPdf('Convention de revenus futurs', render(state.templates.convention, conventionVars(me, v, p.amount)), `Convention_${v.id}.pdf`)} />
          ))}
          {Object.entries({ rib: 'RIB', id: 'Pièce d’identité', domicile: 'Justificatif de domicile' }).map(([k, t]) => (
            <DocRow key={k} name={`KYC — ${t}`} meta={me.kyc?.[k] || 'Non déposé'} ok={!!me.kyc?.[k]} />
          ))}
        </Card>
      </section>
    </div>
  );
}

const DocRow = ({ name, meta, ok, onDl }) => (
  <div className="flex items-center justify-between gap-3 px-4 py-3">
    <div className="min-w-0">
      <div className="truncate text-sm text-white">{name}</div>
      <div className={`text-xs ${ok ? 'text-zinc-400' : 'text-red-300'}`}>{meta}</div>
    </div>
    {onDl && ok && <DlBtn onClick={onDl}>PDF</DlBtn>}
  </div>
);
