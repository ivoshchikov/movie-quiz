import type { Page } from "@playwright/test";
import { mockQuizApi, mockSignedIn } from "./fixtures";
import { dailyDate, nextDailyReset } from "../src/daily/time";
export const dailyEpoch = new Date("2026-10-07T17:00:00Z");
export const dailyChoices = [
  "Fixture answer",
  "Second answer",
  "Third answer",
  "Fourth answer",
];
export interface FixtureResult {
  is_answered: boolean;
  is_correct: boolean | null;
  time_spent: number | null;
  answered_at: string | null;
}
export async function dailyFixture(
  page: Page,
  signedIn = true,
  options = dailyChoices,
) {
  await page.clock.install({ time: dailyEpoch });
  await mockQuizApi(page);
  if (signedIn) await mockSignedIn(page);
  const data = {
    calls: [] as { name: string; payload: Record<string, unknown> }[],
    results: new Map<string, FixtureResult>(),
    starts: new Map<string, string>(),
    failStatus: false,
    failStart: false,
    failSubmit: false,
    failQuestion: false,
    noQuestion: false,
    malformedQuestion: false,
    failStreak: false,
    failLeaderboard: false,
    failConfirmation: false,
    imageRatio: [239, 100] as [number, number],
    serverCorrect: null as boolean | null,
    beforeStatus: null as (() => Promise<void>) | null,
    serverTime: null as number | null,
  };
  await page.route("**/rest/v1/rpc/**", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop() || "",
      payload = route.request().postDataJSON() ?? {};
    const now =
      data.serverTime ??
      (await page.evaluate(() => Date.now()).catch(() => dailyEpoch.getTime()));
    const date = dailyDate(now),
      key = `fixture-user:${payload.p_date ?? date}`;
    const status = () => ({
      date,
      server_now: new Date(now).toISOString(),
      closes_at: new Date(nextDailyReset(now)).toISOString(),
      started_at: data.starts.get(`fixture-user:${date}`) ?? null,
      result: data.results.get(`fixture-user:${date}`)?.is_answered
        ? data.results.get(`fixture-user:${date}`)
        : null,
    });
    let body: unknown,
      fail = false;
    switch (name) {
      case "daily_status":
        if (data.beforeStatus) await data.beforeStatus();
        fail = data.failStatus;
        body = status();
        break;
      case "daily_begin":
        fail =
          data.failStart ||
          data.failQuestion ||
          data.noQuestion ||
          payload.p_date !== date;
        if (!fail && !data.starts.has(key))
          data.starts.set(key, new Date(now).toISOString());
        body = {
          ...status(),
          question: {
            id: 700,
            image_url: "https://quiz-fixture.supabase.co/daily-fixture.svg",
            options: data.malformedQuestion ? ["invalid"] : options,
            category_id: 1,
            difficulty_level_id: 1,
          },
        };
        break;
      case "get_my_daily_result":
        if (data.beforeStatus) await data.beforeStatus();
        fail =
          data.failStatus || (data.failConfirmation && data.results.has(key));
        body = [
          data.results.get(key) ?? {
            is_answered: false,
            is_correct: null,
            time_spent: null,
            answered_at: null,
          },
        ];
        break;
      case "submit_daily_answer":
        fail = data.failSubmit || payload.p_date !== date;
        body = null;
        if (!fail && !data.results.has(key))
          data.results.set(key, {
            is_answered: true,
            is_correct: data.serverCorrect ?? payload.p_answer === options[0],
            time_spent: Math.max(
              1,
              Math.floor((now - Date.parse(data.starts.get(key)!)) / 1000),
            ),
            answered_at: new Date(now).toISOString(),
          });
        break;
      case "get_daily_user_streak":
        fail = data.failStreak;
        body = [
          {
            current_streak: data.results.size ? 4 : 3,
            longest_streak: 7,
            total_correct: data.results.size ? 13 : 12,
          },
        ];
        break;
      case "daily_leaderboard": {
        fail = data.failLeaderboard;
        const top = Array.from(
          { length: Math.min(25, Number(payload.p_limit)) },
          (_, i) => ({
            rank: i + 1,
            user_id: i === 1 ? "fixture-user" : `player-${i}`,
            nickname:
              i === 1
                ? "MovieFan"
                : `${payload.p_active_only ? "Active" : "Best"}Player ${i + 1}`,
            streak: 30 - i,
            start_d: "2026-09-18",
            end_d: date,
          }),
        );
        body = {
          total: 25,
          top,
          me: top.find((r) => r.user_id === "fixture-user") ?? null,
        };
        break;
      }
      default:
        return route.fallback();
    }
    data.calls.push({ name, payload });
    return route.fulfill({
      status: fail ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(fail ? { message: "Fixture network error" } : body),
    });
  });
  await page.route(/\/daily-fixture\.svg(?:\?.*)?$/, (r) =>
    r.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${data.imageRatio[0]}" height="${data.imageRatio[1]}"><rect width="100%" height="100%" fill="#30453e"/></svg>`,
    }),
  );
  return data;
}
