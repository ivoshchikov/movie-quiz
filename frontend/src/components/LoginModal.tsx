import { Dialog } from "@headlessui/react";
import { useAuth } from "../AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: Props) {
  const { signInWithGoogle } = useAuth();

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* полупрозрачный фон */}
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

      {/* центрируем контент */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-80 space-y-4 rounded-xl bg-gray-900 p-6 text-center">
          <Dialog.Title className="text-xl font-semibold">Sign in</Dialog.Title>

          <button onClick={signInWithGoogle} className="btn-primary w-full">
            Sign in with Google
          </button>

          <button
            onClick={onClose}
            className="text-sm opacity-70 hover:opacity-100"
          >
            Cancel
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
