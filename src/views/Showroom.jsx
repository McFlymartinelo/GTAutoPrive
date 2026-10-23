import { useState } from 'react';
import { Users, Banknote, Coins, Percent, Car } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Stat } from '../components/ui.jsx';
import { VehicleCard } from '../components/vehicle.jsx';
import { clubStats, eur0, pct, MAX_MEMBERS, S } from '../lib/calc.js';

const TABS = [
  { id: 'fin', label: 'En cours de financement', test: (v) => v.status === S.FIN || v.status === S.F100 },
  { id: 'com', label: 'Commercialisés', test: (v) => v.status === S.COM },
  { id: 'sold', label: 'Vendus', test: (v) => v.status === S.VENDU },
];

export default function Showroom() {
  const { state, dispatch, me } = useStore();
  const [tab, setTab] = useState('fin');
  const st = clubStats(state);
  const list = state.vehicles.filter(TABS.find((t) => t.id === tab).test);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat icon={Users} label="Membres actifs" value={`${st.membres} / ${MAX_MEMBERS}`} sub="places légales" />
        <Stat icon={Banknote} label="Acquisitions financées" value={eur0(st.volume)} />
        <Stat icon={Coins} label="Royalties versées" value={eur0(st.royalties)} sub="marge partagée (brut)" accent="text-gold-300" />
        <Stat icon={Percent} label="Rentabilité moy." value={pct(st.rentab, 1)} sub={`rotation ${Math.round(st.rotation)} j`} />
        <Stat icon={Car} label="Véhicules" value={`${st.nbFin} · ${st.nbCom} · ${st.nbVendu}`} sub="financement · stock · vendus" />
      </section>

      <div className="flex gap-2 overflow-x-auto border-b border-ink-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition ${tab === t.id ? 'border-gold-400 text-gold-300' : 'border-transparent text-zinc-400 hover:text-white'}`}
          >
            {t.label} <span className="ml-1 text-xs text-zinc-500">{state.vehicles.filter(t.test).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((v) => (
          <VehicleCard key={v.id} v={v} meId={me.id} onOpen={() => dispatch({ type: 'ROUTE', route: { name: 'vehicle', id: v.id } })} />
        ))}
        {list.length === 0 && <p className="text-zinc-500">Aucun véhicule dans cette catégorie.</p>}
      </div>
    </div>
  );
}
