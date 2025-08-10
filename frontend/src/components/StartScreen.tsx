// frontend/src/components/StartScreen.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { RadioGroup } from "@headlessui/react";
import {
  getCategories,
  getDifficultyLevels,
  getMyBest,
  getProfile,
  countQuestions,               // ← NEW
  Category,
  DifficultyLevel,
  UserBestRow,
} from "../api";
import { useAuth } from "../AuthContext";
import Seo           from "./Seo";
import NicknameModal from "./NicknameModal";

const DEFAULT_CAT_ID = 1; // «General»
const CATEGORY_ORDER = ["Actors", "Actresses", "All movies", "TV series"] as const;

export default function StartScreen() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const catFromNav: number | undefined =
    (location.state as any)?.categoryId as number | undefined;

  /* ─── dictionaries ─────────────────────────── */
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [difficulties, setDifficulties] = useState<DifficultyLevel[]>([]);
  const [loadingCats,  setLoadingCats]  = useState(true);
  const [loadingDiffs, setLoadingDiffs] = useState(true);

  /* ─── best rows ────────────────────────────── */
  const [bestRows,    setBestRows]    = useState<UserBestRow[]>([]);
  const [bestLoading, setBestLoading] = useState(false);

  /* ─── ui state ─────────────────────────────── */
  const [selectedCat,  setSelectedCat]  = useState<number>(DEFAULT_CAT_ID);
  const [selectedDiff, setSelectedDiff] = useState<number>();
  const [showNick,     setShowNick]     = useState(false);
  const [profile,      setProfile]      =
    useState<{ nickname: string | null } | null>(null);

  /* ─── availability ─────────────────────────── */
  const [qCount, setQCount] = useState<number | null>(null); // null = неизвестно

  /* ─── 1) загрузка справочников ─────────────── */
  useEffect(() => {
    getCategories()
      .then((data) => {
        const withOrder = [...data].sort((a, b) => {
          const ia = CATEGORY_ORDER.indexOf(a.name as any);
          const ib = CATEGORY_ORDER.indexOf(b.name as any);
          const da = ia === -1 ? 999 : ia;
          const db = ib === -1 ? 999 : ib;
          return da - db || a.name.localeCompare(b.name);
        });
        setCategories(withOrder);

        if (catFromNav && withOrder.some((c) => c.id === catFromNav))
          setSelectedCat(catFromNav);
        else if (!withOrder.some((c) => c.id === DEFAULT_CAT_ID) && withOrder.length)
          setSelectedCat(withOrder[0].id);
      })
      .catch(console.error)
      .finally(() => setLoadingCats(false));

    getDifficultyLevels()
      .then(setDifficulties)
      .catch(console.error)
      .finally(() => setLoadingDiffs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── 2) реагируем на повторные клики в шапке ─ */
  useEffect(() => {
    if (catFromNav && categories.some((c) => c.id === catFromNav))
      setSelectedCat(catFromNav);
  }, [catFromNav, categories]);

  /* ─── 3) профиль + лучшие результаты ────────── */
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setBestRows([]);
      return;
    }

    getProfile(user.id).then(setProfile).catch(console.error);

    setBestLoading(true);
    getMyBest()
      .then(setBestRows)
      .catch(console.error)
      .finally(() => setBestLoading(false));
  }, [user]);

  /* ─── 4) показать модалку, если нет ника ─────── */
  useEffect(() => {
    if (user && profile && !profile.nickname) setShowNick(true);
  }, [user, profile]);

  /* ─── 5) считаем доступность вопросов для выбранной пары ─ */
  useEffect(() => {
    setQCount(null); // сбрасываем индикатор
    if (selectedCat && selectedDiff) {
      countQuestions(selectedCat, selectedDiff)
        .then((n) => setQCount(n))
        .catch((e) => {
          console.error(e);
          setQCount(0);
        });
    }
  }, [selectedCat, selectedDiff]);

  /* ─── helpers: строки таблицы ───────────────── */
  const tableRows = useMemo(() => {
    return difficulties.map((diff) => {
      const rec = bestRows.find(
        (r) =>
          r.category_id === selectedCat && r.difficulty_level_id === diff.id,
      );
      return {
        diffName: diff.name,
        score:    rec?.best_score ?? "—",
        time:     rec
          ? `${String(Math.floor(rec.best_time / 60)).padStart(2, "0")}:${String(
              rec.best_time % 60,
            ).padStart(2, "0")}`
          : "—",
      };
    });
  }, [difficulties, bestRows, selectedCat]);

  const isAvailable = qCount == null ? true : qCount > 0;
  const canPlay =
    !loadingCats &&
    !loadingDiffs &&
    selectedCat !== undefined &&
    selectedDiff !== undefined &&
    isAvailable;

  const playText =
    loadingCats || loadingDiffs
      ? "Loading…"
      : selectedDiff == null
      ? "Play"
      : isAvailable
      ? "Play"
      : "Coming soon";

  const startGame = () =>
    navigate("/play", {
      state: { categoryId: selectedCat!, difficultyId: selectedDiff! },
    });

  const selectedCatName =
    categories.find((c) => c.id === selectedCat)?.name ?? "—";

  const pillCls = (checked: boolean) =>
    [
      "px-3 py-1.5 rounded-full text-sm border transition",
      checked
        ? "bg-indigo-600 border-indigo-600 text-white"
        : "border-gray-500 hover:border-indigo-400",
    ].join(" ");

  /* ─── render ───────────────────────────────── */
  return (
    <>
      <Seo
        title="Start a new quiz | Hard Quiz"
        description="Choose a category and difficulty level to start guessing movie posters!"
      />

      <div className="start-screen lg:flex-row lg:gap-10">
        {/* ---------- LEFT : best results ---------- */}
        {user && (
          <section className="w-full lg:w-1/3">
            <h2 className="text-xl sm:text-2xl font-semibold mb-1">
              Your best results
            </h2>
            <p className="mb-3 text-sm opacity-70">Category: {selectedCatName}</p>

            {bestLoading ? (
              <p>Loading…</p>
            ) : (
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="border-b border-gray-600">
                  <tr>
                    <th className="py-1 px-2">Level</th>
                    <th className="py-1 px-2">Score</th>
                    <th className="py-1 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.diffName}>
                      <td className="py-1 px-2">{row.diffName}</td>
                      <td className="py-1 px-2">{row.score}</td>
                      <td className="py-1 px-2">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {profile?.nickname && (
              <button
                onClick={() => setShowNick(true)}
                className="mt-2 text-xs underline opacity-70 hover:opacity-100"
              >
                Change nickname
              </button>
            )}
          </section>
        )}

        {/* ---------- RIGHT : game setup ---------- */}
        <section className="w-full lg:w-2/3 flex flex-col items-center">
          <div className="w-full max-w-md space-y-4 text-center">
            {/* категории — сегмент-кнопки */}
            <div className="flex flex-col items-center gap-2">
              <span className="font-medium text-lg">Select category</span>
              <RadioGroup value={selectedCat} onChange={setSelectedCat}>
                <RadioGroup.Label className="sr-only">
                  Select category
                </RadioGroup.Label>
                <div className="flex flex-wrap justify-center gap-2">
                  {categories.map((c) => (
                    <RadioGroup.Option key={c.id} value={c.id}>
                      {({ checked }) => (
                        <button type="button" className={pillCls(checked)}>
                          {c.name}
                        </button>
                      )}
                    </RadioGroup.Option>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* уровни сложности — сегмент-кнопки */}
            <div className="flex flex-col items-center gap-2">
              <span className="font-medium text-lg">Select level</span>
              <RadioGroup value={selectedDiff} onChange={setSelectedDiff}>
                <RadioGroup.Label className="sr-only">
                  Select level
                </RadioGroup.Label>
                <div className="flex flex-wrap justify-center gap-2">
                  {difficulties.map((d) => (
                    <RadioGroup.Option key={d.id} value={d.id}>
                      {({ checked }) => (
                        <button type="button" className={pillCls(checked)}>
                          {d.name}
                        </button>
                      )}
                    </RadioGroup.Option>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* play button */}
          <button
            className="btn-primary mt-6 disabled:opacity-70"
            onClick={startGame}
            disabled={!canPlay}
            title={!isAvailable && selectedCat && selectedDiff ? "No questions yet" : undefined}
          >
            {playText}
          </button>

          {/* how-to-play */}
          <div className="mt-4">
            <Link
              to="/how-to-play"
              className="text-sm underline opacity-80 hover:opacity-100"
            >
              How&nbsp;to&nbsp;play
            </Link>
          </div>
        </section>
      </div>

      {/* nickname modal */}
      <NicknameModal
        open={showNick}
        onClose={() => setShowNick(false)}
        prefill={localStorage.getItem("pre_nickname") || ""}
        onSaved={(n) => setProfile((p) => (p ? { ...p, nickname: n } : p))}
      />
    </>
  );
}
