import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../lib/api.js';
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

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

// 'unsupported' | 'ios-install' | 'denied' | null (le navigateur peut demander).
function pushBlock() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || !window.isSecureContext) return 'unsupported';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (ios && !standalone) return 'ios-install';
  if (Notification.permission === 'denied') return 'denied';
  return null;
}

export async function unsubscribePush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await api('/push/unsubscribe', { method: 'POST', json: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

const pushListeners = new Set();
let pushStateShared = 'unknown';
function setPushState(next) {
  pushStateShared = next;
  pushListeners.forEach((fn) => fn(next));
}

export function usePush() {
  const [state, setState] = useState(pushStateShared);

  useEffect(() => {
    pushListeners.add(setState);
    setState(pushStateShared);
    return () => pushListeners.delete(setState);
  }, []);

  const refresh = useCallback(async () => {
    const blocked = pushBlock();
    if (blocked) {
      setPushState(blocked);
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setPushState(sub ? 'on' : 'off');
    } catch {
      setPushState('off');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    const blocked = pushBlock();
    if (blocked) {
      setPushState(blocked);
      return;
    }
    setPushState('busy');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPushState(perm === 'denied' ? 'denied' : 'off');
        return;
      }
      const { publicKey } = await api('/push/key');
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await api('/push/subscribe', { method: 'POST', json: sub.toJSON() });
      setPushState('on');
    } catch {
      setPushState('off');
    }
  }, []);

  return { state, enable };
}

function PushNote({ state, enable }) {
  if (state === 'unknown' || state === 'busy') return null;
  if (state === 'on') return <p className="border-b border-ink-700 px-3 py-2 text-xs text-emerald-300">Alertes activées sur cet appareil.</p>;
  if (state === 'ios-install') {
    return (
      <p className="border-b border-ink-700 px-3 py-2 text-xs leading-snug text-zinc-300">
        Sur iPhone : Partager, puis « Sur l’écran d’accueil ». Ouvrez l’app depuis l’icône, puis activez les alertes.
      </p>
    );
  }
  if (state === 'denied') {
    return <p className="border-b border-ink-700 px-3 py-2 text-xs leading-snug text-amber-200">Alertes bloquées. Autorisez-les dans les réglages du navigateur.</p>;
  }
  if (state === 'unsupported') {
    return (
      <p className="border-b border-ink-700 px-3 py-2 text-xs leading-snug text-zinc-400">
        Les alertes hors de l’app demandent une adresse https. Cette page n’est pas sécurisée.
      </p>
    );
  }
  return (
    <div className="flex items-center justify-between gap-2 border-b border-ink-700 px-3 py-2">
      <p className="text-xs leading-snug text-zinc-300">Alertes même quand l’app est fermée.</p>
      <button type="button" onClick={enable} className="shrink-0 rounded-lg bg-gold-400 px-2.5 py-1 text-[11px] font-semibold text-ink-950">
        Activer
      </button>
    </div>
  );
}

export function PushBanner() {
  const { state, enable } = usePush();
  if (state === 'ios-install') {
    return (
      <p className="border-b border-ink-700 bg-ink-900 px-4 py-2.5 text-sm leading-snug text-zinc-300">
        Sur iPhone, ajoutez GT Auto Privé à l’écran d’accueil pour recevoir les alertes comme une application.
      </p>
    );
  }
  if (state === 'unsupported') {
    return (
      <p className="border-b border-ink-700 bg-ink-900 px-4 py-2.5 text-sm leading-snug text-zinc-300">
        Les alertes hors de l’app ne partent qu’en https. Ouvrez le site publié, puis activez-les.
      </p>
    );
  }
  if (state !== 'off') return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-700 bg-ink-900 px-4 py-2.5">
      <p className="text-sm text-zinc-300">Recevoir les alertes même quand l’application est fermée.</p>
      <button type="button" onClick={enable} className="shrink-0 rounded-lg bg-gold-400 px-3 py-1.5 text-xs font-semibold text-ink-950">
        Activer
      </button>
    </div>
  );
}

export function NotificationBell() {
  const { state, dispatch, me } = useStore();
  const { state: pushState, enable } = usePush();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const panelRef = useRef(null);
  const items = state.notifications || [];
  const unread = state.unread || 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
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
    <div ref={ref}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center rounded-lg border border-ink-600 p-2 text-zinc-300 hover:border-gold-400 hover:text-white"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && createPortal(
        <div ref={panelRef} className="fixed inset-x-3 top-[4.25rem] z-[70] flex max-h-[min(32rem,calc(100dvh-5.5rem))] flex-col overflow-hidden rounded-2xl border border-ink-600 bg-ink-900 shadow-2xl sm:inset-x-auto sm:right-4 sm:w-[22rem]">
          <div className="flex items-center justify-between gap-2 border-b border-ink-700 px-3 py-2.5">
            <span className="text-sm font-medium text-white">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'MARK_ALL_NOTIFS_READ' })}
                className="flex shrink-0 items-center gap-1 text-[11px] text-gold-300 hover:text-white"
              >
                <CheckCheck size={13} /> Tout marquer comme lu
              </button>
            )}
          </div>
          <PushNote state={pushState} enable={enable} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-zinc-500">Aucune notification.</p>}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                className={`block w-full border-b border-ink-800 px-3 py-3 text-left last:border-0 hover:bg-ink-800 ${n.read ? '' : 'bg-gold-400/10'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`min-w-0 text-sm font-medium leading-snug ${n.read ? 'text-zinc-300' : 'text-white'}`}>{n.title}</span>
                  <span className="shrink-0 pt-0.5 text-[10px] text-zinc-500">{relTime(n.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs leading-snug text-zinc-400">{n.body}</p>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
