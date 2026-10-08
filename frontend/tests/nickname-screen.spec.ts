import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { dailyFixture } from "./daily-fixtures";

async function fixture(page: Page, signedIn = true) {
  const daily = await dailyFixture(page, signedIn);
  const data = {
    profile: { nickname: null, avatar_url: "https://fixture.test/avatar" } as { nickname: string | null; avatar_url: string | null } | null,
    failProfile: false, failAvailability: false, taken: new Set<string>(), heads: [] as string[],
    writes: [] as { method: string; body: Record<string, unknown>; url: string }[],
  };
  await page.route("**/rest/v1/profiles?**", route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === "HEAD") {
      const name = (url.searchParams.get("nickname") ?? "").slice(6).replace(/\\(.)/g, "$1");
      data.heads.push(name);
      return route.fulfill({ status: data.failAvailability ? 503 : 200, headers: { "content-range": `0-0/${data.taken.has(name.toLowerCase()) ? 1 : 0}`, "access-control-expose-headers": "content-range" }, body: "" });
    }
    if (request.method() !== "GET") {
      const body = request.postDataJSON();
      data.writes.push({ method: request.method(), body, url: request.url() });
      data.profile = { nickname: body.nickname, avatar_url: data.profile?.avatar_url ?? null };
    }
    return route.fulfill({ status: data.failProfile ? 503 : 200, contentType: "application/json", body: JSON.stringify(data.failProfile ? { message: "fixture read failure" } : data.profile) });
  });
  return { data, daily };
}
const field = (page: Page) => page.getByRole("textbox", { name: "Nickname", exact: true });
const save = (page: Page) => page.getByRole("button", { name: "Save and continue", exact: true });
async function openSetup(page: Page, destination = "/daily") {
  await page.goto(`/setup-profile?redirect=${encodeURIComponent(destination)}`);
  await expect(field(page)).toBeVisible();
}
async function reopen(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Choose nickname", exact: true }).click();
  await expect(field(page)).toBeVisible();
}

test("one shared form explains the public fixed name and the passive next step", async ({ page }) => {
  const { data, daily } = await fixture(page);
  await openSetup(page);
  await expect(field(page)).toBeFocused();
  await expect(page.getByText("Your nickname is public in leaderboards and cannot be changed later.")).toBeVisible();
  await expect(page.locator(".hq-nickname-next")).toContainText("Daily Challenge. Start Daily when you’re ready.");
  await expect(save(page)).toBeDisabled();
  expect(data.writes).toEqual([]);
  expect(daily.calls.some(call => ["start_daily_session", "submit_daily_result"].includes(call.name))).toBe(false);
});

for (const value of ["", "ab", "   ", "abcdefghijklmnopqrstu"]) test(`invalid length is explained without a write: ${JSON.stringify(value)}`, async ({ page }) => {
  const { data } = await fixture(page); await openSetup(page);
  await field(page).fill(value); await field(page).blur();
  await expect(page.getByRole("alert")).toContainText(value.trim().length > 20 ? "no more than 20" : "at least 3");
  await expect(field(page)).toHaveAttribute("aria-invalid", "true");
  await expect(save(page)).toBeDisabled();
  expect(data.writes).toEqual([]);
  expect(data.heads).toEqual([]);
});

for (const value of ["  Film Fan  ", "Кино_Фан", "Film%Fan", "abcdefghijklmnopqrst"]) test(`valid names preserve their spelling and show the exact trimmed preview: ${value}`, async ({ page }) => {
  const { data } = await fixture(page); await openSetup(page, "/leaderboard?category=2&difficulty=3");
  await field(page).fill(value);
  await expect(page.locator(".hq-nickname-preview strong")).toHaveText(value.trim());
  await expect(page.locator(".hq-nickname-availability")).toContainText("Looks available");
  await save(page).click();
  await expect(page).toHaveURL(/\/leaderboard\?category=2&difficulty=3$/);
  await expect(page.locator(".hq-account-name")).toHaveText(value.trim());
  await expect(page.locator(".hq-nickname-notice")).toContainText(value.trim());
  expect(data.writes).toHaveLength(1);
  expect(data.writes[0].body).toEqual({ nickname: value.trim() });
  expect(new URL(data.writes[0].url).searchParams.get("nickname")).toBe("is.null");
});

