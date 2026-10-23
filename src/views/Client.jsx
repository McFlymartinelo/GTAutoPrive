import { Store, LayoutDashboard, RotateCcw } from 'lucide-react';
import { useStore } from '../store.jsx';
import Showroom from './Showroom.jsx';
import VehicleDetail from './VehicleDetail.jsx';
import Dashboard from './Dashboard.jsx';
import { S, pledgeOf } from '../lib/calc.js';

export default function Client() {
  const { state, dispatch, me } = useStore();
  const { route } = state;
  const urgent = state.vehicles.filter((v) => v.status === S.F100 && pledgeOf(v, me.id) && !(pledgeOf(v, me.id).contractSigned && pledgeOf(v, me.id).payment === 'RECU')).length;
  const go = (name) => dispatch({ type: 'ROUTE', route: { name } });
  const tab = (name, Icon, text, badge) => (
    <button
      onClick={() => go(name)}
      className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${route.name === name || (name === 'showroom' && route.name === 'vehicle') ? 'bg-ink-700 text-white' : 'text-zinc-400 hover:text-white'}`}
    >
      <Icon size={16} /> {text}
      {badge > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{badge}</span>}
    </button>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1 rounded-2xl border border-ink-700 bg-ink-900 p-1">
          {tab('showroom', Store, 'Showroom')}
          {tab('dashboard', LayoutDashboard, 'Mon tableau de bord', urgent)}
        </nav>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span>Investisseur <b className="text-gold-300">#{me.num}</b> · {me.prenom} {me.nom}</span>
          {me.id !== 'm12' && !state.live && (
            <button onClick={() => dispatch({ type: 'SET_USER', id: 'm12' })} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white">
              <RotateCcw size={12} /> Compte démo
            </button>
          )}
        </div>
      </div>
      {route.name === 'showroom' && <Showroom />}
      {route.name === 'vehicle' && <VehicleDetail key={route.id} id={route.id} />}
      {route.name === 'dashboard' && <Dashboard />}
    </main>
  );
}
