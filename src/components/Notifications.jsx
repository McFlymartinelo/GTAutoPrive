import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useStore } from '../store.jsx';

function relTime(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function NotificationBell() {
  const { state, dispatch, me } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const items = state.notifications || [];
  const unread = state.unread || 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = (n) => {
    setOpen(false);
    if (!n.read) dispatch({ type: 'MARK_NOTIF_READ', id: n.id });
    const link = n.link;
    if (me.role === 'admin' && link?.kind === 'admin') dispatch({ type: 'ADMIN_FOCUS', tab: link.tab, vid: link.vid });
    else if (link?.kind === 'vehicle' && link.id) dispatch({ type: 'ROUTE', route: { name: 'vehicle', id: link.id } });
  };

  const label = unread ? `${unread} notification${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}` : 'Notifications';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center rounded-lg border border-ink-600 p-1.5 text-zinc-300 hover:border-gold-400 hover:text-white"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-600 bg-ink-900 shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-ink-700 px-3 py-2.5">
            <span className="text-sm font-medium text-white">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'MARK_ALL_NOTIFS_READ' })}
                className="flex items-center gap-1 text-[11px] text-gold-300 hover:text-white"
              >
                <CheckCheck size={13} /> Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-zinc-500">Aucune notification.</p>}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                className={`block w-full border-b border-ink-800 px-3 py-2.5 text-left last:border-0 hover:bg-ink-800 ${n.read ? '' : 'bg-gold-400/10'}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm font-medium ${n.read ? 'text-zinc-300' : 'text-white'}`}>{n.title}</span>
                  <span className="shrink-0 text-[10px] text-zinc-500">{relTime(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-xs leading-snug text-zinc-400">{n.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
