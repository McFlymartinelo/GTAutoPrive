import { useCallback, useEffect, useState } from 'react';
import { Crown, LogOut } from 'lucide-react';
import { api } from '../lib/api.js';
import { useStore } from '../store.jsx';
import { Toast } from '../components/ui.jsx';
import { M } from '../lib/calc.js';
import AuthScreens from './AuthScreens.jsx';
import { LiveProvider } from './LiveStore.jsx';
import Admin from '../views/Admin.jsx';
import Client from '../views/Client.jsx';
import Onboarding from '../views/Onboarding.jsx';

function Shell({ onLogout }) {
  const { me } = useStore();
  return (
    <div className="min-h-screen bg-ink-950 pb-16">
      <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="font-display flex items-center gap-2 text-sm font-semibold text-gold-300"><Crown size={16} /> GT Auto Privé {me.role === 'admin' && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] uppercase text-red-300">Admin</span>}</div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="hidden sm:inline">{me.email}</span>
            <button onClick={onLogout} className="flex items-center gap-1 rounded-lg border border-ink-600 px-2.5 py-1.5 hover:border-gold-400 hover:text-white"><LogOut size={13} /> Déconnexion</button>
          </div>
        </div>
      </header>
      {me.role === 'admin' ? <Admin /> : me.status === M.ACTIF ? <Client /> : <Onboarding />}
      <Toast />
    </div>
  );
}

export default function LiveApp() {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    api('/auth/me').then((r) => setUser(r.user)).catch(() => setUser(null));
  }, []);
  const forget = useCallback(() => setUser(null), []);
  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }, []);

  if (user === undefined) return <div className="p-10 text-center text-zinc-400">Chargement…</div>;
  if (!user) return <AuthScreens onAuth={setUser} />;
  return (
    <LiveProvider key={user.id} onLogout={forget}>
      <Shell onLogout={logout} />
    </LiveProvider>
  );
}
