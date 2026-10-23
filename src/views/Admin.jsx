import { useState } from 'react';
import { Users, Car, PlusCircle, Settings, Check, X, Eye, FileCheck2, UserCheck } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Btn, Badge, Card, Field, Input, inputCls, FileDrop, Modal, SectionTitle } from '../components/ui.jsx';
import AdminVehicles from './AdminVehicles.jsx';
import { M, dateFr } from '../lib/calc.js';
import { carSvg } from '../lib/placeholder.js';

const TABS = [
  ['members', Users, 'Membres & parrainages'],
  ['vehicles', Car, 'Véhicules & virements'],
  ['new', PlusCircle, 'Nouveau véhicule'],
  ['settings', Settings, 'RIB & modèles'],
];

function Members() {
  const { state, dispatch } = useStore();
  const [view, setView] = useState(null);
  const by = (st) => state.members.filter((m) => st.includes(m.status));
  const KycBtns = ({ m }) => (
    <div className="flex flex-wrap gap-1.5">
      {[['rib', 'RIB'], ['id', 'ID'], ['domicile', 'Domicile']].map(([k, t]) => (
        <Btn key={k} variant="outline" size="sm" disabled={!m.kyc?.[k]} onClick={() => setView({ m, name: m.kyc[k], t, url: m.kycUrl?.[k] })}><Eye size={13} /> {t}</Btn>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle icon={UserCheck}>Demandes — Étape 1 ({by([M.ATT]).length})</SectionTitle>
        <div className="space-y-2">
          {by([M.ATT]).length === 0 && <p className="text-sm text-zinc-500">Aucune demande en attente.</p>}
          {by([M.ATT]).map((m) => (
            <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-white">{m.prenom} {m.nom}</div>
                <div className="text-xs text-zinc-400">Parrain : <b className="text-gold-300">{m.parrain}</b> · demande du {dateFr(m.createdAt)}</div>
              </div>
              <div className="flex gap-2">
                <Btn variant="success" size="sm" onClick={() => dispatch({ type: 'APPROVE_STEP1', id: m.id })}><Check size={14} /> Valider vers Étape 2</Btn>
                <Btn variant="danger" size="sm" onClick={() => dispatch({ type: 'REFUSE', id: m.id })}><X size={14} /> Refuser</Btn>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={FileCheck2}>Membres en Étape 2 ({by([M.E2, M.KYC]).length})</SectionTitle>
        <div className="space-y-2">
          {by([M.E2, M.KYC]).map((m) => (
            <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-white">{m.prenom} {m.nom}</div>
                <div className="text-xs text-zinc-400">Parrain : {m.parrain}{m.email && ` · ${m.email}`}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {m.status === M.E2 ? <Badge tone="gold">KYC non complété</Badge> : <><KycBtns m={m} /><Badge tone={m.charte ? 'green' : 'amber'}>{m.charte ? 'Charte signée' : 'Charte non signée'}</Badge></>}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={Users}>Membres actifs ({by([M.ACTIF]).length})</SectionTitle>
        <Card className="overflow-x-auto !p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500"><tr><th className="p-3">#</th><th>Membre</th><th>Parrain</th><th>Pièces KYC</th><th>Charte</th></tr></thead>
            <tbody className="divide-y divide-ink-700">
              {by([M.ACTIF]).map((m) => (
                <tr key={m.id}>
                  <td className="p-3 text-gold-300">#{m.num}</td>
                  <td className="text-white">{m.prenom} {m.nom}</td>
                  <td className="text-zinc-400">{m.parrain}</td>
                  <td><KycBtns m={m} /></td>
                  <td><Badge tone="green">Signée {dateFr(m.charte?.date)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <Modal open={!!view} onClose={() => setView(null)} title={view ? `${view.t} — ${view.m.prenom} ${view.m.nom}` : ''}>
        <div className="rounded-xl border border-dashed border-ink-600 bg-ink-950 p-10 text-center text-sm text-zinc-400">
          <FileCheck2 className="mx-auto mb-3 text-gold-400" size={32} />
          <div className="font-mono text-white">{view?.name}</div>
          {view?.url ? (
            <>
              {/\.(png|jpe?g|webp)$/i.test(view.name || '') && <img src={view.url} alt={view.t} className="mx-auto mt-4 max-h-80 rounded-lg" />}
              <a href={view.url} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-xl bg-gold-400 px-4 py-2 font-semibold text-ink-950">Ouvrir le document</a>
            </>
          ) : (
            <p className="mt-2 text-xs">Aperçu simulé (mode démo).</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function NewVehicle() {
  const { dispatch } = useStore();
  const empty = { marque: '', modele: '', finition: '', motorisation: '', annee: '', km: '', prixAchat: '', margeVisee: '', pctRoyalties: '40', infos: '' };
  const [f, setF] = useState(empty);
  const [photos, setPhotos] = useState(['', '', '']);
  const [photoFiles, setPhotoFiles] = useState([null, null, null]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ok = ['marque', 'modele', 'finition', 'motorisation', 'annee', 'km', 'prixAchat', 'margeVisee', 'pctRoyalties'].every((k) => f[k] !== '') && +f.prixAchat > 0 && +f.pctRoyalties <= 100;

  const pickFile = (i, file) => {
    setPhotoFiles((a) => a.map((x, j) => (j === i ? file : x)));
    const r = new FileReader();
    r.onload = () => setPhotos((p) => p.map((x, j) => (j === i ? r.result : x)));
    r.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    const hue = ['#c0392b', '#2f6fdb', '#16a085', '#8e44ad', '#e67e22'][Math.floor(Math.random() * 5)];
    const ok = await dispatch({
      type: 'CREATE_VEHICLE',
      vehicle: {
        ...f, annee: +f.annee, km: +f.km, prixAchat: +f.prixAchat, margeVisee: +f.margeVisee, pctRoyalties: +f.pctRoyalties,
        photos: photos.map((p, i) => p.trim() || carSvg(hue, i)),
        photoFiles,
      },
    });
    if (ok === false) return;
    setF(empty);
    setPhotos(['', '', '']);
    setPhotoFiles([null, null, null]);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="space-y-4">
        <SectionTitle icon={Car}>Véhicule</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Marque"><Input value={f.marque} onChange={set('marque')} /></Field>
          <Field label="Modèle"><Input value={f.modele} onChange={set('modele')} /></Field>
          <Field label="Finition"><Input value={f.finition} onChange={set('finition')} /></Field>
          <Field label="Motorisation"><Input value={f.motorisation} onChange={set('motorisation')} /></Field>
          <Field label="Année"><Input type="number" value={f.annee} onChange={set('annee')} /></Field>
          <Field label="Kilométrage"><Input type="number" value={f.km} onChange={set('km')} /></Field>
        </div>
      </Card>
      <Card className="space-y-4">
        <SectionTitle>Photos (URL ou fichier) — 3 visuels</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {photos.map((p, i) => (
            <div key={i} className="space-y-2">
              <Input placeholder={`URL photo ${i + 1}`} value={p.startsWith('data:') ? '(fichier chargé)' : p} onChange={(e) => setPhotos(photos.map((x, j) => (j === i ? e.target.value : x)))} />
              <FileDrop label={`Photo ${i + 1}`} file={p.startsWith('data:') ? { name: 'image chargée' } : null} onFile={(file) => pickFile(i, file)} />
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-500">Sans photo, un visuel de démonstration est généré.</p>
      </Card>
      <Card className="space-y-4">
        <SectionTitle>Données financières</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Prix d'achat convenu (€)"><Input type="number" min="1" value={f.prixAchat} onChange={set('prixAchat')} /></Field>
          <Field label="Marge nette HT visée (€)"><Input type="number" value={f.margeVisee} onChange={set('margeVisee')} /></Field>
          <Field label="% de marge alloué aux royalties"><Input type="number" min="0" max="100" value={f.pctRoyalties} onChange={set('pctRoyalties')} /></Field>
        </div>
        <Field label="Infos complémentaires (visibles sur la fiche)"><textarea rows={4} className={inputCls} value={f.infos} onChange={set('infos')} placeholder="État mécanique, historique, stratégie de revente…" /></Field>
      </Card>
      <Btn type="submit" size="lg" disabled={!ok}>Créer le véhicule et ouvrir le financement</Btn>
    </form>
  );
}

const VARS = ['nom_investisseur', 'prenom_investisseur', 'date_naissance', 'lieu_naissance', 'marque', 'modele', 'finition', 'motorisation', 'annee', 'kilometrage', 'prix_achat', 'montant_investi', 'quote_part_pourcentage', 'pourcentage_royalties', 'marge_visee_ht'];

function Settings_() {
  const { state, dispatch } = useStore();
  const [rib, setRib] = useState(state.rib);
  const [t, setT] = useState(state.templates);
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <SectionTitle icon={Settings}>RIB de l’entreprise (affiché lors des appels de fonds)</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {[['titulaire', 'Titulaire du compte'], ['banque', 'Banque'], ['iban', 'IBAN'], ['bic', 'BIC']].map(([k, l]) => (
            <Field key={k} label={l}><Input value={rib[k]} onChange={(e) => setRib({ ...rib, [k]: e.target.value })} /></Field>
          ))}
        </div>
        <Btn onClick={() => dispatch({ type: 'SET_RIB', rib })}>Enregistrer le RIB</Btn>
      </Card>
      {[['charte', 'Charte / Convention-cadre initiale', ['nom', 'prenom', 'date_naissance', 'lieu_naissance', 'date_du_jour']], ['convention', 'Convention de revenus futurs (par véhicule)', [...VARS, 'date_du_jour']]].map(([k, title, vars]) => (
        <Card key={k} className="space-y-3">
          <SectionTitle>{title}</SectionTitle>
          <div className="flex flex-wrap gap-1.5">{vars.map((v) => <code key={v} className="rounded bg-ink-800 px-1.5 py-0.5 text-[11px] text-gold-300">{`{{${v}}}`}</code>)}</div>
          <textarea rows={14} className={`${inputCls} font-mono text-xs leading-relaxed`} value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })} />
          <Btn onClick={() => dispatch({ type: 'SET_TEMPLATE', key: k, text: t[k] })}>Enregistrer le modèle</Btn>
        </Card>
      ))}
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('members');
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-ink-700 bg-ink-900 p-1">
        {TABS.map(([id, Icon, text]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${tab === id ? 'bg-ink-700 text-white' : 'text-zinc-400 hover:text-white'}`}>
            <Icon size={16} /> {text}
          </button>
        ))}
      </div>
      {tab === 'members' && <Members />}
      {tab === 'vehicles' && <AdminVehicles />}
      {tab === 'new' && <NewVehicle />}
      {tab === 'settings' && <Settings_ />}
    </main>
  );
}
