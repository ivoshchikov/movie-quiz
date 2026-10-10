import type { Page } from "@playwright/test";
import { mockQuizApi, mockSignedIn } from "./fixtures";
export const ADMIN_TODAY = "2026-10-10";
export const adminQuestion = (id = 801, answer = "Search Film") => ({
  id,
  image_url: "https://quiz-fixture.supabase.co/fixture.svg",
  correct_answer: answer,
  category_id: 1,
  difficulty_level_id: 1,
  options_json: [answer, "Second answer", "Third answer", "Fourth answer"],
});
export const historyRow = (d = "2026-10-06", id = 800) => ({
  d,
  question_id: id,
  image_url: "history-film.jpg",
  correct_answer: "History Film",
  category_id: 1,
  difficulty_level_id: 1,
  total_answers: 5,
  correct_answers: 3,
  created_at: `${d}T12:00:00Z`,
});

export async function mockAdmin(page: Page, signedIn = true) {
  await page.clock.setFixedTime(new Date("2026-10-10T17:30:00Z"));
  const otherCalls = await mockQuizApi(page);
  if (signedIn) await mockSignedIn(page);
  const state = {
    admin: true,
    rightsError: false,
    assignmentError: false,
    searchError: false,
    previewError: false,
    historyError: false,
    current: null as number | null,
    version: 0,
    attempts: 0,
    searchRows: [adminQuestion()],
    previewRows: new Map([
      [801, adminQuestion()],
      [800, adminQuestion(800, "Current Film")],
    ]),
    historyRows: [historyRow()],
    searchDelay: 0,
    writeDelay: 0,
    writeMode: "success" as
      | "success"
      | "reject"
      | "lost-saved"
      | "lost-unknown",
    beforeRead: null as null | (() => void),
    calls: [] as { name: string; payload: Record<string, unknown> }[],
    searches: [] as string[],
  };
  const error = (
    route: Parameters<Parameters<Page["route"]>[1]>[0],
    code = "P0001",
  ) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ code, message: "Fixture rejected request" }),
    });
  await page.route("**/rest/v1/rpc/**", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop()!;
    const payload = route.request().postDataJSON() ?? {};
    if (
      ![
        "is_admin",
        "get_daily_history_admin",
        "get_daily_assignment_admin",
        "set_daily_question_admin",
      ].includes(name)
    )
      return route.fallback();
    state.calls.push({ name, payload });
    const assignment = () => [
      {
        d: payload.p_date,
        question_id: state.current,
        attempt_count: state.attempts,
        version: state.version,
      },
    ];
    let body: unknown;
    if (name === "is_admin") {
      if (state.rightsError) return error(route);
      body = state.admin;
    }
    if (name === "get_daily_history_admin") {
      if (state.historyError) return error(route);
      body = state.historyRows.slice(
        Number(payload.p_offset),
        Number(payload.p_offset) + Number(payload.p_limit),
      );
    }
    if (name === "get_daily_assignment_admin") {
      state.beforeRead?.();
      if (state.assignmentError) return error(route);
      body = assignment();
    }
    if (name === "set_daily_question_admin") {
      if (state.writeDelay)
        await new Promise((resolve) => setTimeout(resolve, state.writeDelay));
      if (state.writeMode === "reject") return error(route);
      if (state.writeMode === "lost-unknown") {
        state.assignmentError = true;
        return route.abort("failed");
      }
      state.current = Number(payload.p_question_id);
      state.version++;
      if (state.writeMode === "lost-saved") return route.abort("failed");
      body = assignment();
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.route("**/rest/v1/question?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.has("correct_answer")) {
      state.searches.push(params.get("correct_answer")!);
      const rows = [...state.searchRows];
      if (state.searchDelay)
        await new Promise((resolve) => setTimeout(resolve, state.searchDelay));
      if (state.searchError) return error(route);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(rows),
      });
    }
    if (params.has("id")) {
      if (state.previewError) return error(route);
      const row = state.previewRows.get(
        Number(params.get("id")?.replace("eq.", "")),
      );
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(row ? [row] : []),
      });
    }
    return route.fallback();
  });
  return { state, otherCalls };
}
export async function selectAdminQuestion(page: Page, id = 801) {
  await page.getByLabel("Search by answer").fill("Film");
  await page
    .getByRole("button", { name: `Select question ${id}`, exact: true })
    .click();
  await page.getByRole("img", { name: /Preview of/ }).waitFor();
}