test("availability is debounced, literal, case insensitive and rechecked on save", async ({ page }) => {
  const { data } = await fixture(page); await openSetup(page);
  await field(page).fill("Film_Fan");
  await expect(page.locator(".hq-nickname-availability")).toContainText("Looks available");
  expect(data.heads).toEqual(["Film_Fan"]);
  data.taken.add("film_fan");
  await save(page).click();
  await expect(page.getByRole("alert")).toContainText("This nickname is taken");
  await expect(field(page)).toBeFocused();
  await expect(save(page)).toBeDisabled();
  expect(data.writes).toEqual([]);
  await field(page).fill("FreeFan");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(save(page)).toBeEnabled();
});

test("late availability for an old input cannot replace the current name’s status", async ({ page }) => {
  await fixture(page); await openSetup(page);
  let release = () => {}, waiting = false;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/profiles?**", async route => {
    if (route.request().method() === "HEAD" && new URL(route.request().url()).searchParams.get("nickname") === "ilike.OldFan") {
      waiting = true; await held;
      return route.fulfill({ headers: { "content-range": "0-0/1", "access-control-expose-headers": "content-range" }, body: "" }).catch(() => {});
    }
    return route.fallback();
  });
  await field(page).fill("OldFan"); await expect.poll(() => waiting).toBe(true);
  await field(page).fill("NewFan");
  await expect(page.locator(".hq-nickname-availability")).toContainText("Looks available");
  release();
  await expect(page.locator(".hq-nickname-availability")).not.toContainText("taken");
  await expect(save(page)).toBeEnabled();
});

test("availability failures are retryable and never mean available", async ({ page }) => {
  const { data } = await fixture(page); data.failAvailability = true; await openSetup(page);
  await field(page).fill("FilmFan");
  await expect(page.locator(".hq-nickname-availability")).toContainText("Availability could not be checked");
  await expect(page.locator(".hq-nickname-availability")).not.toContainText("Looks available");
  data.failAvailability = false;
  await page.getByRole("button", { name: "Retry check" }).click();
  await expect(page.locator(".hq-nickname-availability")).toContainText("Looks available");
  expect(data.writes).toEqual([]);
});

test("a hanging availability check times out and can recover with Retry check", async ({ page }) => {
  await page.clock.install(); const { data } = await fixture(page);
  let release = () => {}, checking = false, hang = true;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/profiles?**", async route => {
    if (route.request().method() !== "HEAD" || !hang) return route.fallback();
    checking = true; await held;
    await route.fulfill({ headers: { "content-range": "0-0/1", "access-control-expose-headers": "content-range" }, body: "" }).catch(() => {});
  });
  await openSetup(page); await field(page).fill("NetworkFan"); await page.clock.runFor(500);
  await expect.poll(() => checking).toBe(true); await page.clock.runFor(10_100);
  await expect(page.getByRole("button", { name: "Retry check" })).toBeVisible();
  hang = false; await page.getByRole("button", { name: "Retry check" }).click(); await page.clock.runFor(500);
  await expect(page.locator(".hq-nickname-availability")).toContainText("Looks available");
  release(); await page.clock.runFor(100);
  await expect(save(page)).toBeEnabled(); expect(data.writes).toEqual([]);
});

