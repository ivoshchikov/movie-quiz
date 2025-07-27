// frontend/src/components/ProfileSetupScreen.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getProfile, upsertProfile } from "../api";

export default function ProfileSetupScreen() {
  const { user, loading: authLoading } = useAuth();
  const [nickname, setNickname] = useState("");
  const [loading,  setLoading]  = useState(true);
  const navigate = useNavigate();

  /* ─── загрузка профиля / защита маршрута ─────────────────────────── */
  useEffect(() => {
    if (authLoading) return;           // ждём, пока Auth определится

    if (!user) {                       // не залогинен → домой
      navigate("/", { replace: true });
      return;
    }

    getProfile(user.id).then((profile) => {
      // ник уже есть → сразу на старт
      if (profile && profile.nickname) {
        navigate("/", { replace: true });
      } else {
        setLoading(false);             // показываем форму
      }
    });
  }, [authLoading, user, navigate]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading…
      </div>
    );
  }

  /* ─── submit ─────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    try {
      await upsertProfile(user!.id, nickname.trim());
      navigate("/", { replace: true });
    } catch {
      alert("Ошибка: возможно, ник уже занят.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
      <h1 className="text-2xl font-semibold">Придумайте ник</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm"
      >
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Ваш ник"
          className="border p-2 rounded w-full bg-white text-black"
          maxLength={20}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!nickname.trim()}
        >
          Save
        </button>
      </form>
    </div>
  );
}
