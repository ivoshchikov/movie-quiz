import type { Page } from "@playwright/test";
import { mockQuizApi, mockSignedIn } from "./fixtures";

export const dailyEpoch = new Date("2026-10-07T17:00:00Z");
export const dailyChoices = ["Fixture answer", "Second answer", "Third answer", "Fourth answer"];
export interface FixtureResult { is_answered: boolean; is_correct: boolean | null; time_spent: number | null; answered_at: string | null; }
export async function dailyFixture(page: Page, signedIn = true, options = dailyChoices) {
  await page.clock.setFixedTime(dailyEpoch);
  await mockQuizApi(page);
  if (signedIn) await mockSignedIn(page);
  const data = {
    calls: [] as { name: string; payload: Record<string, unknown> }[],
    results: new Map<string, FixtureResult>(),
    failStatus: false, failStart: false, failSubmit: false, failQuestion: false, noQuestion: false, malformedQuestion: false,
    failStreak: false, failLeaderboard: false, failConfirmation: false,
    imageRatio: [239, 100] as [number, number],
    serverCorrect: null as boolean | null,
    beforeStatus: null as (() => Promise<void>) | null,
  };
  await page.route("**/rest/v1/rpc/**", async route => {
    const name = new URL(route.request().url()).pathname.split("/").pop() || "";
    const payload = route.request().postDataJSON();
    const key = `${payload.p_user_id}:${payload.p_date}`;
    let body: unknown, fail = false;
    switch (name) {
      case "get_daily_question":
        fail = data.failQuestion;
        body = data.noQuestion ? [] : [{ id: 700, image_url: "https://quiz-fixture.supabase.co/daily-fixture.svg", options_json: data.malformedQuestion ? ["invalid"] : options, correct_answer: options[0], category_id: 1, difficulty_level_id: 1 }]; break;
      case "get_my_daily_result":
        if (data.beforeStatus) await data.beforeStatus();
        fail = data.failStatus || (data.failConfirmation && data.results.has(key));
        body = [data.results.get(key) ?? { is_answered: false, is_correct: null, time_spent: null, answered_at: null }]; break;
      case "start_daily_session": fail = data.failStart; body = null; break;
      case "submit_daily_result":
        fail = data.failSubmit; body = null;
        if (!fail) data.results.set(key, { is_answered: true, is_correct: data.serverCorrect ?? payload.p_is_correct, time_spent: payload.p_time, answered_at: "2026-10-07T17:00:00Z" });
        break;
      case "get_daily_user_streak":
        fail = data.failStreak;
        body = [{ current_streak: data.results.size ? 4 : 3, longest_streak: 7, total_correct: data.results.size ? 13 : 12 }]; break;
      case "get_daily_streak_leaderboard":
        fail = data.failLeaderboard;
        body = Array.from({ length: payload.p_limit }, (_, i) => ({ user_id: i === 1 ? "fixture-user" : `player-${i}`, nickname: i === 1 ? "MovieFan" : `${payload.p_active_only ? "Active" : "Best"}Player ${i + 1}`, streak: 20 - i, start_d: "2026-09-18", end_d: "2026-10-07" })); break;
      default: return route.fallback();
    }
    data.calls.push({ name, payload });
    return route.fulfill({ status: fail ? 503 : 200, contentType: "application/json", body: JSON.stringify(fail ? { message: "Fixture network error" } : body) });
  });
  await page.route(/\/daily-fixture\.svg(?:\?.*)?$/, route => route.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="${data.imageRatio[0]}" height="${data.imageRatio[1]}"><rect width="100%" height="100%" fill="#30453e"/></svg>` }));
  return data;
}
