import { useCallback, useState } from 'react';
import { Btn, Modal } from './ui.jsx';

// Fenêtre de confirmation avant une action irréversible.
//   const [ask, confirmNode] = useConfirm();
//   if (await ask({ title, body, confirmLabel, danger })) dispatch(...);
//   …et afficher {confirmNode} dans le rendu du composant.
export function useConfirm() {
  const [req, setReq] = useState(null);
  const ask = useCallback((opts) => new Promise((resolve) => setReq({ ...opts, resolve })), []);
  const close = (answer) => {
    req?.resolve(answer);
    setReq(null);
  };
  const node = req ? (
    <Modal open onClose={() => close(false)} title={req.title}>
      {req.body && <div className="mb-5 space-y-2 text-sm text-zinc-300">{req.body}</div>}
      <div className="flex justify-end gap-3">
        <Btn variant="ghost" onClick={() => close(false)}>Annuler</Btn>
        <Btn variant={req.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{req.confirmLabel || 'Confirmer'}</Btn>
      </div>
    </Modal>
  ) : null;
  return [ask, node];
}
