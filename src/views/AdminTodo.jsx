import { CheckCircle2, Clock, Hourglass, Banknote, Flag, UserCheck, FileSignature } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Badge, Card, Progress, SectionTitle, Btn } from '../components/ui.jsx';
import { label } from '../components/vehicle.jsx';
import { S, M, eur0, funded, progress } from '../lib/calc.js';

const memberName = (members, uid) => {
  const m = members.find((x) => x.id === uid);
  return m ? `${m.num != null ? `#${m.num} ` : ''}${m.prenom} ${m.nom}` : uid;
};
const daysSince = (d) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d)) / 86_400_000)) : 0);

// Tout ce qui attend une action de l'administrateur.
export function adminTodo(state) {
  const { vehicles, members } = state;
  const requests = members.filter((m) => m.status === M.ATT);
  const kyc = members.filter((m) => m.status === M.KYC);
  const toConfirm = [];
  const toSign = [];
  const ready = [];
  for (const v of vehicles.filter((x) => x.status === S.F100)) {
    for (const p of v.pledges) {
      if (p.contractSigned && p.payment !== 'RECU') toConfirm.push({ v, p });
      if (!p.contractSigned) toSign.push({ v, p });
    }
    if (v.pledges.length && v.pledges.every((p) => p.contractSigned && p.payment === 'RECU')) ready.push(v);
  }
  const toClose = vehicles.filter((v) => v.status === S.COM);
  const financing = vehicles.filter((v) => v.status === S.FIN);
  const actionable = requests.length + toConfirm.length + ready.length + toClose.length;
  return { requests, kyc, toConfirm, toSign, ready, toClose, financing, actionable };
}

const Counter = ({ icon: Icon, label: l, n, onClick }) => (
  <button onClick={onClick} className={`rounded-2xl border p-4 text-left transition hover:border-gold-400 ${n ? 'border-gold-400/50 bg-gold-400/10' : 'border-ink-700 bg-ink-900/80'}`}>
    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400"><Icon size={14} className="text-gold-400" /> {l}</div>
    <div className={`font-display text-3xl font-semibold ${n ? 'text-gold-300' : 'text-zinc-500'}`}>{n}</div>
  </button>
);

const Row = ({ icon: Icon, tone = 'gold', title, sub, onOpen, cta = 'Ouvrir' }) => (
  <Card className="flex flex-wrap items-center justify-between gap-3 !p-3.5">
    <div className="flex min-w-0 items-center gap-3">
      <Icon size={18} className={tone === 'amber' ? 'text-amber-300' : tone === 'green' ? 'text-emerald-300' : 'text-gold-400'} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{title}</div>
        {sub && <div className="text-xs text-zinc-400">{sub}</div>}
      </div>
    </div>
    <Btn variant="outline" size="sm" onClick={onOpen}>{cta}</Btn>
  </Card>
);

export default function AdminTodo({ go }) {
  const { state } = useStore();
  const t = adminTodo(state);
  const { members } = state;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Counter icon={UserCheck} label="Demandes à valider" n={t.requests.length} onClick={() => go('members')} />
        <Counter icon={Banknote} label="Virements à confirmer" n={t.toConfirm.length} onClick={() => go('vehicles', t.toConfirm[0]?.v.id)} />
        <Counter icon={Flag} label="Prêts à commercialiser" n={t.ready.length} onClick={() => go('vehicles', t.ready[0]?.id)} />
        <Counter icon={Hourglass} label="Ventes à clôturer" n={t.toClose.length} onClick={() => go('vehicles', t.toClose[0]?.id)} />
      </div>

      <section>
        <SectionTitle icon={CheckCircle2}>À traiter ({t.actionable})</SectionTitle>
        <div className="space-y-2">
          {t.actionable === 0 && <p className="text-sm text-zinc-500">Tout est à jour : aucune action en attente.</p>}
          {t.requests.map((m) => (
            <Row key={m.id} icon={UserCheck} title={`Demande de ${m.prenom} ${m.nom}`} sub={`Parrain : ${m.parrain}`} onOpen={() => go('members')} cta="Examiner" />
          ))}
          {t.toConfirm.map(({ v, p }) => (
            <Row
              key={v.id + p.uid}
              icon={Banknote}
              title={`${memberName(members, p.uid)} — ${eur0(p.amount)}`}
              sub={`${label(v)} · ${p.payment === 'DECLARE' ? 'virement déclaré par l’investisseur' : 'convention signée, virement non déclaré'}`}
              onOpen={() => go('vehicles', v.id)}
              cta="Confirmer"
            />
          ))}
          {t.ready.map((v) => (
            <Row key={v.id} icon={Flag} tone="green" title={`${label(v)} : financement complet et encaissé`} sub="Toutes les conventions sont signées et tous les virements reçus." onOpen={() => go('vehicles', v.id)} cta="Commercialiser" />
          ))}
          {t.toClose.map((v) => {
            const d = daysSince(v.dateCom);
            return <Row key={v.id} icon={Hourglass} tone={d > 60 ? 'amber' : 'gold'} title={`${label(v)} : en vente depuis ${d} j`} sub={`Valeur de vente actuelle ${eur0(v.valeurVente)}`} onOpen={() => go('vehicles', v.id)} cta="Clôturer" />;
          })}
        </div>
      </section>

      {(t.toSign.length > 0 || t.kyc.length > 0) && (
        <section>
          <SectionTitle icon={Clock}>En attente des investisseurs</SectionTitle>
          <div className="space-y-2">
            {t.kyc.length > 0 && <Row icon={FileSignature} tone="amber" title={`${t.kyc.length} dossier(s) KYC en attente de signature de la charte`} sub={t.kyc.map((m) => `${m.prenom} ${m.nom}`).join(', ')} onOpen={() => go('members')} />}
            {t.toSign.map(({ v, p }) => (
              <Row key={v.id + p.uid} icon={FileSignature} tone="amber" title={`${memberName(members, p.uid)} n’a pas signé la convention`} sub={`${label(v)} · ${eur0(p.amount)}`} onOpen={() => go('vehicles', v.id)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>En cours de financement ({t.financing.length})</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {t.financing.length === 0 && <p className="text-sm text-zinc-500">Aucun véhicule ouvert aux promesses.</p>}
          {t.financing.map((v) => (
            <button key={v.id} onClick={() => go('vehicles', v.id)} className="rounded-2xl border border-ink-700 bg-ink-900/80 p-4 text-left transition hover:border-gold-400">
              <div className="mb-2 flex items-center justify-between gap-2"><span className="font-medium text-white">{label(v)}</span><Badge tone="gold">{Math.round(progress(v))} %</Badge></div>
              <Progress value={progress(v)} />
              <div className="mt-1.5 text-xs text-zinc-400">{eur0(funded(v))} sur {eur0(v.prixAchat)} · {v.pledges.length} investisseur(s)</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
