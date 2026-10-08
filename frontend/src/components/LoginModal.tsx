import { Dialog } from "@headlessui/react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { loginReturnPath, safeReturnPath } from "../auth/redirect";
import LoginForm from "./LoginForm";

export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation(), { user } = useAuth();
  const destination = location.pathname === "/login" ? loginReturnPath(location) : safeReturnPath(location.pathname + location.search + location.hash);
  return <Dialog open={open && !user} onClose={onClose} className="hq-login-dialog fixed inset-0 z-50">
    <div className="hq-login-backdrop" aria-hidden="true" />
    <div className="hq-login-overlay"><Dialog.Panel className="hq-login-card hq-panel">
      <div className="hq-login-intro"><Dialog.Title className="hq-page-heading">Log in to Hard Quiz</Dialog.Title>
        <Dialog.Description>Save your personal bests and play Daily Challenge.</Dialog.Description></div>
      {open && <LoginForm returnPath={destination} onClose={onClose} />}
    </Dialog.Panel></div>
  </Dialog>;
}