test("closing, reopening and reloading preserve only the current account’s draft", async ({ page }) => {
  await fixture(page); await page.goto("/");
  await field(page).fill("DraftFilmFan");
  await page.getByRole("button", { name: "Choose later" }).click();
  await reopen(page); await expect(field(page)).toHaveValue("DraftFilmFan");
  await page.getByRole("button", { name: "Choose later" }).click();
  await page.reload(); await expect(page.getByRole("dialog")).toHaveCount(0);
  await reopen(page); await expect(field(page)).toHaveValue("DraftFilmFan");
  await page.goto("/setup-profile"); await expect(field(page)).toHaveValue("DraftFilmFan");
  await save(page).click();
  await expect(page.locator(".hq-account-name")).toHaveText("DraftFilmFan");
  expect(await page.evaluate(() => sessionStorage.getItem("hq_nickname_draft_v1:fixture-user"))).toBeNull();
});

test("the legacy unowned draft and another account’s draft never prefill this account", async ({ page }) => {
  await fixture(page);
  await page.addInitScript(() => {
    localStorage.setItem("pre_nickname", "SomeoneElse");
    sessionStorage.setItem("hq_nickname_draft_v1:second-user", "SecondPlayer");
  });
  await openSetup(page); await expect(field(page)).toHaveValue("");
});

test("Choose later is respected across routes; Daily can explicitly reopen the form", async ({ page }) => {
  const { daily } = await fixture(page); await page.goto("/");
  await page.getByRole("button", { name: "Choose later" }).click();
  await page.getByRole("link", { name: "Daily", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Choose a nickname to play" }).click();
  await field(page).fill("DailyFilmFan"); await save(page).click();
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeEnabled();
  expect(daily.calls.filter(call => call.name === "start_daily_session")).toHaveLength(0);
  await expect(page.getByRole("menuitem", { name: "Choose nickname" })).toHaveCount(0);
});

test("reading the blog and game guide does not trigger an unsolicited nickname window", async ({ page }) => {
  await fixture(page); await page.goto("/blog");
  await expect(page.locator(".hq-account-name")).toHaveText("My account");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "How to play", exact: false }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await reopen(page);
});

test("storage denial does not block saving or the in-memory draft", async ({ page }) => {
  await fixture(page);
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
    Storage.prototype.getItem = function(key) { if (key.startsWith("hq_nickname_")) throw new DOMException("Denied", "SecurityError"); return get.call(this, key); };
    Storage.prototype.setItem = function(key, value) { if (key.startsWith("hq_nickname_")) throw new DOMException("Denied", "SecurityError"); return set.call(this, key, value); };
    Storage.prototype.removeItem = function(key) { if (key.startsWith("hq_nickname_") || key === "pre_nickname") throw new DOMException("Denied", "SecurityError"); return remove.call(this, key); };
  });
  await page.goto("/"); await field(page).fill("MemoryFilmFan");
  await page.getByRole("button", { name: "Choose later" }).click();
  await reopen(page); await expect(field(page)).toHaveValue("MemoryFilmFan");
  await save(page).click(); await expect(page.locator(".hq-account-name")).toHaveText("MemoryFilmFan");
});

test("an existing nickname skips setup without a write", async ({ page }) => {
  const { data } = await fixture(page); data.profile!.nickname = "ExistingFan";
  await page.goto("/setup-profile?redirect=%2Fleaderboard%3Fcategory%3D2%26difficulty%3D3");
  await expect(page).toHaveURL(/\/leaderboard\?category=2&difficulty=3$/);
  await expect(field(page)).toHaveCount(0);
  expect(data.writes).toEqual([]);
});

test("concurrent first choice explains the actual nickname instead of overwriting it", async ({ page }) => {
  const { data } = await fixture(page); await openSetup(page);
  await field(page).fill("SecondChoice"); data.profile!.nickname = "FirstChoice";
  await save(page).click();
  await expect(page.locator(".hq-account-name")).toHaveText("FirstChoice");
  await expect(page.locator(".hq-nickname-notice")).toContainText("This account already has the nickname FirstChoice");
  expect(data.writes).toEqual([]);
});

test("profile errors remain errors and can recover without creating a name", async ({ page }) => {
  const { data } = await fixture(page); data.failProfile = true;
  await page.goto("/setup-profile?redirect=%2Fdaily");
  await expect(page.getByRole("alert")).toContainText("Your account could not be checked");
  await expect(field(page)).toHaveCount(0);
  data.failProfile = false; await page.getByRole("button", { name: "Retry profile" }).click();
  await expect(field(page)).toBeVisible(); expect(data.writes).toEqual([]);
});

