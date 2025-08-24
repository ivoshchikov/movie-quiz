// frontend/src/pages/AdminDailyPage.tsx
import { useEffect, useMemo, useState } from "react";
import Seo from "../components/Seo";
import { useAuth } from "../AuthContext";
import {
  getDailyDateUS,
  getDailyHistoryAdmin,
  isAdmin,
  setDailyQuestion,
} from "../api";
import { supabase } from "../supabase";

// локальный helper: превратить относительный путь постера в public URL
function toPublicUrl(raw: string): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, "");
  const bucket = import.meta.env.VITE_SUPABASE_BUCKET;
  const key = raw.replace(/^\/?posters\//, "").replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${bucket}/${key}`;
}

type HistoryRow = {
  d: string;
  question_id: number;
  image_url: string;
  correct_answer: string;
  category_id: number;
  difficulty_level_id: number;
  total_answers: number;
  correct_answers: number;
  created_at: string;
};

type SearchRow = {
  id: number;
  image_url: string;
  correct_answer: string;
  category_id: number | null;
  difficulty_level_id: number | null;
};

export default function AdminDailyPage() {
  const { user } = useAuth();
  const [amIAdmin, setAmIAdmin] = useState<boolean | null>(null);

  const [today] = useState(getDailyDateUS());
  const [targetDate, setTargetDate] = useState(getDailyDateUS());
  const [questionId, setQuestionId] = useState<number | "">("");

  const [submitting, setSubmitting] = useState(false);

  const [hist, setHist] = useState<HistoryRow[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);

  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchRows, setSearchRows] = useState<SearchRow[]>([]);

  // admin check
  useEffect(() => {
    (async () => {
      try {
        const ok = await isAdmin();
        setAmIAdmin(ok);
      } catch (e) {
        console.error(e);
        setAmIAdmin(false);
      }
    })();
  }, []);

  // history
  const refreshHistory = async () => {
    setLoadingHist(true);
    try {
      const rows = await getDailyHistoryAdmin(60, 0);
      setHist(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHist(false);
    }
  };

  useEffect(() => {
    if (amIAdmin) refreshHistory();
  }, [amIAdmin]);

  const niceDate = useMemo(() => {
    const [y, m, d] = today.split("-");
    return `${y}–${m}–${d}`;
  }, [today]);

  // search questions by text in correct_answer (RLS allows public select)
  const runSearch = async (term: string) => {
    setSearchLoading(true);
    try {
      if (!term.trim()) {
        setSearchRows([]);
        return;
      }
      const { data, error } = await supabase
        .from("question")
        .select("id,image_url,correct_answer,category_id,difficulty_level_id")
        .ilike("correct_answer", `%${term}%`)
        .order("id", { ascending: false })
        .limit(30);
      if (error) throw error;
      const rows = (data || []) as any[];
      setSearchRows(
        rows.map((r) => ({
          id: r.id,
          image_url: toPublicUrl(String(r.image_url ?? "")),
          correct_answer: r.correct_answer,
          category_id: r.category_id ?? null,
          difficulty_level_id: r.difficulty_level_id ?? null,
        })),
      );
    } catch (e) {
      console.error(e);
      setSearchRows([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSet = async () => {
    if (!questionId || !targetDate) return;
    try {
      setSubmitting(true);
      await setDailyQuestion(targetDate, Number(questionId));
      await refreshHistory();
    } catch (e) {
      console.error(e);
      alert("Failed to set daily question. See console for details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (amIAdmin === null) {
    return (
      <>
        <Seo title="Admin · Daily | Hard Quiz" />
        <div className="mx-auto max-w-3xl">
          <p className="mt-8 text-sm opacity-80">Checking admin rights…</p>
        </div>
      </>
    );
  }

  if (!amIAdmin) {
    return (
      <>
        <Seo title="Admin · Daily | Hard Quiz" />
        <div className="mx-auto max-w-3xl">
          <h1 className="mt-8 text-2xl font-bold">Admin · Daily</h1>
          <p className="mt-2 text-sm text-red-300">Not authorized.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Admin · Daily | Hard Quiz" />
      <section className="mx-auto max-w-5xl">
        <header className="mb-4">
          <h1 className="text-3xl font-extrabold">Admin · Daily</h1>
          <p className="mt-1 text-sm opacity-80">
            Today (US Central): <b>{niceDate}</b>
          </p>
        </header>

        {/* Set question */}
        <div className="rounded-md border border-white/10 p-4">
          <h2 className="text-lg font-semibold mb-3">Set / Override Daily Question</h2>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="text-xs opacity-70">Date (US Central)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs opacity-70">Question ID</label>
              <input
                type="number"
                value={questionId}
                onChange={(e) =>
                  setQuestionId(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 outline-none"
                placeholder="e.g. 1234"
              />
            </div>
            <button
              className="btn-primary md:w-48"
              disabled={!targetDate || !questionId || submitting}
              onClick={handleSet}
              title={!targetDate || !questionId ? "Pick date and question id" : undefined}
            >
              {submitting ? "Saving…" : "Set Daily"}
            </button>
          </div>

          {/* quick search helper */}
          <div className="mt-4">
            <label className="text-xs opacity-70">Quick search by answer text</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                const v = e.target.value;
                setSearch(v);
                runSearch(v);
              }}
              placeholder="Type part of answer…"
              className="mt-1 w-full rounded-md bg-white/5 px-3 py-2 outline-none"
            />
            {searchLoading ? (
              <p className="mt-2 text-sm opacity-80">Searching…</p>
            ) : search && searchRows.length === 0 ? (
              <p className="mt-2 text-sm opacity-80">No results.</p>
            ) : searchRows.length > 0 ? (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {searchRows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border border-white/10 overflow-hidden hover:border-white/20 transition"
                  >
                    <div className="aspect-[3/4] bg-white/5 flex items-center justify-center">
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt={`Q#${r.id}`}
                          className="max-h-60 w-auto object-contain"
                        />
                      ) : (
                        <div className="text-xs opacity-60">no image</div>
                      )}
                    </div>
                    <div className="p-2 text-sm">
                      <div className="font-semibold">{r.correct_answer}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="opacity-70">ID: {r.id}</span>
                        <button
                          className="btn-secondary px-2 py-1 text-xs"
                          onClick={() => setQuestionId(r.id)}
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {/* History */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">History (last 60)</h2>
          {loadingHist ? (
            <p className="text-sm opacity-80">Loading…</p>
          ) : hist.length === 0 ? (
            <p className="text-sm opacity-80">No history yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hist.map((h) => (
                <article
                  key={h.d}
                  className="rounded-md border border-white/10 overflow-hidden"
                >
                  <div className="aspect-[3/4] bg-white/5 flex items-center justify-center">
                    {h.image_url ? (
                      <img
                        src={h.image_url}
                        alt={`${h.d}`}
                        className="max-h-60 w-auto object-contain"
                      />
                    ) : (
                      <div className="text-xs opacity-60">no image</div>
                    )}
                  </div>
                  <div className="p-3 text-sm">
                    <div className="font-semibold">{h.d}</div>
                    <div className="opacity-80">{h.correct_answer}</div>
                    <div className="mt-1 flex items-center justify-between text-xs opacity-80">
                      <span>ID: {h.question_id}</span>
                      <span>
                        {h.correct_answers}/{h.total_answers} correct
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
