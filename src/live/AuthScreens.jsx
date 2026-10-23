import { useState } from 'react';
import { Crown, Lock, LogIn, UserPlus, FolderOpen, Clock, XCircle, CheckCircle2, Copy } from 'lucide-react';
import { api } from '../lib/api.js';
import { Btn, Card, Field, Input, FileDrop } from '../components/ui.jsx';

const Err = ({ children }) => (children ? <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{children}</p> : null);

// Petit hook de formulaire asynchrone : gère chargement + erreur.
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function Login({ onAuth }) {
  const [f, setF] = useState({ email: '', password: '' });
  const { busy, error, run } = useAction();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => onAuth((await api('/auth/login', { method: 'POST', json: f })).user));
      }}
    >
      <h2 className="font-display text-xl font-semibold text-white">Connexion</h2>
      <Field label="Adresse e-mail"><Input type="email" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Mot de passe"><Input type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      <Err>{error}</Err>
      <Btn type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</Btn>
    </form>
  );
}

function Apply({ goResume }) {
  const [f, setF] = useState({ prenom: '', nom: '', parrain: '' });
  const [code, setCode] = useState('');
  const { busy, error, run } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (code)
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-400/15 text-gold-300"><Clock size={26} /></div>
        <h2 className="font-display text-xl font-semibold text-white">Demande envoyée</h2>
        <p className="text-sm text-zinc-400">Votre parrain <b className="text-white">{f.parrain}</b> sera contacté. Conservez précieusement votre <b className="text-white">numéro de dossier</b> : il vous permettra de reprendre votre inscription une fois la demande validée.</p>
        <div className="rounded-xl border border-gold-400/40 bg-gold-400/10 p-4">
          <div className="font-mono text-2xl font-bold tracking-widest text-gold-300">{code}</div>
          <button className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white" onClick={() => navigator.clipboard?.writeText(code)}><Copy size={12} /> Copier</button>
        </div>
        <Btn variant="outline" onClick={() => goResume(code)}>Suivre mon dossier</Btn>
      </div>
    );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => setCode((await api('/requests', { method: 'POST', json: f })).code));
      }}
    >
      <h2 className="font-display text-xl font-semibold text-white">Demande d’accès — Étape 1</h2>
      <p className="text-sm text-zinc-400">Accès sur parrainage uniquement. Trois informations suffisent.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom"><Input required value={f.prenom} onChange={set('prenom')} /></Field>
        <Field label="Nom"><Input required value={f.nom} onChange={set('nom')} /></Field>
      </div>
      <Field label="Nom et prénom du parrain" hint="Obligatoire — membre actuel du Club"><Input required value={f.parrain} onChange={set('parrain')} /></Field>
      <Err>{error}</Err>
      <Btn type="submit" size="lg" className="w-full" disabled={busy}>Envoyer ma demande</Btn>
    </form>
  );
}

function CompleteForm({ code, onAuth }) {
  const [f, setF] = useState({ dob: '', lieu: '', email: '', pwd: '', pwd2: '' });
  const [files, setFiles] = useState({});
  const { busy, error, run } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pwdOk = f.pwd.length >= 10 && f.pwd === f.pwd2;
  const ok = f.dob && f.lieu && f.email && pwdOk && files.rib && files.id && files.domicile;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const fd = new FormData();
          fd.append('code', code);
          fd.append('dob', f.dob);
          fd.append('lieu', f.lieu);
          fd.append('email', f.email);
          fd.append('password', f.pwd);
          ['rib', 'id', 'domicile'].forEach((k) => fd.append(k, files[k]));
          onAuth((await api('/requests/complete', { method: 'POST', form: fd })).user);
        });
      }}
    >
      <h2 className="font-display text-xl font-semibold text-white">Étape 2 — Inscription & KYC</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date de naissance"><Input type="date" required value={f.dob} onChange={set('dob')} /></Field>
        <Field label="Lieu de naissance"><Input required value={f.lieu} onChange={set('lieu')} /></Field>
        <Field label="Adresse e-mail" className="sm:col-span-2"><Input type="email" required autoComplete="username" value={f.email} onChange={set('email')} /></Field>
        <Field label="Mot de passe" hint="10 caractères minimum"><Input type="password" required autoComplete="new-password" value={f.pwd} onChange={set('pwd')} /></Field>
        <Field label="Confirmation"><Input type="password" required autoComplete="new-password" value={f.pwd2} onChange={set('pwd2')} /></Field>
      </div>
      {f.pwd2 && !pwdOk && <p className="text-xs text-red-400">Les mots de passe doivent correspondre (10 caractères minimum).</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <FileDrop label="RIB" file={files.rib} onFile={(x) => setFiles({ ...files, rib: x })} />
        <FileDrop label="Pièce d’identité" file={files.id} onFile={(x) => setFiles({ ...files, id: x })} />
        <FileDrop label="Justificatif de domicile" file={files.domicile} onFile={(x) => setFiles({ ...files, domicile: x })} />
      </div>
      <p className="text-xs text-zinc-500">PDF ou image (JPG, PNG, WebP), 15 Mo max par fichier. Vos pièces sont stockées de façon privée et accessibles à l’opérateur uniquement.</p>
      <Err>{error}</Err>
      <Btn type="submit" size="lg" className="w-full" disabled={!ok || busy}>{busy ? 'Envoi…' : 'Créer mon compte et envoyer mon dossier'}</Btn>
    </form>
  );
}

