// frontend/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import Layout              from "./components/Layout";
import StartScreen         from "./components/StartScreen";
import GameScreen          from "./components/GameScreen";
import ResultScreen        from "./components/ResultScreen";
import HowToPlay           from "./components/HowToPlay";
import LoginScreen         from "./components/LoginScreen";
import ProfileSetupScreen  from "./components/ProfileSetupScreen";
import PrivateRoute        from "./PrivateRoute";
import BlogIndex           from "./pages/BlogIndex";
import BlogPostPage        from "./pages/BlogPost";
import DailyPage           from "./pages/DailyPage";
// ❌ removed: import DailyStatsPage from "./pages/DailyStatsPage";
import AdminDailyPage      from "./pages/AdminDailyPage";

export default function App() {
  return (
    <>
      {/* SEO defaults */}
      <Helmet>
        <title>Hard Quiz — Guess the movie from a single frame</title>
        <meta
          name="description"
          content="Play Hard Quiz: test your movie knowledge, beat the timer and climb the leaderboard!"
        />
      </Helmet>

      <Routes>
        {/* всё под общим Layout */}
        <Route element={<Layout />}>
          {/* публичные экраны */}
          <Route index                element={<StartScreen />} />
          <Route path="how-to-play"   element={<HowToPlay />} />
          <Route path="login"         element={<LoginScreen />} />
          <Route path="setup-profile" element={<ProfileSetupScreen />} />
          <Route path="play"          element={<GameScreen />} />
          <Route path="result"        element={<ResultScreen />} />
          <Route path="blog"          element={<BlogIndex />} />
          <Route path="blog/:slug"    element={<BlogPostPage />} />
          <Route path="daily"         element={<DailyPage />} />

          {/* админка */}
          <Route path="admin/daily"   element={<AdminDailyPage />} />

          {/* защищённые (пример/на будущее) */}
          <Route element={<PrivateRoute />}>
            <Route path="leaderboard" element={<div>Leaderboard…</div>} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
