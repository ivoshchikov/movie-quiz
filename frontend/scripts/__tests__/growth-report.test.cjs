const { test } = require("node:test");
const assert = require("node:assert/strict");
const { queries, summarize, render } = require("../report-growth.cjs");

const window = { from: "2026-10-18", to: "2026-10-20", status: "done" };
const session = (source, sessions, extras = {}) => ({ date: "2026-10-19", hostname: "hard-quiz.com", session_source_medium: source, session_default_channel_group: source.includes("organic") ? "Organic Search" : "Direct", landing_page: "/blog/sample-film", sessions, ...extras });
const event = (name, count, extras = {}) => ({ date: "2026-10-19", hostname: "hard-quiz.com", session_source_medium: "bing / organic", landing_page: "/blog/sample-film", page_path: "/play", event_name: name, customevent_analytics_version: "2", customevent_article_slug: "(not set)", customevent_game_mode: "normal", event_count: count, ...extras });
function fixture() {
  return { schemaVersion: 1, retrievedAt: "2026-10-22T13:00:00Z", propertyId: "123", propertyTimezone: "America/Los_Angeles", authenticationHosts: ["auth.example"], articles: [{ slug: "sample-film", publishedOn: "2026-10-18" }, { slug: "future-film", publishedOn: "2026-10-22" }], sources: {
    context: { ...window, data: [session("bing / organic", 4), session("(direct) / (none)", 6), session("qa / internal", 2), session("accounts.google.com / referral", 3), session("auth.example / referral", 1), session("bing / organic", 1, { hostname: "preview.vercel.app" })] },
    historicalOrganicLandings: { ...window, data: [session("bing / organic", 4), session("bing / organic", 1, { hostname: "preview.vercel.app" })] },
    landings: { ...window, data: [session("bing / organic", 4), session("(direct) / (none)", 6), session("qa / internal", 2)] },
    events: { ...window, data: [event("page_view", 7, { page_path: "/blog/sample-film" }), event("article_to_quiz_click", 2, { customevent_article_slug: "sample-film" }), event("quiz_start", 3), event("qualified_play", 2), event("daily_resume", 1), event("comparison_first_choice", 1, { customevent_game_mode: "this_or_that", customevent_article_slug: "sample-film" }), event("comparison_choice", 5, { customevent_game_mode: "this_or_that", customevent_article_slug: "sample-film" }), event("qualified_play", 9, { customevent_analytics_version: "1" }), event("qualified_play", 10, { session_source_medium: "qa / internal" }), event("quiz_start", 8, { hostname: "preview.vercel.app" })] },
    search: { ...window, data: [{ page: "https://hard-quiz.com/blog/sample-film", clicks: 1, impressions: 2, ctr: 0.5, position: 5 }, { page: "https://hard-quiz.com/blog/sample-film", clicks: 2, impressions: 8, ctr: 0.25, position: 15 }] },
  } };
}
test("separates external, direct, auth, QA and preview without inventing owner identity", () => {
  const result = summarize(fixture());
  assert.deepEqual(result.context, { external: 4, direct_or_unknown: 6, qa: 2, authentication: 4, preview_or_unknown_host: 1 });
  assert.equal(result.historicalArticles.length, 1);
  assert.equal(result.excluded.sessions, 2);
  assert.equal(result.excluded.events, 18);
  assert.equal(result.excluded.legacyEvents, 9);
});
test("does not infer article association from an article landing; resumes and comparisons stay distinct", () => {
  const result = summarize(fixture()), article = result.articles[0], cohort = result.cohort.find(row => row.source === "bing / organic");
  assert.equal(article.views, 7); assert.equal(article.organic, 4); assert.equal(article.direct, 6);
  assert.equal(article.clicks, 2); assert.equal(article.qualified, 0); assert.equal(article.starts, 0);
  assert.equal(result.unknown.starts, 3); assert.equal(result.unknown.qualified, 2);
  assert.equal(cohort.starts, 3); assert.equal(cohort.resumes, 1); assert.equal(cohort.comparisons, 1);
  assert.equal(article.preferences, 5); assert.equal(article.comparisons, 1);
});
test("weights GSC position by impressions and derives CTR from counts", () => {
  const row = summarize(fixture()).search[0];
  assert.equal(row.impressions, 10); assert.equal(row.clicks, 3); assert.equal(row.ctr, 0.3); assert.equal(row.position, 13);
});
test("missing, pending or failed sources cannot masquerade as zero traffic", () => {
  for (const state of [undefined, { ...window, status: "pending", data: [] }, { ...window, status: "error", data: [] }]) {
    const bundle = fixture(); bundle.sources.events = state;
    assert.throws(() => summarize(bundle), /completed source/);
  }
  const empty = fixture(); Object.values(empty.sources).forEach(source => { source.data = []; });
  assert.equal(summarize(empty).unknown.qualified, 0);
});
test("rejects mismatched periods, missing dimensions and invalid counts", () => {
  const period = fixture(); period.sources.events.from = "2026-10-17"; assert.throws(() => summarize(period), /periods differ/);
  const negative = fixture(); negative.sources.landings.data[0].sessions = -1; assert.throws(() => summarize(negative), /Invalid sessions/);
  const missing = fixture(); delete missing.sources.events.data[0].hostname; assert.throws(() => summarize(missing), /missing hostname/);
  const future = fixture(); future.sources.events.data[0].date = "2026-10-25"; assert.throws(() => summarize(future), /outside its window/);
  const timezone = fixture(); delete timezone.propertyTimezone; assert.throws(() => summarize(timezone), /timezone is required/);
});
test("renders future publications as unavailable in the window and escapes table markup", () => {
  const bundle = fixture(); bundle.sources.landings.data[0].session_source_medium = "source|<script> / referral";
  const text = render(bundle);
  assert.match(text, /future-film \(ещё не опубликована в окне\)/);
  assert.match(text, /source\\\|&lt;script&gt;/);
  assert.match(text, /Статья неизвестна/);
  assert.match(text, /Проценты конверсии.*не рассчитываются/);
});
test("query plan uses event counts and explicit source/hostname/version dimensions within GA4 limits", () => {
  assert.ok(queries.events.fields.includes("hostname"));
  assert.ok(queries.events.fields.includes("customevent_analytics_version"));
  assert.equal(queries.events.fields.filter(field => field !== "event_count").length, 9);
  assert.ok(queries.events.filters[0][2].includes("comparison_first_choice"));
});
