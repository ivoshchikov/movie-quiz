// frontend/src/components/LoginScreen.tsx
import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import Seo from "./Seo";                  // ← NEW

export default function LoginScreen() {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmail(email);
      alert("Magic-link sent to your inbox ✉️");
    } catch (err) {
      console.error(err);
      alert("Error sending the link");
    }
  };

  return (
    <>
      <Seo
        title="Login | Hard Quiz"
        description="Sign in to save your best scores and compete on Hard Quiz."
      />

      <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
        <h1 className="text-3xl font-bold">Sign in to Hard Quiz</h1>

        <button onClick={() => signInWithGoogle()} className="btn-primary">
          Sign in with Google
        </button>

        <form
          onSubmit={handleEmailSignIn}
          className="flex flex-col gap-2 w-full max-w-sm"
        >
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded bg-white text-black"
          />
          <button type="submit" className="btn-primary">
            Send magic-link
          </button>
        </form>
      </div>
    </>
  );
}
