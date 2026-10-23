import { useState } from 'react';
import { Lock, Check, FileSignature, PartyPopper, XCircle } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Btn, Card, Field, Input, FileDrop } from '../components/ui.jsx';
import SignatureModal from '../components/SignatureModal.jsx';
import { M, render, charteVars } from '../lib/calc.js';

const STEPS = ['Demande', 'Inscription & KYC', 'Charte du Club'];

function Stepper({ at }) {
  return (
    <ol className="mb-8 flex items-center justify-center gap-2 text-xs sm:text-sm">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${i < at ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300' : i === at ? 'border-gold-400 bg-gold-400 text-ink-950' : 'border-ink-600 text-zinc-500'}`}>
            {i < at ? <Check size={14} /> : i + 1}
          </span>
          <span className={`hidden sm:inline ${i === at ? 'text-white' : 'text-zinc-500'}`}>{s}</span>
          {i < 2 && <span className="mx-1 h-px w-6 bg-ink-600 sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}

function KycForm({ c }) {
  const { dispatch } = useStore();
  const [f, setF] = useState({ dob: '', lieu: '', email: '', pwd: '', pwd2: '' });
  const [files, setFiles] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pwdOk = f.pwd.length >= 8 && f.pwd === f.pwd2;
  const ok = f.dob && f.lieu && /\S+@\S+\.\S+/.test(f.email) && pwdOk && files.rib && files.id && files.domicile;

  const submit = (e) => {
    e.preventDefault();
    // Le mot de passe n'est jamais conservé dans l'état de démo : à envoyer à l'API d'auth au branchement.
    const kyc = Object.fromEntries(Object.entries(files).map(([k, file]) => [k, file.name]));
    dispatch({ type: 'SUBMIT_KYC', id: c.id, data: { dob: f.dob, lieu: f.lieu, email: f.email, kyc, charte: null } });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-white">Complétez votre profil</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom"><Input value={c.prenom} disabled /></Field>
        <Field label="Nom"><Input value={c.nom} disabled /></Field>
        <Field label="Date de naissance"><Input type="date" required value={f.dob} onChange={set('dob')} /></Field>
        <Field label="Lieu de naissance"><Input required value={f.lieu} onChange={set('lieu')} /></Field>
        <Field label="Adresse e-mail" className="sm:col-span-2"><Input type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Mot de passe" hint="8 caractères minimum"><Input type="password" required value={f.pwd} onChange={set('pwd')} autoComplete="new-password" /></Field>
        <Field label="Confirmation"><Input type="password" required value={f.pwd2} onChange={set('pwd2')} autoComplete="new-password" /></Field>
      </div>
      {f.pwd2 && !pwdOk && <p className="text-xs text-red-400">Les mots de passe doivent correspondre (8 caractères minimum).</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <FileDrop label="RIB" file={files.rib} onFile={(x) => setFiles({ ...files, rib: x })} />
        <FileDrop label="Pièce d’identité" file={files.id} onFile={(x) => setFiles({ ...files, id: x })} />
        <FileDrop label="Justificatif de domicile" file={files.domicile} onFile={(x) => setFiles({ ...files, domicile: x })} />
      </div>
      <Btn type="submit" size="lg" disabled={!ok} className="w-full">Envoyer mon dossier KYC</Btn>
    </form>
  );
}

export default function Onboarding() {
  const { state, dispatch, candidate: c } = useStore();
  const [open, setOpen] = useState(false);

  if (!c) return null;
  const at = c.status === M.ATT || c.status === M.REFUSE ? 0 : c.status === M.E2 ? 1 : c.status === M.KYC ? 2 : 3;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Stepper at={at} />
      <Card className="!p-6 sm:!p-8">
        {c.status === M.ATT && (
          <div className="space-y-4 text-center">
            <Lock className="mx-auto text-gold-400" size={36} />
            <h2 className="font-display text-xl font-semibold text-white">Étape 2 verrouillée</h2>
            <p className="text-sm text-zinc-400">La demande de {c.prenom} {c.nom} (parrain : {c.parrain}) attend la validation de l’opérateur.</p>
            <Btn onClick={() => dispatch({ type: 'VIEW', view: 'admin' })}>Ouvrir l’Espace Admin</Btn>
          </div>
        )}
        {c.status === M.REFUSE && (
          <div className="space-y-3 text-center">
            <XCircle className="mx-auto text-red-400" size={36} />
            <h2 className="font-display text-xl font-semibold text-white">Demande non retenue</h2>
          </div>
        )}
        {c.status === M.E2 && <KycForm c={c} />}
        {c.status === M.KYC && (
          <div className="space-y-4">
            <h2 className="font-display flex items-center gap-2 text-xl font-semibold text-white"><FileSignature className="text-gold-400" /> Charte d’adhésion & risques</h2>
            <p className="text-sm text-zinc-400">Dossier KYC reçu. Signez la charte pour pouvoir promettre des fonds.</p>
            <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-ink-700 bg-ink-950 p-4 font-sans text-[13px] leading-relaxed text-zinc-300">
              {render(state.templates.charte, charteVars(c))}
            </pre>
            <Btn size="lg" className="w-full" onClick={() => setOpen(true)}>Lire et signer</Btn>
            <SignatureModal
              open={open}
              onClose={() => setOpen(false)}
              title="Signature de la Charte"
              text={render(state.templates.charte, charteVars(c))}
              onSigned={async (sig) => { const ok = await dispatch({ type: 'SIGN_CHARTE', id: c.id, signature: sig }); if (ok !== false) setOpen(false); }}
            />
          </div>
        )}
        {c.status === M.ACTIF && (
          <div className="space-y-4 text-center">
            <PartyPopper className="mx-auto text-gold-400" size={38} />
            <h2 className="font-display text-xl font-semibold text-white">Bienvenue, {c.prenom} !</h2>
            <p className="text-sm text-zinc-400">Votre charte est signée : vous pouvez désormais promettre des fonds sur les véhicules.</p>
            <Btn size="lg" onClick={() => { dispatch({ type: 'SET_USER', id: c.id }); dispatch({ type: 'VIEW', view: 'client' }); }}>Accéder à mon espace</Btn>
          </div>
        )}
      </Card>
    </main>
  );
}
