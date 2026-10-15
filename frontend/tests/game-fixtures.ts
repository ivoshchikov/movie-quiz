import type { Page } from "@playwright/test";
import type { ServerGame } from "../src/game/server";
import { mockQuizApi, mockSignedIn, difficulties } from "./fixtures";
export const gameAnswers = [
  "Jojo Rabbit (2019)",
  "The Boy in the Striped Pajamas (2008)",
  "The Book Thief (2013)",
  "Pan’s Labyrinth (2006)",
];
export const gameEpoch = new Date("2026-10-06T12:00:00Z");
export interface GameFixtureOptions {
  size?: number;
  seconds?: number;
  lives?: number;
  signedIn?: boolean;
  choices?: string[];
  ratio?: [number, number];
  best?: { score: number; time: number } | null;
}
export async function gameFixture(
  page: Page,
  options: GameFixtureOptions = {},
) {
  await page.clock.install({ time: gameEpoch });
  await page.clock.pauseAt(new Date(gameEpoch.getTime() + 1000));
  const calls = await mockQuizApi(page);
  if (options.signedIn) await mockSignedIn(page);
  const choices = options.choices ?? gameAnswers;
  const games = new Map<string, ServerGame>();
  const data = {
    calls,
    games,
    best: options.best ?? (null as { score: number; time: number } | null),
    failStart: false,
    failNext: false,
    failAnswer: false,
    failFinish: false,
    malformed: false,
    serverTime: null as number | null,
    accepted: 0,
    finishes: 0,
    holdAnswer: null as Promise<void> | null,
  };
  const now = async () =>
    data.serverTime ??
    (await page
      .evaluate(() => Date.now())
      .catch(() => gameEpoch.getTime() + 1000));
  const save = (
    g: ServerGame,
    t: number,
    reason: "exit" | "completed" | "out-of-lives",
  ) => {
    if (g.status === "finished") return;
    g.status = "finished";
    g.finish_reason = reason;
    g.time_secs = Math.max(
      0,
      Math.floor((t - Date.parse(g.started_at)) / 1000),
    );
    if (options.signedIn) {
      g.previous_best = data.best;
      g.record_outcome = !data.best
        ? "first"
        : g.score > data.best.score ||
            (g.score === data.best.score && g.time_secs < data.best.time)
          ? "new"
          : null;
      if (g.record_outcome) data.best = { score: g.score, time: g.time_secs };
      g.personal_best = data.best;
    }
  };
  await page.route("**/rest/v1/difficulty_level?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        difficulties.map((d) =>
          d.id === 1
            ? {
                ...d,
                time_limit_secs: options.seconds ?? 30,
                lives: options.lives ?? 3,
              }
            : d,
        ),
      ),
    }),
  );
  await page.route("**/rest/v1/user_best?**", (route) => {
    const u = new URL(route.request().url());
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        data.best
          ? [
              {
                category_id:
                  Number(
                    u.searchParams.get("category_id")?.replace("eq.", ""),
                  ) || 1,
                difficulty_level_id:
                  Number(
                    u.searchParams
                      .get("difficulty_level_id")
                      ?.replace("eq.", ""),
                  ) || 1,
                best_score: data.best.score,
                best_time: data.best.time,
              },
            ]
          : [],
      ),
    });
  });
  await page.route("**/rest/v1/rpc/quiz_*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop()!;
    if (
      !["quiz_start", "quiz_next", "quiz_answer", "quiz_finish"].includes(name)
    )
      return route.fallback();
    const p = route.request().postDataJSON();
    calls.push({ name, payload: p });
    const fail =
      name === "quiz_start"
        ? data.failStart
        : name === "quiz_next"
          ? data.failNext
          : name === "quiz_answer"
            ? data.failAnswer
            : data.failFinish;
    if (fail)
      return route.fulfill({
        status: 503,
        body: '{"message":"fixture unavailable"}',
      });
    const t = await now();
    if (name === "quiz_start" && !games.has(p.p_session))
      games.set(p.p_session, {
        id: p.p_session,
        category_id: p.p_category_id,
        difficulty_id: p.p_difficulty_id,
        bank_size: options.size ?? 6,
        score: 0,
        lives: options.lives ?? 3,
        status: "active",
        started_at: new Date(t).toISOString(),
        server_now: new Date(t).toISOString(),
        time_secs: 0,
        finish_reason: null,
        round: null,
        previous_best: null,
        personal_best: null,
        record_outcome: null,
      });
    const g = games.get(p.p_session);
    if (!g) return route.fulfill({ status: 404, body: "{}" });
    g.server_now = new Date(t).toISOString();
    if (g.status !== "finished")
      g.time_secs = Math.max(
        0,
        Math.floor((t - Date.parse(g.started_at)) / 1000),
      );
    if (name === "quiz_next" && g.status !== "finished") {
      if (!g.round || g.round.outcome) {
        const n = (g.round?.number ?? 0) + 1;
        if (n > g.bank_size) save(g, t, "completed");
        else
          g.round = {
            id: `00000000-0000-4000-8000-${String(1000 + n).padStart(12, "0")}`,
            number: n,
            question_id: 999 + n,
            image_url: `https://quiz-fixture.supabase.co/game-fixture-${n - 1}.svg`,
            options: choices,
            issued_at: new Date(t).toISOString(),
            deadline_at: new Date(
              t + (options.seconds ?? 30) * 1000,
            ).toISOString(),
            outcome: null,
            selected: null,
          };
      }
    }
    if (
      name === "quiz_answer" &&
      g.round &&
      !g.round.outcome &&
      g.status !== "finished"
    ) {
      if (t >= Date.parse(g.round.deadline_at)) {
        g.round.outcome = "timeout";
        g.lives--;
      } else if (p.p_answer != null) {
        g.round.selected = p.p_answer;
        g.round.outcome = p.p_answer === choices[0] ? "correct" : "wrong";
        if (g.round.outcome === "correct") g.score++;
        else g.lives--;
      }
      if (g.round.outcome) {
        data.accepted++;
        if (!g.lives) save(g, t, "out-of-lives");
        else if (g.round.number === g.bank_size) save(g, t, "completed");
      }
    }
    if (name === "quiz_finish") {
      data.finishes++;
      save(g, t, "exit");
    }
    const body = structuredClone(g);
    if (name === "quiz_answer" && data.holdAnswer) await data.holdAnswer;
    if (data.malformed && name === "quiz_next" && body.round)
      body.round.options = ["bad"];
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.route(/\/game-fixture-\d+\.svg(?:\?.*)?$/, (route) => {
    const [w, h] = options.ratio ?? [239, 100];
    return route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#30453e"/></svg>`,
    });
  });
  return data;
}