function Resume({ onAuth, initial = '' }) {
  const [code, setCode] = useState(initial);
  const [info, setInfo] = useState(null);
  const { busy, error, run } = useAction();
  const check = (e) => {
    e?.preventDefault();
    run(async () => setInfo({ ...(await api('/requests/status', { method: 'POST', json: { code } })), code: code.toUpperCase().trim() }));
  };

  if (info?.status === 'ETAPE2_AUTORISEE' && !info.hasAccount)
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"><CheckCircle2 size={16} /> Bonjour {info.prenom} {info.nom}, votre demande est validée.</p>
        <CompleteForm code={info.code} onAuth={onAuth} />
      </div>
    );

  return (
    <form className="space-y-4" onSubmit={check}>
      <h2 className="font-display text-xl font-semibold text-white">Reprendre mon dossier</h2>
      <Field label="Numéro de dossier"><Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="GT-XXXXXXXX" className="font-mono uppercase" /></Field>
      <Err>{error}</Err>
      <Btn type="submit" size="lg" className="w-full" disabled={busy}><FolderOpen size={16} /> Vérifier l’avancement</Btn>
      {info && info.status === 'EN_ATTENTE_VALIDATION_ADMIN' && <p className="flex items-center gap-2 text-sm text-amber-300"><Clock size={16} /> {info.prenom}, votre demande est en cours de validation par l’opérateur.</p>}
      {info && info.status === 'REFUSE' && <p className="flex items-center gap-2 text-sm text-red-300"><XCircle size={16} /> Votre demande n’a pas été retenue.</p>}
      {info && info.hasAccount && <p className="text-sm text-zinc-300">Votre compte existe déjà : utilisez l’onglet « Connexion ».</p>}
    </form>
  );
}

const TABS = [['login', LogIn, 'Connexion'], ['apply', UserPlus, 'Candidater'], ['resume', FolderOpen, 'Mon dossier']];

export default function AuthScreens({ onAuth }) {
  const [tab, setTab] = useState('login');
  const [prefill, setPrefill] = useState('');
  // Toast : le contexte n'existe pas avant connexion, on n'en a pas besoin ici.
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
      <section>
        <div className="font-display mb-6 flex items-center gap-2 text-lg font-semibold text-gold-300"><Crown size={20} /> GT Auto Privé</div>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-300"><Lock size={12} /> Accès sur parrainage — 149 membres maximum</div>
        <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl">Le club privé de <span className="text-gold-400">l’investissement automobile</span></h1>
        <p className="mt-5 max-w-xl text-lg text-zinc-400">Finançons ensemble l’achat de véhicules, revendus par un opérateur professionnel. La marge nette est partagée sous forme de royalties.</p>
        <p className="mt-6 max-w-xl text-xs text-zinc-500">Tout investissement comporte un risque de perte partielle ou totale du capital.</p>
        <a href="#demo" className="mt-6 inline-block text-sm text-zinc-400 underline hover:text-gold-300">Voir le mode démonstration</a>
      </section>
      <Card className="!p-6 sm:!p-8">
        <div className="mb-6 flex gap-1 rounded-xl bg-ink-800 p-1">
          {TABS.map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm ${tab === id ? 'bg-gold-400 text-ink-950' : 'text-zinc-400 hover:text-white'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        {tab === 'login' && <Login onAuth={onAuth} />}
        {tab === 'apply' && <Apply goResume={(c) => { setPrefill(c); setTab('resume'); }} />}
        {tab === 'resume' && <Resume onAuth={onAuth} initial={prefill} />}
      </Card>
    </main>
  );
}
