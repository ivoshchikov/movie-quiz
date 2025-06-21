// frontend/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import StartScreen          from "./components/StartScreen";
import GameScreen           from "./components/GameScreen";
import ResultScreen         from "./components/ResultScreen";
import LoginScreen          from "./components/LoginScreen";
import ProfileSetupScreen   from "./components/ProfileSetupScreen";
import PrivateRoute         from "./PrivateRoute";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"           element={<LoginScreen />} />
      <Route path="/setup-profile"   element={<ProfileSetupScreen />} />
      <Route path="/"                element={<StartScreen />} />
      <Route path="/play"            element={<GameScreen />} />
      <Route path="/result"          element={<ResultScreen />} />

      {/* Protected — позже для /daily, /leaderboard */}
      <Route element={<PrivateRoute />}>
        <Route path="/daily"          element={<div>Daily...</div>} />
        <Route path="/leaderboard"    element={<div>Leaderboard...</div>} />
      </Route>

      {/* Любой незнакомый адрес → на старт */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
