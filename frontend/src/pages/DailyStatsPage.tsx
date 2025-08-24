// frontend/src/pages/DailyStatsPage.tsx
import Seo from "../components/Seo";
import StreakLeaderboard from "../components/StreakLeaderboard";
import DailyRecords from "../components/DailyRecords";

export default function DailyStatsPage() {
  return (
    <>
      <Seo
        title="Daily Stats | Hard Quiz"
        description="Streak leaderboard and all-time daily records on Hard Quiz."
      />
      <section className="mx-auto max-w-5xl">
        <header className="mb-4">
          <h1 className="text-3xl font-extrabold">Daily Stats</h1>
          <p className="mt-1 text-sm opacity-80">
            Active streaks, all-time best streaks, fastest times, and total correct answers.
          </p>
        </header>

        <div className="space-y-10">
          <StreakLeaderboard />
          <DailyRecords />
        </div>
      </section>
    </>
  );
}
