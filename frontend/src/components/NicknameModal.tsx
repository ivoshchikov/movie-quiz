// frontend/src/components/NicknameModal.tsx
import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { useAuth } from "../AuthContext";
import { isNicknameTaken, upsertProfile } from "../api";

interface Props {
  open: boolean;
  onClose: () => void;
  prefill?: string;
  onSaved?: (nick: string) => void;   /* ← NEW */
}

export default function NicknameModal({
  open,
  onClose,
  prefill = "",
  onSaved,
}: Props) {
  const { user } = useAuth();
  const [nick,  setNick]  = useState(prefill);
  const [busy,  setBusy]  = useState(false);
  const [taken, setTaken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* debounce «занят?» ------------------------------------------------- */
  useEffect(() => {
    if (nick.length < 3) { setTaken(false); return; }
    const id = setTimeout(() => {
      isNicknameTaken(nick).then(setTaken).catch(console.error);
    }, 300);
    return () => clearTimeout(id);
  }, [nick]);

  /* save -------------------------------------------------------------- */
  const save = async () => {
    if (nick.length < 3 || taken) return;
    setBusy(true);

    if (!user) {                      // гость
      localStorage.setItem("pre_nickname", nick);
      onSaved?.(nick);
      onClose();
      setBusy(false);
      return;
    }

    try {
      await upsertProfile(user.id, nick);
      localStorage.removeItem("pre_nickname");
      onSaved?.(nick);               /* ← уведомляем родителя */
      onClose();
    } catch (e: any) {
      if (e.code === "23505") setError("Nickname already taken.");
      else setError("Error saving nickname.");
    } finally {
      setBusy(false);
    }
  };

  /* render ------------------------------------------------------------ */
  return (
    <Dialog open={open} onClose={() => !busy && onClose()} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-80 space-y-4 rounded-xl bg-gray-900 p-6 text-center">
          <Dialog.Title className="text-xl font-semibold">Choose your nickname</Dialog.Title>

          <input
            className="w-full rounded-md p-2 text-black"
            placeholder="3–20 chars, a–z 0–9 _ -"
            value={nick}
            maxLength={20}
            onChange={(e) => setNick(e.target.value)}
            disabled={busy}
          />

          {taken && <p className="text-red-500 text-sm">This nickname is taken.</p>}
          {error &&  <p className="text-red-500 text-sm">{error}</p>}

          <button
            className="btn-primary w-full disabled:opacity-60"
            onClick={save}
            disabled={busy || nick.length < 3 || taken}
          >
            {busy ? "Saving…" : "Save"}
          </button>

          <button
            onClick={() => !busy && onClose()}
            className="text-sm opacity-70 hover:opacity-100"
          >
            Cancel
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
