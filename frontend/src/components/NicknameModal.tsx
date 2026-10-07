import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { useAuth } from "../AuthContext";
import NicknameForm from "./NicknameForm";

interface Props { open: boolean; onClose: () => void; prefill?: string; onSaved: (nick: string) => void; }

export default function NicknameModal({ open, onClose, prefill = "", onSaved }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} className="relative z-50">
    <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <Dialog.Panel className="hq-panel w-full max-w-sm p-6">
        <Dialog.Title className="text-xl font-semibold mb-3">Choose your nickname</Dialog.Title>
        {open && user && <NicknameForm key={user.id} userId={user.id} prefill={prefill} onSaved={nick => { onSaved(nick); onClose(); }} onCancel={onClose} onBusyChange={setBusy} />}
      </Dialog.Panel>
    </div>
  </Dialog>;
}
