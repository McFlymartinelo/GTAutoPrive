import { useEffect, useRef, useState } from 'react';
import { PenLine, ShieldCheck, Eraser } from 'lucide-react';
import { Btn, Modal, Input } from './ui.jsx';
import { useStore } from '../store.jsx';

const DEMO_OTP = '482913';

/**
 * Signature électronique simulée : lecture + case à cocher + tracé + OTP.
 * PROVIDER HOOK : remplacer `sign()` par la création d'une demande de signature Yousign/DocuSign
 * (ex. POST /signature_requests) puis résoudre `onSigned` au retour du webhook.
 */
export default function SignatureModal({ open, onClose, title, text, onSigned }) {
  const { state } = useStore();
  const live = !!state.live;
  const [pwd, setPwd] = useState('');
  const canvas = useRef(null);
  const drawing = useRef(false);
  const [checked, setChecked] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (open) {
      setChecked(false);
      setHasInk(false);
      setOtpSent(false);
      setOtp('');
      setPwd('');
    }
  }, [open]);

  const pos = (e) => {
    const c = canvas.current;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const down = (e) => {
    drawing.current = true;
    const ctx = canvas.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f3d58a';
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvas.current.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvas.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };
  const up = () => (drawing.current = false);
  const clear = () => {
    const c = canvas.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const otpOk = otp === DEMO_OTP;
  const ready = checked && hasInk && (live ? pwd.length > 0 : otpOk);
  const sign = () =>
    onSigned({ date: new Date().toISOString(), otp: !live, password: pwd, image: canvas.current.toDataURL('image/png') });

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <pre className="mb-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-ink-700 bg-ink-950 p-4 font-sans text-[13px] leading-relaxed text-zinc-300">
        {text}
      </pre>

      <label className="mb-4 flex cursor-pointer items-start gap-3 text-sm text-zinc-200">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-4 w-4 accent-amber-400" />
        J’ai lu l’intégralité du document, j’en accepte les termes et je consens à le signer électroniquement.
      </label>

      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-zinc-400">
        <span className="flex items-center gap-1.5"><PenLine size={13} /> Tracez votre signature</span>
        <button onClick={clear} className="flex items-center gap-1 text-zinc-400 hover:text-white"><Eraser size={13} /> Effacer</button>
      </div>
      <canvas
        ref={canvas}
        width={700}
        height={170}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        style={{ touchAction: 'none' }}
        className="mb-4 h-32 w-full cursor-crosshair rounded-xl border border-ink-600 bg-ink-800 sm:h-40"
      />

      {live ? (
        <div className="mb-5 rounded-xl border border-ink-700 bg-ink-800 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
            <ShieldCheck size={14} className="text-gold-400" /> Confirmez votre identité
          </div>
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Mot de passe de votre compte" autoComplete="current-password" className="!w-72" />
          <p className="mt-2 text-xs text-zinc-500">La signature est horodatée et rattachée à votre compte (IP, appareil).</p>
        </div>
      ) : (
      <div className="mb-5 rounded-xl border border-ink-700 bg-ink-800 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
          <ShieldCheck size={14} className="text-gold-400" /> Validation OTP (simulée)
        </div>
        {!otpSent ? (
          <Btn variant="outline" size="sm" onClick={() => setOtpSent(true)}>Recevoir le code par SMS</Btn>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Code à 6 chiffres" inputMode="numeric" className="!w-44" />
            <span className="text-xs text-zinc-500">Code de démonstration : <b className="text-gold-300">{DEMO_OTP}</b></span>
            {otp.length === 6 && !otpOk && <span className="text-xs text-red-400">Code incorrect</span>}
            {otpOk && <span className="text-xs text-emerald-400">Code validé</span>}
          </div>
        )}
      </div>
      )}

      <div className="flex justify-end gap-3">
        <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
        <Btn disabled={!ready} onClick={sign}><PenLine size={16} /> Signer électroniquement</Btn>
      </div>
    </Modal>
  );
}
