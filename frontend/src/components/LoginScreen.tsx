// frontend/src/components/LoginScreen.tsx
import React, { useState } from "react";
import { useAuth } from "../AuthContext";

export default function LoginScreen() {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmail(email);
      alert("Ссылка для входа отправлена на почту");
    } catch (err) {
      console.error(err);
      alert("Ошибка при отправке ссылки");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
      <h1 className="text-3xl font-bold">Вход в Hard Quiz</h1>
      <button onClick={() => signInWithGoogle()} className="btn-primary">
        Войти через Google
      </button>

      <form onSubmit={handleEmailSignIn} className="flex flex-col gap-2 w-full max-w-sm">
        <input
          type="email"
          placeholder="Ваш email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded bg-white text-black"
        />
        <button type="submit" className="btn-primary">
          Войти по ссылке
        </button>
      </form>
    </div>
  );
}
