import { gaEvent } from "./ga";
import type { AnalyticsParameters } from "./ga";

type Mode = "normal" | "daily" | "time_attack" | "this_or_that";
interface ArticleOrigin { article_slug: string; cta_position: "footer"; cta_id: string; }
interface Attempt {
  runId: string; sent: string[]; resolved: (number | string)[]; answered: number[];
  origin?: ArticleOrigin; updatedAt: number;
}
const prefix = "hq:analytics:v2:";
const originKey = `${prefix}article`;
const ttl = 24 * 60 * 60 * 1000;
const attempts = new Map<string, Attempt>();

export function articleToQuiz(slug: string, mode: Mode | "games") {
  const origin: ArticleOrigin = { article_slug: slug, cta_position: "footer", cta_id: crypto.randomUUID() };
  if (!gaEvent("article_to_quiz_click", { ...origin, game_mode: mode })) return;
  try { sessionStorage.setItem(originKey, JSON.stringify({ ...origin, mode, at: Date.now() })); } catch { /* Attribution is optional. */ }
}
function takeOrigin(mode: Mode): ArticleOrigin | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(originKey) || "null");
    if (!value || (value.mode !== mode && value.mode !== "games") || typeof value.at !== "number" || Date.now() - value.at < 0 || Date.now() - value.at > 30 * 60 * 1000) return;
    sessionStorage.removeItem(originKey);
    if (typeof value.article_slug === "string" && typeof value.cta_id === "string" && value.cta_position === "footer") {
      return { article_slug: value.article_slug, cta_position: "footer", cta_id: value.cta_id };
    }
  } catch { /* No source association without readable storage. */ }
}
function persist(key: string, attempt: Attempt) {
  attempt.updatedAt = Date.now();
  try {
    sessionStorage.setItem(key, JSON.stringify(attempt));
    // Bound per-tab storage even after many games. Never touch gameplay/auth storage.
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith(prefix) && k !== originKey);
    for (const k of keys.slice(0, Math.max(0, keys.length - 40))) if (k !== key) sessionStorage.removeItem(k);
  } catch { /* Memory deduplication still works when storage is denied/full. */ }
}
export function attemptAnalytics(mode: Mode, localKey: string) {
  // localKey is never emitted. Do not pass server capability IDs as run_id.
  const key = `${prefix}${mode}:${localKey}`;
  let attempt = attempts.get(key);
  if (!attempt) {
    try {
      const value: Attempt = JSON.parse(sessionStorage.getItem(key) || "null");
      if (value && typeof value.runId === "string" && Array.isArray(value.sent) && Array.isArray(value.resolved) &&
        Array.isArray(value.answered) && Number.isFinite(value.updatedAt) && Date.now() - value.updatedAt >= 0 && Date.now() - value.updatedAt < ttl) attempt = value;
    } catch { /* Memory-only attempt. */ }
    attempt ??= { runId: crypto.randomUUID(), sent: [], resolved: [], answered: [], updatedAt: Date.now() };
    attempts.set(key, attempt);
    if (attempts.size > 40) attempts.delete(attempts.keys().next().value!);
  }
  const record = attempt;
  const common = () => ({ run_id: record.runId, game_mode: mode, ...record.origin });
  function once(name: string, params: AnalyticsParameters = {}) {
    if (record.sent.includes(name)) return false;
    if (!gaEvent(name, { ...common(), ...params })) return false;
    record.sent.push(name); persist(key, record); return true;
  }
  function start(params: AnalyticsParameters = {}, resumed = false) {
    record.origin ??= takeOrigin(mode);
    if (resumed) { if (gaEvent("daily_resume", { ...common(), ...params })) persist(key, record); }
    else once(mode === "daily" ? "daily_start" : mode === "this_or_that" ? "comparison_start" : "quiz_start", params);
  }
  return {
    start,
    comparisonChoice(localRoundKey: string, params: AnalyticsParameters) {
      if (mode !== "this_or_that" || record.resolved.includes(localRoundKey)) return;
      record.origin ??= takeOrigin(mode);
      if (!gaEvent("comparison_choice", { ...common(), ...params })) return;
      // Round capabilities are local deduplication inputs, never event values.
      record.resolved.push(localRoundKey); persist(key, record);
      once("comparison_first_choice", params);
    },
    answer(number: number, outcome: "correct" | "wrong" | "timeout" | "skipped", params: AnalyticsParameters) {
      if (record.resolved.includes(number)) return;
      const explicit = outcome === "correct" || outcome === "wrong", count = record.answered.length + Number(explicit);
      if (!gaEvent("quiz_answer", { ...common(), ...params, question_number: number, outcome,
        correct: outcome === "correct", answer_count: count, resolved_count: record.resolved.length + 1 })) return;
      record.resolved.push(number); if (explicit) record.answered.push(number); persist(key, record);
      if (explicit) once("quiz_first_answer", { ...params, question_number: number });
      if (count >= 3) once("qualified_play", { ...params, answer_count: count, criterion: "three_answers" });
    },
    end(params: AnalyticsParameters) {
      // A passive restored receipt cannot invent a newly observed game.
      if (record.sent.includes("quiz_start")) once("quiz_end", { ...params, answer_count: record.answered.length, resolved_count: record.resolved.length });
    },
    submit(params: AnalyticsParameters) {
      once("daily_submit", params);
      once("qualified_play", { ...params, answer_count: 1, criterion: "daily_submitted" });
    },
  };
}