test("a failed profile recheck before save never writes and keeps the draft", async ({ page }) => {
  const { data } = await fixture(page); await openSetup(page);
  await field(page).fill("RetryFilmFan"); data.failProfile = true;
  await save(page).click();
  await expect(page.getByRole("alert")).toContainText("Your profile could not be checked");
  await expect(field(page)).toHaveValue("RetryFilmFan"); expect(data.writes).toEqual([]);
  data.failProfile = false; await save(page).click();
  await expect(page.locator(".hq-account-name")).toHaveText("RetryFilmFan");
});

test("double submit and dismissal cannot interrupt an in-flight selection", async ({ page }) => {
  const { data } = await fixture(page);
  let release = () => {}, writes = 0;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/profiles?**", async route => {
    if (route.request().method() !== "PATCH") return route.fallback();
    writes++; await held;
    data.profile!.nickname = route.request().postDataJSON().nickname;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data.profile) });
  });
  await page.goto("/"); await field(page).fill("BusyFilmFan"); await save(page).click();
  await expect.poll(() => writes).toBe(1);
  await expect(field(page)).toBeDisabled();
  await expect(page.getByRole("button", { name: "Choose later" })).toBeDisabled();
  await page.locator(".hq-nickname-form").evaluate(el => (el as HTMLFormElement).requestSubmit());
  await page.keyboard.press("Escape"); await page.mouse.click(5, 5);
  await expect(page.getByRole("dialog")).toBeVisible(); expect(writes).toBe(1);
  release(); await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".hq-account-name")).toHaveText("BusyFilmFan");
});

test("a lost write response is reconciled with a read and is not written twice", async ({ page }) => {
  const { data } = await fixture(page); let writes = 0;
  await page.route("**/rest/v1/profiles?**", route => {
    if (route.request().method() !== "PATCH") return route.fallback();
    writes++; data.profile!.nickname = route.request().postDataJSON().nickname;
    return route.abort();
  });
  await openSetup(page); await field(page).fill("ConfirmedFan"); await save(page).click();
  await expect(page.locator(".hq-account-name")).toHaveText("ConfirmedFan");
  await expect(page.locator(".hq-nickname-notice")).toContainText("Your nickname is saved");
  expect(writes).toBe(1);
});

test("a write timeout reads back the saved nickname and ignores its late response", async ({ page }) => {
  await page.clock.install(); const { data } = await fixture(page);
  let release = () => {}, writes = 0;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/profiles?**", async route => {
    if (route.request().method() !== "PATCH") return route.fallback();
    writes++; data.profile!.nickname = route.request().postDataJSON().nickname;
    await held; await route.fulfill({ contentType: "application/json", body: JSON.stringify(data.profile) }).catch(() => {});
  });
  await openSetup(page); await field(page).fill("TimeoutFilmFan"); await save(page).click();
  await expect.poll(() => writes).toBe(1); await page.clock.runFor(10_100);
  await expect(page.locator(".hq-account-name")).toHaveText("TimeoutFilmFan");
  release(); await page.clock.runFor(100);
  await expect(page.getByRole("dialog")).toHaveCount(0); expect(writes).toBe(1);
});

