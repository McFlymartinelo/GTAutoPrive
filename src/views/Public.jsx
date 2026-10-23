import { useState } from 'react';
import { Crown, Lock, UserPlus, Clock, ArrowRight, TrendingUp } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Btn, Card, Field, Input } from '../components/ui.jsx';
import { clubStats, MAX_MEMBERS } from '../lib/calc.js';

export default function Public() {
  const { state, dispatch, candidate } = useStore();
  const [f, setF] = useState({ nom: '', prenom: '', parrain: '' });
  const [sent, setSent] = useState(false);
  const st = clubStats(state);
  const valid = f.nom.trim() && f.prenom.trim() && f.parrain.trim();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    dispatch({ type: 'SUBMIT_REQUEST', nom: f.nom.trim(), prenom: f.prenom.trim(), parrain: f.parrain.trim() });
    setSent(true);
  };

  return (
    <main className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
      <section>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-300">
          <Lock size={12} /> Accès sur parrainage uniquement
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
          Le club privé de <span className="text-gold-400">l’investissement automobile</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-zinc-400">
          Finançons ensemble l’achat de véhicules d’exception, revendus par un opérateur professionnel. La marge nette est partagée sous forme de royalties.
        </p>
        <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-zinc-400"><Crown size={13} className="text-gold-400" /> Places</div>
            <div className="font-display mt-1 text-2xl font-semibold text-white">{st.membres} <span className="text-base text-zinc-500">/ {MAX_MEMBERS}</span></div>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-zinc-400"><TrendingUp size={13} className="text-gold-400" /> Rotation moy.</div>
            <div className="font-display mt-1 text-2xl font-semibold text-white">{Math.round(st.rotation)} <span className="text-base text-zinc-500">jours</span></div>
          </Card>
        </div>
        <p className="mt-6 max-w-xl text-xs text-zinc-500">
          Tout investissement comporte un risque de perte partielle ou totale du capital. Les rendements passés ne préjugent pas des rendements futurs.
        </p>
      </section>

      <Card className="!p-6 sm:!p-8">
        {!sent ? (
          <form onSubmit={submit} className="space-y-4">
            <h2 className="font-display flex items-center gap-2 text-xl font-semibold text-white"><UserPlus size={20} className="text-gold-400" /> Demande d’accès — Étape 1</h2>
            <p className="text-sm text-zinc-400">Trois informations suffisent. Votre parrain sera contacté par l’opérateur.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom"><Input required value={f.prenom} onChange={set('prenom')} placeholder="Camille" /></Field>
              <Field label="Nom"><Input required value={f.nom} onChange={set('nom')} placeholder="Dubois" /></Field>
            </div>
            <Field label="Nom et prénom du parrain" hint="Obligatoire — membre actuel du Club"><Input required value={f.parrain} onChange={set('parrain')} placeholder="Claire Fontaine" /></Field>
            <Btn type="submit" size="lg" disabled={!valid} className="w-full">Envoyer ma demande <ArrowRight size={18} /></Btn>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-400/15 text-gold-300"><Clock size={26} /></div>
            <h2 className="font-display text-xl font-semibold text-white">Demande reçue, {candidate?.prenom}</h2>
            <p className="text-sm text-zinc-400">Votre profil est au statut <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs text-gold-300">EN_ATTENTE_VALIDATION_ADMIN</code>. L’opérateur vérifie la recommandation de <b className="text-white">{candidate?.parrain}</b>.</p>
            <p className="text-xs text-zinc-500">Démo : autorisez la demande depuis l’Espace Admin, puis ouvrez « Onboarding KYC ».</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Btn variant="outline" onClick={() => dispatch({ type: 'VIEW', view: 'admin' })}>Aller à l’admin</Btn>
              <Btn onClick={() => dispatch({ type: 'VIEW', view: 'onboarding' })}>Voir mon onboarding</Btn>
            </div>
            <button className="text-xs text-zinc-500 underline" onClick={() => { setSent(false); setF({ nom: '', prenom: '', parrain: '' }); }}>Nouvelle demande</button>
          </div>
        )}
      </Card>
    </main>
  );
}
