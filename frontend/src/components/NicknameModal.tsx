import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { useAuth } from "../AuthContext";
import NicknameForm from "./NicknameForm";

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
      {open && user && <NicknameForm key={user.id} userId={user.id} destination={destination}
        onSaved={(nick, alreadyChosen) => { onSaved(nick, alreadyChosen); onClose(); }} onCancel={onClose} onBusyChange={setBusy} />}
    </Dialog.Panel></div>
  </Dialog>;
}