test("an uncertain write exposes a read-only confirmation action before another save", async ({ page }) => {
  const { data } = await fixture(page); let writes = 0;
  await page.route("**/rest/v1/profiles?**", route => {
    if (route.request().method() !== "PATCH") return route.fallback();
    writes++; data.failProfile = true;
    return route.abort();
  });
  await openSetup(page); await field(page).fill("UncertainFan"); await save(page).click();
  await expect(page.getByRole("alert")).toContainText("couldn’t confirm whether your nickname was saved");
  await expect(save(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Check saved nickname", exact: true }).click();
  await expect(page.getByRole("button", { name: "Check saved nickname", exact: true })).toBeEnabled(); expect(writes).toBe(1);
  data.failProfile = false; data.profile!.nickname = "UncertainFan";
  await page.getByRole("button", { name: "Check saved nickname", exact: true }).click();
  await expect(page.locator(".hq-account-name")).toHaveText("UncertainFan"); expect(writes).toBe(1);
});

test("a hanging post-write confirmation ends in a retryable read-only state", async ({ page }) => {
  await page.clock.install(); const { data } = await fixture(page);
  let written = false, reading = false, release = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/profiles?**", async route => {
    const method = route.request().method();
    if (method === "PATCH") { written = true; return route.abort(); }
    if (method === "GET" && written) {
      reading = true; await held;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(data.profile) }).catch(() => {});
    }
    return route.fallback();
  });
  await openSetup(page); await field(page).fill("ConfirmLaterFan"); await save(page).click();
  await expect.poll(() => reading).toBe(true); await page.clock.runFor(10_100);
  await expect(page.getByRole("button", { name: "Check saved nickname", exact: true })).toBeEnabled();
  await expect(field(page)).toBeEnabled();
  release(); await page.clock.runFor(100);
  await expect(page.locator(".hq-nickname-notice")).toHaveCount(0);
});

test("a rejected write keeps the draft and can retry after checking the profile", async ({ page }) => {
  const { data } = await fixture(page); let fail = true;
  await page.route("**/rest/v1/profiles?**", route => route.request().method() === "PATCH" && fail
    ? route.fulfill({ status: 403, contentType: "application/json", body: '{"code":"42501","message":"fixture denied"}' }) : route.fallback());
  await openSetup(page); await field(page).fill("RetryWriteFan"); await save(page).click();
  await expect(page.getByRole("alert")).toContainText("Your nickname could not be confirmed");
  await expect(field(page)).toHaveValue("RetryWriteFan");
  fail = false; await save(page).click();
  await expect(page.locator(".hq-account-name")).toHaveText("RetryWriteFan"); expect(data.writes).toHaveLength(1);
});

test("a database uniqueness conflict is a taken name, even after a successful preview check", async ({ page }) => {
  await fixture(page);
  await page.route("**/rest/v1/profiles?**", route => route.request().method() === "PATCH"
    ? route.fulfill({ status: 409, contentType: "application/json", body: '{"code":"23505","message":"fixture unique conflict"}' }) : route.fallback());
  await openSetup(page); await field(page).fill("RaceFilmFan");
  await expect(page.locator(".hq-nickname-availability")).toContainText("Looks available");
  await save(page).click(); await expect(page.getByRole("alert")).toContainText("This nickname is taken");
  await expect(field(page)).toHaveValue("RaceFilmFan"); await expect(save(page)).toBeDisabled();
});

test("signing out during a held pre-save read prevents a late nickname write", async ({ page }) => {
  const { data } = await fixture(page); await openSetup(page);
  await field(page).fill("OldAccountFan");
  let release = () => {}, reading = false;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/profiles?**", async route => {
    if (route.request().method() !== "GET") return route.fallback();
    reading = true; await held;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data.profile) }).catch(() => {});
  });
  await save(page).click(); await expect.poll(() => reading).toBe(true);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("link", { name: "Log in to choose a nickname" })).toBeVisible();
  release(); await expect(field(page)).toHaveCount(0); expect(data.writes).toEqual([]);
});

