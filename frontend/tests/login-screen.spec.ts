import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { mockQuizApi, mockSignedIn } from "./fixtures";
import { dailyFixture } from "./daily-fixtures";

const metadata = JSON.parse(readFileSync(path.resolve("src/loginMetadata.json"), "utf8")) as { title: string; description: string; url: string };
const address = "film.fan@example.test";
async function ready(page: Page, url = "/login") {
  await mockQuizApi(page);
  await page.goto(url);
  await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toBeEnabled();
}
async function send(page: Page) {
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(address);
  await page.getByRole("button", { name: "Send sign-in link", exact: true }).click();
}
async function confirmAccount(page: Page) {
  await page.route("**/auth/v1/user", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: "fixture-user", aud: "authenticated", role: "authenticated", email: address, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" }) }));
  await page.evaluate(async () => {
    const { supabase } = await import(new URL("/src/supabase.ts", location.origin).href);
    const payload = btoa(JSON.stringify({ sub: "fixture-user", role: "authenticated", exp: 4102444800 })).replace(/=/g, "");
    await supabase.auth.setSession({ access_token: `e30.${payload}.fixture`, refresh_token: "fixture-refresh-token" });
  });
}

test("page and modal share email/Google, a labeled field and guest access", async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in to Hard Quiz", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveAttribute("autocomplete", "email");
  await expect(page.getByText("No password needed.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeDisabled();
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("textbox", { name: "Email" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("link", { name: /Play a regular quiz as a guest/ }).click();
  await expect(page).toHaveURL("http://localhost:5173/");
  expect(calls.filter(call => ["get_question", "start_daily_session", "upsert_user_best"].includes(call.name))).toHaveLength(0);
});

test("email success is inline, focused and does not announce an authenticated session", async ({ page }) => {
  await ready(page, "/login?redirect=%2Fprofile");
  const dialogs: string[] = [];
  page.on("dialog", dialog => { dialogs.push(dialog.message()); void dialog.dismiss(); });
  const request = page.waitForRequest(item => new URL(item.url()).pathname === "/auth/v1/otp");
  await send(page);
  await expect(page.getByRole("heading", { name: "Check your email", exact: true })).toBeVisible();
  await expect(page.locator(".hq-login-sent")).toBeFocused();
  await expect(page.locator(".hq-login-sent")).toContainText(address);
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend link" })).toBeDisabled();
  const sent = await request;
  expect(sent.postDataJSON()).toMatchObject({ email: address, create_user: true });
  expect(new URL(sent.url()).searchParams.get("redirect_to")).toBe("http://localhost:5173/profile");
  expect(dialogs).toEqual([]);
});

test("resend is explicit, waits for the cooldown and keeps the destination", async ({ page }) => {
  await page.clock.install();
  await ready(page, "/login?redirect=%2Fdaily");
  let requests = 0;
  await page.route("**/auth/v1/otp?**", route => { requests++; return route.fulfill({ contentType: "application/json", body: "{}" }); });
  await send(page);
  await expect(page.getByRole("button", { name: "Resend link" })).toBeDisabled();
  await page.clock.runFor(60_100);
  await expect(page.getByRole("button", { name: "Resend link" })).toBeEnabled();
  expect(requests).toBe(1);
  await page.getByRole("button", { name: "Resend link" }).click();
  await expect(page.getByRole("button", { name: "Resend link" })).toBeDisabled();
  expect(requests).toBe(2);
  await page.getByRole("button", { name: "Use another email" }).click();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeDisabled();
  await page.getByRole("textbox", { name: "Email" }).fill("another@example.test");
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeEnabled();
});

for (const [status, code, message] of [
  [503, "unexpected_failure", "couldn’t confirm whether the link was sent"],
  [429, "over_email_send_rate_limit", "Too many sign-in requests"],
  [400, "email_address_invalid", "Check your email address"],
  [400, "email_provider_disabled", "Email sign-in is unavailable"],
] as const) test(`server failure ${code} never shows a sent-link success`, async ({ page }) => {
  await page.clock.install();
  await ready(page);
  await page.route("**/auth/v1/otp?**", route => route.fulfill({ status, headers: { "x-supabase-api-version": "2024-01-01" }, contentType: "application/json", body: JSON.stringify({ code, error_code: code, message: "fixture failure" }) }));
  await send(page);
  await expect(page.getByRole("alert")).toContainText(message);
  await expect(page.getByRole("heading", { name: "Check your email" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(address);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  if (status === 429) await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeDisabled();
  else {
    if (status === 503) await page.clock.runFor(60_100);
    await page.unroute("**/auth/v1/otp?**");
    await page.getByRole("button", { name: "Send sign-in link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  }
});

test("pending email blocks duplicate submissions and the Google path", async ({ page }) => {
  await ready(page);
  let release: () => void = () => {}, count = 0;
  const hold = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/auth/v1/otp?**", async route => { count++; await hold; await route.fulfill({ contentType: "application/json", body: "{}" }); });
  await send(page);
  await expect(page.getByRole("button", { name: "Sending…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeDisabled();
  expect(count).toBe(1);
  release();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

test("timeout means unconfirmed delivery and a late response cannot replace the error", async ({ page }) => {
  await page.clock.install();
  await ready(page);
  let release: () => void = () => {};
  const hold = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/auth/v1/otp?**", async route => { await hold; await route.fulfill({ contentType: "application/json", body: "{}" }); });
  await send(page);
  await page.clock.runFor(10_100);
  await expect(page.getByRole("alert")).toContainText("couldn’t confirm whether the link was sent");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  release();
  await page.clock.runFor(100);
  await expect(page.getByRole("heading", { name: "Check your email" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeDisabled();
});

test("a network failure gives an uncertain result without a false success", async ({ page }) => {
  await ready(page);
  await page.route("**/auth/v1/otp?**", route => route.abort("failed"));
  await send(page);
  await expect(page.getByRole("alert")).toContainText("couldn’t confirm whether the link was sent");
  await expect(page.getByRole("heading", { name: "Check your email" })).toHaveCount(0);
});

test("closing a pending modal preserves filters and rejects its late UI update", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/leaderboard?category=2&difficulty=3");
  let release: () => void = () => {};
  const hold = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/auth/v1/otp?**", async route => { await hold; await route.fulfill({ contentType: "application/json", body: "{}" }); });
  await page.locator(".hq-leaderboard-guest").getByRole("button", { name: "Log in" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Email" }).fill(address);
  await dialog.getByRole("button", { name: "Send sign-in link" }).click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  release();
  await expect(page).toHaveURL(/\/leaderboard\?category=2&difficulty=3$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator(".hq-leaderboard-guest").getByRole("button", { name: "Log in" }).click();
  await dialog.getByRole("textbox", { name: "Email" }).fill(address);
  await expect(dialog.getByRole("button", { name: "Send sign-in link" })).toBeDisabled();
});

test("protected destination survives reload and storage denial does not stop email", async ({ page }) => {
  await mockQuizApi(page);
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Denied", "SecurityError"); }; });
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile$/);
  await page.reload();
  const request = page.waitForRequest(item => new URL(item.url()).pathname === "/auth/v1/otp");
  await send(page);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  expect(new URL((await request).url()).searchParams.get("redirect_to")).toBe("http://localhost:5173/profile");
});

for (const destination of ["https://evil.test", "//evil.test", "/\\evil.test", "/login?redirect=/daily", "/setup-profile", "/play", "/unknown", "/blog/%2e%2e/login"]) {
  test(`unsafe or active return path is replaced: ${destination}`, async ({ page }) => {
    const calls = await mockQuizApi(page);
    await page.goto(`/login?redirect=${encodeURIComponent(destination)}`);
    await expect(page).toHaveURL("http://localhost:5173/login");
    const request = page.waitForRequest(item => new URL(item.url()).pathname === "/auth/v1/otp");
    await send(page);
    expect(new URL((await request).url()).searchParams.get("redirect_to")).toBe("http://localhost:5173/");
    expect(calls.filter(call => ["get_question", "start_daily_session"].includes(call.name))).toHaveLength(0);
  });
}

test("confirmed sign-in closes the modal and does not start Daily", async ({ page }) => {
  const { calls } = await dailyFixture(page, false);
  await page.goto("/daily");
  await page.getByRole("button", { name: "Log in to play" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await confirmAccount(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/daily$/);
  expect(calls.filter(call => ["get_question", "start_daily_session", "submit_daily_result"].includes(call.name))).toHaveLength(0);
});

test("confirmed sign-in returns to selected leaderboard filters", async ({ page }) => {
  await ready(page, "/login?redirect=%2Fleaderboard%3Fcategory%3D2%26difficulty%3D3");
  await confirmAccount(page);
  await expect(page).toHaveURL(/\/leaderboard\?category=2&difficulty=3$/);
  await expect(page.getByRole("radio", { name: "Actors", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "Hard", exact: true })).toHaveAttribute("aria-checked", "true");
});

test("an existing account bypasses login without changing its nickname", async ({ page }) => {
  const calls = await mockQuizApi(page);
  await mockSignedIn(page);
  await page.goto("/login?redirect=%2Fprofile");
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { name: "MovieFan", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(calls.filter(call => ["upsert_user_best", "start_daily_session"].includes(call.name))).toHaveLength(0);
});

test("a pending fallback never redirects a normal visit by an already signed-in player", async ({ page }) => {
  await mockQuizApi(page);
  await mockSignedIn(page);
  await page.addInitScript(() => localStorage.setItem("hq_auth_return_v1", JSON.stringify({ path: "/daily", createdAt: Date.now() })));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  await expect(page).toHaveURL("http://localhost:5173/");
});

test("a fresh root callback uses a validated fallback only once", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  await page.evaluate(() => localStorage.setItem("hq_auth_return_v1", JSON.stringify({ path: "/profile", createdAt: Date.now() })));
  await confirmAccount(page);
  await expect(page).toHaveURL(/\/profile$/);
  expect(await page.evaluate(() => localStorage.getItem("hq_auth_return_v1"))).toBeNull();
  await page.getByRole("link", { name: "Play", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  await expect(page).toHaveURL("http://localhost:5173/");
});

for (const [name, value] of [
  ["expired", { path: "/profile", createdAt: 0 }],
  ["future", { path: "/profile", createdAt: 4102444800000 }],
  ["unsafe", { path: "//evil.test", createdAt: "now" }],
]) test(`a ${name} fallback cannot redirect after sign-in`, async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  await page.evaluate(value => localStorage.setItem("hq_auth_return_v1", JSON.stringify(value)), value);
  await confirmAccount(page);
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  await expect(page).toHaveURL("http://localhost:5173/");
});

test("a direct destination wins over another attempt's stored fallback", async ({ page }) => {
  await ready(page, "/login?redirect=%2Fleaderboard%3Fcategory%3D2%26difficulty%3D3");
  await page.evaluate(() => localStorage.setItem("hq_auth_return_v1", JSON.stringify({ path: "/daily", createdAt: Date.now() })));
  await confirmAccount(page);
  await expect(page).toHaveURL(/\/leaderboard\?category=2&difficulty=3$/);
});

test("return destinations keep filters and remove authentication parameters", async ({ page }) => {
  const destination = "/leaderboard?category=2&difficulty=3&provider_token=fixture-token&provider_refresh_token=fixture-refresh&access_token=fixture-access&refresh_token=fixture-refresh&code=fixture-code&error_description=fixture-error&redirect=%2Fdaily#details";
  await ready(page, `/login?redirect=${encodeURIComponent(destination)}`);
  expect(new URL(page.url()).searchParams.get("redirect")).toBe("/leaderboard?category=2&difficulty=3#details");
  const request = page.waitForRequest(item => new URL(item.url()).pathname === "/auth/v1/otp");
  await send(page);
  expect(new URL((await request).url()).searchParams.get("redirect_to")).toBe("http://localhost:5173/leaderboard?category=2&difficulty=3#details");
  const views = await page.evaluate(() => window.dataLayer.map(entry => Array.from(entry as IArguments)).filter(args => args[0] === "event" && args[1] === "page_view"));
  expect(views.length).toBeGreaterThan(0);
  for (const view of views) {
    expect(JSON.stringify(view[2])).not.toMatch(/fixture-token|fixture-refresh|fixture-access|fixture-code|fixture-error|redirect=/);
  }
});

test("analytics excludes callback credentials and fragments from every pageview", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/leaderboard?category=2&difficulty=3&code=fixture-code&provider_token=fixture-provider#access_token=fixture-access&refresh_token=fixture-refresh&error_description=fixture-private");
  await expect(page.getByRole("heading", { name: "Leaderboard", exact: true })).toBeVisible();
  const views = await page.evaluate(() => window.dataLayer.map(entry => Array.from(entry as IArguments)).filter(args => args[0] === "event" && args[1] === "page_view"));
  expect(views.length).toBeGreaterThan(0);
  for (const view of views) {
    expect(view[2]).toMatchObject({ page_path: "/leaderboard?category=2&difficulty=3", page_location: "http://localhost:5173/leaderboard?category=2&difficulty=3" });
    expect(JSON.stringify(view[2])).not.toMatch(/fixture-code|fixture-provider|fixture-access|fixture-refresh|fixture-private/);
  }
});

test("invalid email is rejected and whitespace is trimmed before sending", async ({ page }) => {
  await ready(page);
  let sent = 0;
  await page.route("**/auth/v1/otp?**", route => { sent++; return route.fulfill({ contentType: "application/json", body: "{}" }); });
  await page.getByRole("textbox", { name: "Email" }).fill("not-an-email");
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  expect(sent).toBe(0);
  await page.getByRole("textbox", { name: "Email" }).fill(` ${address} `);
  const request = page.waitForRequest(item => new URL(item.url()).pathname === "/auth/v1/otp");
  await page.getByRole("textbox", { name: "Email" }).press("Enter");
  expect((await request).postDataJSON().email).toBe(address);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

for (const [code, message] of [["otp_expired", "expired or has already been used"], ["access_denied", "cancelled or permission was declined"], ["unexpected_error", "could not be completed"]]) {
  test(`callback failure ${code} is visible and the URL is cleaned`, async ({ page }) => {
    await ready(page, `/login?redirect=%2Fdaily#error=access_denied&error_code=${code}&error_description=Private+provider+details`);
    await expect(page.getByRole("alert")).toContainText(message);
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdaily$/);
    await expect(page.getByRole("alert")).not.toContainText("Private provider details");
    await send(page);
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("a cancelled callback on Daily offers recovery with the same destination", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/daily#error=access_denied");
  await expect(page.getByRole("alert")).toContainText("Sign-in was cancelled");
  await page.getByRole("button", { name: "Try signing in again" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Email" }).fill(address);
  const request = page.waitForRequest(item => new URL(item.url()).pathname === "/auth/v1/otp");
  await dialog.getByRole("button", { name: "Send sign-in link" }).click();
  expect(new URL((await request).url()).searchParams.get("redirect_to")).toBe("http://localhost:5173/daily");
});

test("Google SDK errors are handled before navigation", async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const { supabase } = await import(new URL("/src/supabase.ts", location.origin).href);
    supabase.auth.signInWithOAuth = async () => ({ data: { provider: "google", url: null }, error: Object.assign(new Error("fixture failure"), { code: "provider_disabled" }) });
  });
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("alert")).toContainText("Google sign-in is unavailable");
  await expect(page).toHaveURL(/\/login$/);
});

test("a late Google URL after timeout cannot navigate the page", async ({ page }) => {
  await page.clock.install();
  await ready(page);
  await page.evaluate(async () => {
    const { supabase } = await import(new URL("/src/supabase.ts", location.origin).href);
    supabase.auth.signInWithOAuth = () => new Promise(resolve => { setTimeout(() => resolve({ data: { provider: "google", url: location.origin + "/?late-google" }, error: null }), 20_000); });
  });
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.clock.runFor(10_100);
  await expect(page.getByRole("alert")).toContainText("did not open in time");
  await page.clock.runFor(10_100);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
});

test("session read failure remains unknown instead of a guest and can recover", async ({ page }) => {
  await mockQuizApi(page);
  await page.route("**/src/supabase.ts", async route => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({ response, body: body + '\nconst realRead = supabase.auth.getSession.bind(supabase.auth); window.fixtureReadFails = true; supabase.auth.getSession = () => window.fixtureReadFails ? Promise.resolve({ data: { session: null }, error: new Error("fixture session failure") }) : realRead();' });
  });
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Check your account" })).toBeVisible();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => { Object.assign(window, { fixtureReadFails: false }); });
  await page.getByRole("button", { name: "Retry sign-in check" }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile$/);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
});

test("session read timeout is recoverable and does not leave an endless loading form", async ({ page }) => {
  await page.clock.install();
  await mockQuizApi(page);
  await page.route("**/src/supabase.ts", async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\nconst realRead = supabase.auth.getSession.bind(supabase.auth); window.fixtureReadStalls = true; supabase.auth.getSession = () => window.fixtureReadStalls ? new Promise(() => {}) : realRead();' });
  });
  await page.goto("/login");
  await expect(page.locator(".hq-login-status")).toBeVisible();
  await page.clock.runFor(10_100);
  await expect(page.getByRole("alert")).toContainText("could not be checked");
  await page.evaluate(() => { Object.assign(window, { fixtureReadStalls: false }); });
  await page.getByRole("button", { name: "Retry sign-in check" }).click();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
});

test("a stalled SDK initialization refresh is cancelled and can recover on retry", async ({ page }) => {
  await page.clock.install();
  await mockQuizApi(page);
  await mockSignedIn(page);
  await page.addInitScript(() => {
    const key = "sb-quiz-fixture-auth-token";
    const session = JSON.parse(localStorage.getItem(key) || "{}");
    session.expires_at = 1;
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("hq_auth_return_v1", JSON.stringify({ path: "/daily", createdAt: Date.now() }));
  });
  let restored = false, requests = 0;
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/auth/v1/token?**", async route => {
    requests++;
    if (!restored) await held;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({
      access_token: `e30.${Buffer.from(JSON.stringify({ sub: "fixture-user", role: "authenticated", exp: 4102444800 })).toString("base64url")}.fixture`,
      refresh_token: "fixture-refresh-token", token_type: "bearer", expires_in: 3600, expires_at: 4102444800,
      user: { id: "fixture-user", aud: "authenticated", role: "authenticated", email: address, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
    }) }).catch(() => {});
  });
  await page.goto("/");
  await expect.poll(() => requests).toBe(1);
  await page.clock.runFor(10_100);
  await expect(page.getByRole("alert")).toContainText("could not be checked");
  // Let the SDK retry once on the same memoized initialization before recovery.
  await page.clock.runFor(500);
  await expect.poll(() => requests).toBeGreaterThan(1);
  restored = true;
  await page.getByRole("button", { name: "Retry sign-in check" }).click();
  await page.clock.runFor(1000);
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  await expect(page).toHaveURL("http://localhost:5173/");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("sb-quiz-fixture-auth-token") || "{}").user.id)).toBe("fixture-user");
  release();
});

test("nickname setup keeps its return page and never permits renaming", async ({ page }) => {
  const { calls } = await dailyFixture(page);
  let nickname: string | null = null;
  await page.route("**/rest/v1/profiles?**", route => {
    if (route.request().method() === "HEAD") return route.fulfill({ headers: { "content-range": "0-0/0", "access-control-expose-headers": "content-range" }, body: "" });
    if (route.request().method() === "PATCH") nickname = route.request().postDataJSON().nickname;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ nickname, avatar_url: null }) });
  });
  await page.goto("/setup-profile?redirect=%2Fdaily");
  await page.getByRole("textbox", { name: "Nickname" }).fill("NewFilmFan");
  await page.getByRole("button", { name: "Save and continue", exact: true }).click();
  await expect(page).toHaveURL(/\/daily$/);
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeVisible();
  await page.goto("/setup-profile?redirect=%2Fdaily");
  await expect(page).toHaveURL(/\/daily$/);
  expect(calls.filter(call => ["get_question", "start_daily_session"].includes(call.name))).toHaveLength(0);
});

test("guest result copy explains future saves without transferring the prior score", async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.goto("/login?redirect=%2Fresult");
  await expect(page.getByText("Sign in to save your next quizzes.", { exact: false })).toBeVisible();
  await confirmAccount(page);
  await expect(page).toHaveURL(/\/result$/);
  expect(calls.filter(call => call.name === "upsert_user_best")).toHaveLength(0);
});

test("modal keyboard focus stays inside and Escape restores the opener", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/daily");
  const opener = page.getByRole("button", { name: "Log in to play" });
  await opener.click();
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("login metadata excludes destination parameters on load and after navigation", async ({ page }) => {
  await ready(page, "/login?redirect=%2Fprofile");
  await expect(page).toHaveTitle(metadata.title);
  for (const selector of ['meta[name="description"]', 'meta[name="robots"]', 'link[rel="canonical"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:url"]', 'meta[name="twitter:title"]']) await expect(page.locator(selector)).toHaveCount(1);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", metadata.description);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", metadata.url);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", metadata.url);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await page.getByRole("link", { name: /Play a regular quiz as a guest/ }).click();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
});

for (const [width, height] of [[320, 480], [375, 812], [390, 844], [568, 320], [768, 1024], [1024, 768], [1366, 900]]) {
  test(`page, modal and long-email success fit ${width}×${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 1366 || width === 375) await page.screenshot({ path: process.env.HQ_REVIEW_DIR ? path.join(process.env.HQ_REVIEW_DIR, `hard-quiz-login-${width === 1366 ? "desktop" : "mobile"}.png`) : testInfo.outputPath("login.png"), fullPage: true });
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Email" }).fill("averylongfilmfanaddresswithoutspaces0123456789@example.test");
    await dialog.getByRole("button", { name: "Send sign-in link" }).click();
    await expect(dialog.getByRole("heading", { name: "Check your email" })).toBeVisible();
    const geometry = await dialog.evaluate(element => ({ width: element.scrollWidth, panel: element.querySelector(".hq-login-card")!.getBoundingClientRect().toJSON(), targets: Array.from(element.querySelectorAll("button,a")).map(target => target.getBoundingClientRect().toJSON()) }));
    expect(geometry.width).toBeLessThanOrEqual(width);
    expect(geometry.panel.left).toBeGreaterThanOrEqual(0);
    expect(geometry.panel.right).toBeLessThanOrEqual(width);
    for (const rect of geometry.targets) { expect(rect.height).toBeGreaterThanOrEqual(44); expect(rect.left).toBeGreaterThanOrEqual(0); expect(rect.right).toBeLessThanOrEqual(width); }
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
}
