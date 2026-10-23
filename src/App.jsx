import { Crown, Globe, FileCheck2, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { useStore } from './store.jsx';
import { Toast } from './components/ui.jsx';
import Public from './views/Public.jsx';
import Onboarding from './views/Onboarding.jsx';
import Client from './views/Client.jsx';
import Admin from './views/Admin.jsx';

const TABS = [
  { id: 'public', label: 'Candidature', icon: Globe },
  { id: 'onboarding', label: 'Onboarding KYC', icon: FileCheck2 },
  { id: 'client', label: 'Espace Client', icon: LayoutDashboard },
  { id: 'admin', label: 'Espace Admin', icon: ShieldCheck },
];

export default function App() {
  const { state, dispatch } = useStore();
  const View = { public: Public, onboarding: Onboarding, client: Client, admin: Admin }[state.view];
  return (
    <div className="min-h-screen bg-ink-950 pb-16">
      {/* Sélecteur de démonstration */}
      <div className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2 sm:px-6">
          <div className="font-display hidden items-center gap-2 text-sm font-semibold text-gold-300 md:flex">
            <Crown size={16} /> GT Auto Privé
          </div>
          <span className="hidden rounded-full bg-gold-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-300 md:block">Démo</span>
          <div className="flex flex-1 gap-1 overflow-x-auto md:justify-end">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => dispatch({ type: 'VIEW', view: t.id })}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  state.view === t.id ? 'bg-gold-400 text-ink-950' : 'text-zinc-400 hover:bg-ink-800 hover:text-white'
                }`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
            <a href="#" onClick={() => { location.hash = ''; }} className="shrink-0 px-2 py-1.5 text-xs text-gold-300 hover:underline">Quitter la démo</a>
            <button onClick={() => dispatch({ type: 'RESET' })} className="shrink-0 px-2 text-xs text-zinc-500 hover:text-zinc-300" title="Réinitialiser les données de démonstration">
              Reset
            </button>
          </div>
        </div>
      </div>
      <View />
      <Toast />
    </div>
  );
}
