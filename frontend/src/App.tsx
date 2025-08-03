// frontend/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import Layout             from "./components/Layout";          // ← NEW
import StartScreen        from "./components/StartScreen";
import GameScreen         from "./components/GameScreen";
import ResultScreen       from "./components/ResultScreen";
import HowToPlay          from "./components/HowToPlay";
import ProfileSetupScreen from "./components/ProfileSetupScreen";
import PrivateRoute       from "./PrivateRoute";

export default function App() {
  return (
    <>
      {/* «Дефолт» для всего сайта */}
      <Helmet>
        <title>Hard Quiz – Guess the movie by its poster</title>
        <meta
          name="description"
          content="Play Hard Quiz: test your movie knowledge, beat the timer and climb the leaderboard!"
        />
      </Helmet>

      <Routes>
        {/* ── всё внутри общего Layout ── */}
        <Route element={<Layout />}>
          {/* главная */}
          <Route index element={<StartScreen />} />

          {/* статическая страница правил */}
          <Route path="how-to-play" element={<HowToPlay />} />

          {/* публичные */}
          <Route path="setup-profile" element={<ProfileSetupScreen />} />
          <Route path="play"          element={<GameScreen />} />
          <Route path="result"        element={<ResultScreen />} />

          {/* защищённые (появятся позже) */}
          <Route element={<PrivateRoute />}>
            <Route path="daily"       element={<div>Daily…</div>} />
            <Route path="leaderboard" element={<div>Leaderboard…</div>} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
