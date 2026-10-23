import { useState } from 'react';
import { Lock, Pencil } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Btn, CarImg, Field, FileDrop, Input, Modal, inputCls } from '../components/ui.jsx';
import { label } from '../components/vehicle.jsx';

const isStored = (p) => p.startsWith('data:') || p.startsWith('/api/files/');

// Modification d'un véhicule à tout moment. Les champs financiers se verrouillent quand des engagements en dépendent :
//  - prix d'achat : dès la première promesse (les quotes-parts en dépendent) ;
//  - marge visée et % de royalties : dès la première convention signée (leur texte les reprend).
export default function AdminVehicleEdit({ v, onClose }) {
  const { dispatch } = useStore();
  const lockPrice = v.pledges.length > 0;
  const lockTerms = v.pledges.some((p) => p.contractSigned);
  const [f, setF] = useState({
    marque: v.marque, modele: v.modele, finition: v.finition, motorisation: v.motorisation,
    annee: String(v.annee), km: String(v.km), prixAchat: String(v.prixAchat), margeVisee: String(v.margeVisee),
    pctRoyalties: String(v.pctRoyalties), infos: v.infos || '',
  });
  const [photos, setPhotos] = useState([0, 1, 2].map((i) => v.photos?.[i] || ''));
  const [files, setFiles] = useState([null, null, null]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ok = ['marque', 'modele', 'finition', 'motorisation', 'annee', 'km', 'prixAchat', 'margeVisee', 'pctRoyalties'].every((k) => f[k].trim() !== '') && +f.prixAchat > 0 && +f.pctRoyalties >= 0 && +f.pctRoyalties <= 100;

  const pick = (i, file) => {
    setFiles((a) => a.map((x, j) => (j === i ? file : x)));
    const r = new FileReader();
    r.onload = () => setPhotos((p) => p.map((x, j) => (j === i ? r.result : x)));
    r.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await dispatch({
      type: 'EDIT_VEHICLE',
      vid: v.id,
      vehicle: { ...f, annee: +f.annee, km: +f.km, prixAchat: +f.prixAchat, margeVisee: +f.margeVisee, pctRoyalties: +f.pctRoyalties, photos },
      photoFiles: files,
      origPhotos: v.photos || [],
    });
    setBusy(false);
    if (res !== false) onClose();
  };

  const Locked = ({ why }) => <span className="mt-1 flex items-center gap-1 text-xs text-amber-300"><Lock size={11} /> {why}</span>;

  return (
    <Modal open onClose={onClose} title={`Modifier — ${label(v)} (${v.id})`} wide>
      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Marque"><Input value={f.marque} onChange={set('marque')} /></Field>
          <Field label="Modèle"><Input value={f.modele} onChange={set('modele')} /></Field>
          <Field label="Finition"><Input value={f.finition} onChange={set('finition')} /></Field>
          <Field label="Motorisation"><Input value={f.motorisation} onChange={set('motorisation')} /></Field>
          <Field label="Année"><Input type="number" value={f.annee} onChange={set('annee')} /></Field>
          <Field label="Kilométrage"><Input type="number" value={f.km} onChange={set('km')} /></Field>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Photos</div>
          <div className="grid gap-4 sm:grid-cols-3">
            {photos.map((p, i) => (
              <div key={i} className="space-y-2">
                {p ? <CarImg src={p} alt={`Photo ${i + 1}`} className="h-24 w-full rounded-xl" /> : <div className="h-24 w-full rounded-xl border border-dashed border-ink-600 bg-ink-800" />}
                <Input placeholder={`URL photo ${i + 1}`} value={isStored(p) ? '(image enregistrée)' : p} readOnly={isStored(p)} onChange={(e) => setPhotos(photos.map((x, j) => (j === i ? e.target.value : x)))} />
                <FileDrop label={`Remplacer la photo ${i + 1}`} file={files[i]} onFile={(file) => pick(i, file)} />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Prix d'achat convenu (€)">
            <Input type="number" min="1" value={f.prixAchat} onChange={set('prixAchat')} disabled={lockPrice} />
            {lockPrice && <Locked why="Verrouillé : des promesses existent." />}
          </Field>
          <Field label="Marge nette HT visée (€)">
            <Input type="number" value={f.margeVisee} onChange={set('margeVisee')} disabled={lockTerms} />
            {lockTerms && <Locked why="Verrouillé : conventions signées." />}
          </Field>
          <Field label="% de marge alloué aux royalties">
            <Input type="number" min="0" max="100" value={f.pctRoyalties} onChange={set('pctRoyalties')} disabled={lockTerms} />
            {lockTerms && <Locked why="Verrouillé : conventions signées." />}
          </Field>
        </div>
        <Field label="Infos complémentaires (visibles sur la fiche)">
          <textarea rows={4} className={inputCls} value={f.infos} onChange={set('infos')} />
        </Field>

        <div className="flex justify-end gap-3">
          <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
          <Btn type="submit" disabled={!ok || busy}><Pencil size={15} /> {busy ? 'Enregistrement…' : 'Enregistrer les modifications'}</Btn>
        </div>
      </form>
    </Modal>
  );
}
