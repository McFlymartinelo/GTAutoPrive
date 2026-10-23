import { useEffect, useState } from 'react';
import { X, Copy, Check, Download } from 'lucide-react';
import { useStore } from '../store.jsx';
import { FALLBACK } from '../lib/placeholder.js';

export function Btn({ variant = 'primary', size = 'md', className = '', ...p }) {
  const v = {
    primary: 'bg-gold-400 text-ink-950 hover:bg-gold-300 font-semibold',
    outline: 'border border-ink-600 text-zinc-200 hover:border-gold-400 hover:text-gold-300',
    ghost: 'text-zinc-300 hover:bg-ink-800',
    danger: 'bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25',
    success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3.5 text-base' }[size];
  return (
    <button
      type="button"
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${v} ${s} ${className}`}
    />
  );
}

export const Card = ({ className = '', ...p }) => (
  <div {...p} className={`rounded-2xl border border-ink-700 bg-ink-900/80 p-4 sm:p-5 ${className}`} />
);

const TONES = {
  gold: 'bg-gold-400/15 text-gold-300 border-gold-400/30',
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  red: 'bg-red-500/15 text-red-300 border-red-500/30',
  blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  gray: 'bg-ink-700 text-zinc-300 border-ink-600',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};
export const Badge = ({ tone = 'gray', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}>
    {children}
  </span>
);

export const SectionTitle = ({ icon: Icon, children, right }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-white">
      {Icon && <Icon size={18} className="text-gold-400" />}
      {children}
    </h2>
    {right}
  </div>
);

export const Field = ({ label, hint, className = '', children }) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
  </label>
);

export const inputCls =
  'w-full rounded-xl border border-ink-600 bg-ink-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-gold-400 disabled:opacity-60';
export const Input = (p) => <input {...p} className={`${inputCls} ${p.className || ''}`} />;

export function Progress({ value, tone = 'gold' }) {
  const c = value >= 100 ? 'bg-emerald-400' : tone === 'gold' ? 'bg-gradient-to-r from-gold-500 to-gold-300' : 'bg-sky-400';
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-700">
      <div className={`h-full rounded-full transition-all duration-500 ${c}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export const Stat = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="rounded-2xl border border-ink-700 bg-ink-900/80 p-4">
    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
      {Icon && <Icon size={14} className="text-gold-400" />}
      {label}
    </div>
    <div className={`font-display text-xl font-semibold sm:text-2xl ${accent || 'text-white'}`}>{value}</div>
    {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
  </div>
);

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border border-ink-600 bg-ink-900 p-5 shadow-2xl sm:rounded-3xl ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-ink-700 hover:text-white" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CopyBtn({ text, label, size = 'sm' }) {
  const { notify } = useStore();
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement('textarea');
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setOk(true);
    notify('Copié dans le presse-papiers.');
    setTimeout(() => setOk(false), 1800);
  };
  return (
    <Btn variant="outline" size={size} onClick={copy}>
      {ok ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      {label}
    </Btn>
  );
}

export const DlBtn = ({ children, ...p }) => (
  <Btn variant="outline" size="sm" {...p}>
    <Download size={14} />
    {children}
  </Btn>
);

export const CarImg = ({ src, alt, className = '' }) => (
  <img src={src} alt={alt} loading="lazy" onError={(e) => (e.currentTarget.src = FALLBACK)} className={`object-cover ${className}`} />
);

export function Toast() {
  const { state } = useStore();
  const [t, setT] = useState(null);
  useEffect(() => {
    if (!state.toast) return;
    setT(state.toast);
    const id = setTimeout(() => setT(null), 3800);
    return () => clearTimeout(id);
  }, [state.toast]);
  if (!t) return null;
  const c = t.kind === 'warn' ? 'border-amber-400/50 text-amber-200' : 'border-emerald-400/40 text-emerald-100';
  return (
    <div className={`fixed bottom-5 left-1/2 z-[60] w-[92%] max-w-md -translate-x-1/2 rounded-2xl border bg-ink-800 px-4 py-3 text-sm shadow-2xl ${c}`} role="status">
      {t.msg}
    </div>
  );
}

export const FileDrop = ({ label, file, onFile }) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-ink-600 bg-ink-800 px-3.5 py-3 text-sm transition hover:border-gold-400">
    <span className="min-w-0">
      <span className="block text-xs uppercase tracking-wide text-zinc-400">{label}</span>
      <span className={`block truncate ${file ? 'text-emerald-300' : 'text-zinc-500'}`}>{file ? file.name : 'Choisir un fichier…'}</span>
    </span>
    <span className="rounded-lg bg-ink-700 px-2.5 py-1 text-xs text-zinc-200">Parcourir</span>
    <input type="file" className="hidden" onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
  </label>
);