test("switching accounts isolates drafts and ignores a late write confirmation", async ({ page }) => {
  await fixture(page); await openSetup(page); await field(page).fill("FirstAccountDraft");
  let release = () => {}, writing = false;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/profiles?**", async route => {
    if (route.request().method() !== "PATCH") return route.fallback();
    writing = true; await held;
    await route.fulfill({ contentType: "application/json", body: '{"nickname":"FirstAccountDraft","avatar_url":null}' }).catch(() => {});
  });
  await save(page).click(); await expect.poll(() => writing).toBe(true);
  await page.evaluate(() => {
    const key = "sb-quiz-fixture-auth-token", session = JSON.parse(localStorage.getItem(key)!);
    session.user = { ...session.user, id: "second-user", email: "second@example.test" };
    localStorage.setItem(key, JSON.stringify(session));
    const channel = new BroadcastChannel(key); channel.postMessage({ event: "SIGNED_IN", session }); channel.close();
  });
  await expect(field(page)).toBeEnabled(); await expect(field(page)).toHaveValue("");
  release(); await expect(page.locator(".hq-nickname-notice")).toHaveCount(0);
  await field(page).fill("SecondAccountDraft");
  expect(await page.evaluate(() => sessionStorage.getItem("hq_nickname_draft_v1:fixture-user"))).toBe("FirstAccountDraft");
  expect(await page.evaluate(() => sessionStorage.getItem("hq_nickname_draft_v1:second-user"))).toBe("SecondAccountDraft");
});

test("a session timeout is retryable on setup and is not treated as a guest", async ({ page }) => {
  await page.clock.install(); await fixture(page, false);
  await page.route("**/src/supabase.ts", async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\nconst realRead = supabase.auth.getSession.bind(supabase.auth); window.fixtureReadStalls = true; supabase.auth.getSession = () => window.fixtureReadStalls ? new Promise(() => {}) : realRead();' });
  });
  await page.goto("/setup-profile?redirect=%2Fdaily");
  await expect(page.getByText("Checking your sign-in status…", { exact: true })).toBeVisible();
  await page.clock.runFor(10_100);
  await expect(page.getByRole("alert")).toContainText("Your sign-in status could not be checked");
  await expect(page.getByRole("link", { name: "Log in to choose a nickname" })).toHaveCount(0);
  await page.evaluate(() => Object.assign(window, { fixtureReadStalls: false }));
  await page.getByRole("button", { name: "Retry sign-in check" }).click();
  await expect(page.getByRole("link", { name: "Log in to choose a nickname" })).toBeVisible();
});

test("a guest gets an explanation and a login path which survives reload", async ({ page }) => {
  const { data } = await fixture(page, false);
  await page.goto("/setup-profile?redirect=%2Fdaily");
  await expect(page.getByText("Sign in first, then choose your public player name.")).toBeVisible();
  await expect(field(page)).toHaveCount(0);
  await page.reload();
  await page.getByRole("link", { name: "Log in to choose a nickname" }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdaily%3Fchoose_nickname%3D1$/);
  expect(data.writes).toEqual([]);
});

for (const destination of ["/blog", "/how-to-play"]) test(`an explicit guest setup intent survives login and returns to ${destination}`, async ({ page }) => {
  const { data } = await fixture(page, false);
  await page.goto(`/setup-profile?redirect=${encodeURIComponent(destination)}`);
  await page.getByRole("link", { name: "Log in to choose a nickname" }).click();
  await page.reload();
  await page.route("**/auth/v1/user", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: "fixture-user", aud: "authenticated", role: "authenticated", email: "fixture@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" }) }));
  await page.evaluate(async () => {
    const { supabase } = await import(new URL("/src/supabase.ts", location.origin).href);
    const payload = btoa(JSON.stringify({ sub: "fixture-user", role: "authenticated", exp: 4102444800 })).replace(/=/g, "");
    await supabase.auth.setSession({ access_token: `e30.${payload}.fixture`, refresh_token: "fixture-refresh-token" });
  });
  await expect(page).toHaveURL(`http://localhost:5173${destination}`);
  await expect(page.getByRole("dialog")).toBeVisible();
  await field(page).fill("OnboardingFan"); await save(page).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(`http://localhost:5173${destination}`);
  expect(data.writes).toHaveLength(1);
  const events = await page.evaluate(() => window.dataLayer.map(entry => Array.from(entry as IArguments)));
  expect(JSON.stringify(events.filter(args => args[0] === "event" && args[1] === "page_view"))).not.toContain("choose_nickname");
});

