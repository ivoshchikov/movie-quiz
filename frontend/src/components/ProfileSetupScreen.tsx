// frontend/src/components/ProfileSetupScreen.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getProfile, upsertProfile } from "../api";

export default function ProfileSetupScreen() {
  const { user, loading: authLoading } = useAuth();
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Ждём, пока провайдер авторизации определит user
    if (authLoading) return;

    // Если пользователь не залогинен — уводим на старт
    if (!user) {
      navigate("/", { replace: true });
      return;
    }

    // Проверяем, есть ли уже профиль
    getProfile(user.id).then((profile) => {
      if (profile) {
        // Есть профиль — обратно на старт
        navigate("/", { replace: true });
      } else {
        // Нет — показываем форму
        setLoading(false);
      }
    });
  }, [authLoading, user, navigate]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full">Loading…</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    try {
      await upsertProfile(user!.id, nickname.trim());
      navigate("/", { replace: true });
    } catch {
      alert("Ошибка. Возможно, этот ник уже занят.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
      <h1 className="text-2xl font-semibold">Придумайте ник</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Ваш ник"
          className="border p-2 rounded w-full bg-white text-black"
        />
        <button type="submit" className="btn-primary" disabled={!nickname.trim()}>
          Save
        </button>
      </form>
    </div>
  );
}
