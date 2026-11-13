import { Dialog } from "@headlessui/react";
import { lazy, Suspense, useState } from "react";
import { useAuth } from "../AuthContext";
const NicknameForm = lazy(() => import("./NicknameForm"));

export default function NicknameModal({ open, onClose, destination, onSaved }: {
  open: boolean; onClose: () => void; destination: string; onSaved: (nickname: string, alreadyChosen: boolean) => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  return <Dialog open={open && !!user} onClose={() => { if (!busy) onClose(); }} className="hq-login-dialog fixed inset-0 z-50">
    <div className="hq-login-backdrop" aria-hidden="true" />
    <div className="hq-login-overlay"><Dialog.Panel className="hq-login-card hq-panel">
      <div className="hq-login-intro"><Dialog.Title className="hq-page-heading">Choose your nickname</Dialog.Title>
        <Dialog.Description>You’re signed in. Pick your player name for leaderboards and Daily Challenge.</Dialog.Description></div>
      {open && user && <Suspense fallback={<><p role="status">Loading nickname settings…</p><button className="hq-inline-action" onClick={onClose}>Choose later</button></>}>
        <NicknameForm key={user.id} userId={user.id} destination={destination}
          onSaved={(nick, alreadyChosen) => { onSaved(nick, alreadyChosen); onClose(); }} onCancel={onClose} onBusyChange={setBusy} />
      </Suspense>}
    </Dialog.Panel></div>
  </Dialog>;
}
