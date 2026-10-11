// frontend/src/App.tsx
import { Routes, Route } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { lazy, Suspense } from "react";

import Layout              from "./components/Layout";
import StartScreen         from "./components/StartScreen";
import ResultScreen from "./components/ResultScreen";
import LoginScreen         from "./components/LoginScreen";
import ProfileSetupScreen  from "./components/ProfileSetupScreen";
import PrivateRoute        from "./PrivateRoute";
import DailyPage from "./pages/DailyPage";
// ❌ removed: import DailyStatsPage from "./pages/DailyStatsPage";
import NotFound            from "./components/NotFound";
const GameScreen = lazy(() => import("./components/GameScreen"));
const HowToPlay = lazy(() => import("./components/HowToPlay"));
const BlogIndex = lazy(() => import("./pages/BlogIndex"));
const BlogPostPage = lazy(() => import("./pages/BlogPost"));
const AdminDailyPage = lazy(() => import("./pages/AdminDailyPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AdminQuestionsPage=lazy(()=>import('./pages/AdminQuestionsPage'));
const AdminQuestionsNewPage=lazy(()=>import('./pages/AdminQuestionsNewPage'));

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
        <meta name="robots" content="index, follow" />
      </Helmet>

      <Suspense fallback={<p role="status">Loading page…</p>}>
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
          <Route path="blog/*"        element={<BlogPostPage />} />
          <Route path="daily"         element={<DailyPage />} />
          <Route path="leaderboard"   element={<LeaderboardPage />} />

          {/* админка */}
          <Route path="admin/daily"   element={<AdminDailyPage />} />
          <Route path="admin/questions" element={<Suspense fallback={<p role="status">Loading administration…</p>}><AdminQuestionsPage/></Suspense>}/>
          <Route path="admin/questions/new" element={<Suspense fallback={<p role="status">Loading administration…</p>}><AdminQuestionsNewPage/></Suspense>}/>

          {/* личные результаты */}
          <Route element={<PrivateRoute />}>
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </Suspense>
    </>
  );
}