test("the callback carries setup intent into a new tab without an earlier draft or prompt record", async ({ page, context }) => {
  await fixture(page, false);
  await page.goto("/setup-profile?redirect=%2Fblog");
  await page.getByRole("link", { name: "Log in to choose a nickname" }).click();
  const next = await context.newPage();
  await fixture(next);
  await next.goto("/blog?choose_nickname=1");
  await expect(next).toHaveURL("http://localhost:5173/blog");
  await expect(field(next)).toBeVisible();
  await expect(field(next)).toHaveValue("");
});

for (const destination of ["https://evil.test", "//evil.test", "/play", "/login", "/setup-profile", "/unknown"]) test(`setup normalizes unsafe returns: ${destination}`, async ({ page }) => {
  const { daily } = await fixture(page); await openSetup(page, destination);
  await expect(page).toHaveURL(/\/setup-profile$/);
  await page.getByRole("button", { name: "Choose later" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(daily.calls.some(call => call.name === "start_daily_session")).toBe(false);
});

test("Choose later consumes an internal setup flag instead of reopening the dialog", async ({ page }) => {
  await fixture(page); await openSetup(page, "/blog?choose_nickname=1");
  await page.getByRole("button", { name: "Choose later" }).click();
  await expect(page).toHaveURL("http://localhost:5173/blog");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("keyboard focus, error descriptions, escape and focus restoration work in the dialog", async ({ page }) => {
  await fixture(page); await page.goto("/blog"); await reopen(page);
  await expect(field(page)).toBeFocused(); await field(page).fill("KeyboardFan");
  await expect(page.locator(".hq-nickname-availability")).toContainText("Looks available");
  expect(await field(page).evaluate(el => el.getAttribute("aria-describedby")!.split(" ").filter(Boolean).every(id => !!document.getElementById(id)))).toBe(true);
  await page.keyboard.press("Tab"); await expect(save(page)).toBeFocused();
  await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "Choose later" })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(field(page)).toBeFocused();
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Account menu" })).toBeFocused();
});

for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [320, 568], [844, 390], [320, 290]]) {
  for (const modal of [false, true]) test(`${modal ? "dialog" : "page"} stays readable and scrollable at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await fixture(page);
    if (modal) { await page.goto("/"); await expect(field(page)).toBeVisible(); }
    else await openSetup(page);
    await field(page).fill("FrameHunter");
    await expect(page.locator(".hq-nickname-availability")).toContainText("Looks available");
    const card = page.locator(modal ? ".hq-login-dialog .hq-login-card" : ".hq-login-page .hq-login-card");
    await expect(card).toHaveCSS("background-color", "rgb(25, 26, 34)");
    await expect(save(page)).toHaveCSS("background-color", "rgb(114, 88, 239)");
    await expect(field(page)).toHaveCSS("font-size", "16px");
    const panel = await card.boundingBox(); expect(panel!.width).toBeLessThanOrEqual(440);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Choose later" }).scrollIntoViewIfNeeded();
    const later = await page.getByRole("button", { name: "Choose later" }).boundingBox();
    expect(later!.height).toBeGreaterThanOrEqual(44); expect(later!.y).toBeGreaterThanOrEqual(0); expect(later!.y + later!.height).toBeLessThanOrEqual(height);
    if (modal) {
      await page.locator(".hq-login-overlay").evaluate(el => { el.scrollTop = 0; });
      const title = await page.getByRole("heading", { name: "Choose your nickname", exact: true }).boundingBox();
      expect(title!.y).toBeGreaterThanOrEqual(0);
    }
    if (!modal && width === 1440 || modal && width === 390) await page.screenshot({ path: `../ui08-verification/nickname-${modal ? "mobile" : "desktop"}.png` });
  });
}

test("setup metadata is unique and excludes callback and return parameters", async ({ page }) => {
  await fixture(page); await openSetup(page);
  await expect(page).toHaveTitle("Choose your nickname | Hard Quiz");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://hard-quiz.com/setup-profile");
});
