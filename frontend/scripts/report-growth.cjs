#!/usr/bin/env node
// Offline reporting only. Connected analytics are read separately; no credentials or API writes.
const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("node:util");

const eventNames = ["page_view", "article_to_quiz_click", "quiz_start", "daily_start", "daily_resume", "qualified_play", "login_success", "comparison_start", "comparison_choice", "comparison_first_choice"];
const queries = {
  context: { connector: "googleanalytics4", period: "context", fields: ["hostname", "session_default_channel_group", "session_source_medium", "sessions"] },
  historicalOrganicLandings: { connector: "googleanalytics4", period: "context", fields: ["hostname", "landing_page", "session_source_medium", "session_default_channel_group", "sessions"], filters: [["session_default_channel_group", "eq", "Organic Search"]] },
  landings: { connector: "googleanalytics4", period: "measurement", fields: ["date", "hostname", "landing_page", "session_source_medium", "session_default_channel_group", "sessions"] },
  events: { connector: "googleanalytics4", period: "measurement", fields: ["date", "hostname", "session_source_medium", "landing_page", "page_path", "event_name", "customevent_analytics_version", "customevent_article_slug", "customevent_game_mode", "event_count"], filters: [["event_name", "in", JSON.stringify(eventNames)]] },
  search: { connector: "searchconsole", period: "search", fields: ["page", "clicks", "impressions", "ctr", "position"], options: { include_fresh_data: false } },
};
const publicHosts = new Set(["hard-quiz.com", "www.hard-quiz.com"]);
const clean = value => String(value ?? "").trim();
const cell = value => clean(value).replace(/[\r\n\t]/g, " ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "\\|").replace(/`/g, "\\`");
function date(value) {
  const raw = clean(value), iso = /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6)}` : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || new Date(iso).toISOString().slice(0, 10) !== iso) throw Error("Invalid report date");
  return iso;
}
function number(row, key) {
  const value = row[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw Error(`Invalid ${key}; missing/error data must not become zero`);
  return value;
}
function sourceBucket(row, authHosts) {
  if (!publicHosts.has(clean(row.hostname).toLowerCase())) return "preview_or_unknown_host";
  const parts = clean(row.session_source_medium).toLowerCase().split(/\s+\/\s+/);
  if (parts[0] === "qa" || parts[1] === "internal") return "qa";
  if (authHosts.includes(parts[0])) return "authentication";
  if (!parts[0] || parts[0].startsWith("(") || !parts[1] || parts[1].startsWith("(")) return "direct_or_unknown";
  return "external";
}
function slugAt(value) {
  return clean(value).match(/^\/blog\/([a-z0-9-]+)\/?(?:[?#].*)?$/)?.[1] || null;
}
function metrics() { return { sessions: 0, views: 0, clicks: 0, starts: 0, resumes: 0, qualified: 0, comparisons: 0, preferences: 0 }; }
function addEvent(target, name, count) {
  if (name === "page_view") target.views += count;
  if (name === "article_to_quiz_click") target.clicks += count;
  if (["quiz_start", "daily_start", "comparison_start"].includes(name)) target.starts += count;
  if (name === "daily_resume") target.resumes += count;
  if (name === "qualified_play") target.qualified += count;
  if (name === "comparison_first_choice") target.comparisons += count;
  if (name === "comparison_choice") target.preferences += count;
}
function summarize(bundle) {
  if (bundle.schemaVersion !== 1 || !/^\d+$/.test(bundle.propertyId || "") || !Number.isFinite(Date.parse(bundle.retrievedAt))) throw Error("Missing report provenance");
  if (typeof bundle.propertyTimezone !== "string" || !bundle.propertyTimezone) throw Error("Property timezone is required");
  new Intl.DateTimeFormat("en", { timeZone: bundle.propertyTimezone }).format();
  const authHosts = ["accounts.google.com", ...(bundle.authenticationHosts || [])].map(host => clean(host).toLowerCase());
  const sources = bundle.sources || {};
  for (const [name, query] of Object.entries(queries)) {
    const source = sources[name];
    if (!source || source.status !== "done" || !Array.isArray(source.data)) throw Error(`${name}: a completed source is required; pending/errors are not zero traffic`);
    source.from = date(source.from); source.to = date(source.to);
    if (source.from > source.to || source.data.length > 100000) throw Error(`Invalid ${name} window or size`);
    for (const row of source.data) {
      for (const field of query.fields) if (!(field in row)) throw Error(`${name}: missing ${field}`);
      if (row.date && (date(row.date) < source.from || date(row.date) > source.to)) throw Error(`${name}: row outside its window`);
    }
  }
  for (const [left, right] of [["events", "landings"], ["context", "historicalOrganicLandings"]]) {
    if (sources[left].from !== sources[right].from || sources[left].to !== sources[right].to) throw Error(`${left}/${right} periods differ; do not invent a joined funnel`);
  }
  if (!Array.isArray(bundle.articles)) throw Error("Article catalog is required");
  const catalog = new Map();
  for (const item of bundle.articles) {
    if (!/^[a-z0-9-]+$/.test(item.slug) || catalog.has(item.slug)) throw Error("Invalid or duplicate article slug");
    catalog.set(item.slug, { slug: item.slug, publishedOn: date(item.publishedOn), ...metrics(), organic: 0, direct: 0, other: 0 });
  }
  const context = { external: 0, direct_or_unknown: 0, qa: 0, authentication: 0, preview_or_unknown_host: 0 };
  for (const row of sources.context.data) context[sourceBucket(row, authHosts)] += number(row, "sessions");
  const cohort = new Map(), excluded = { sessions: 0, events: 0, legacyEvents: 0 }, unknown = metrics();
  const getCohort = row => {
    const key = clean(row.session_source_medium), bucket = sourceBucket(row, authHosts);
    if (!cohort.has(key)) cohort.set(key, { source: key, bucket, ...metrics() });
    return cohort.get(key);
  };
  const eligible = row => ["external", "direct_or_unknown"].includes(sourceBucket(row, authHosts));
  for (const row of sources.landings.data) {
    const count = number(row, "sessions");
    if (!eligible(row)) { excluded.sessions += count; continue; }
    getCohort(row).sessions += count;
    const article = catalog.get(slugAt(row.landing_page));
    if (article) {
      article.sessions += count;
      if (row.session_default_channel_group === "Organic Search") article.organic += count;
      else if (sourceBucket(row, authHosts) === "direct_or_unknown") article.direct += count;
      else article.other += count;
    }
  }
  for (const row of sources.events.data) {
    const count = number(row, "event_count");
    if (!eligible(row)) { excluded.events += count; continue; }
    if (clean(row.customevent_analytics_version) !== "2") { excluded.legacyEvents += count; continue; }
    addEvent(getCohort(row), row.event_name, count);
    // A landing page never substitutes for the explicit CTA association.
    const slug = row.event_name === "page_view" ? slugAt(row.page_path) : clean(row.customevent_article_slug);
    const article = catalog.get(slug);
    if (article) addEvent(article, row.event_name, count);
    else if (row.event_name !== "page_view") addEvent(unknown, row.event_name, count);
  }
  const historicalArticles = [];
  for (const row of sources.historicalOrganicLandings.data) if (eligible(row) && slugAt(row.landing_page)) historicalArticles.push({ slug: slugAt(row.landing_page), source: row.session_source_medium, sessions: number(row, "sessions") });
  const search = new Map();
  for (const row of sources.search.data) {
    const clicks = number(row, "clicks"), impressions = number(row, "impressions"), position = number(row, "position");
    if (!search.has(row.page)) search.set(row.page, { page: row.page, clicks: 0, impressions: 0, weighted: 0 });
    const entry = search.get(row.page); entry.clicks += clicks; entry.impressions += impressions; entry.weighted += position * impressions;
  }
  return { context, cohort: [...cohort.values()], articles: [...catalog.values()], unknown, historicalArticles, excluded,
    search: [...search.values()].map(row => ({ page: row.page, clicks: row.clicks, impressions: row.impressions, ctr: row.impressions ? row.clicks / row.impressions : null, position: row.impressions ? row.weighted / row.impressions : null })) };
}
function render(bundle, result = summarize(bundle)) {
  const lines = [], write = (...rows) => lines.push(...rows), window = name => `${bundle.sources[name].from} — ${bundle.sources[name].to}`;
  const table = (headers, rows) => write("", `| ${headers.map(cell).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map(row => `| ${row.map(cell).join(" | ")} |`), "");
  write("# Hard Quiz — аналитика реального роста", "", `Запрошено: ${bundle.retrievedAt}. GA4: ${bundle.propertyId}; часовой пояс: ${bundle.propertyTimezone}.`, "",
    "Это наблюдения аналитики, а не число подтверждённых людей. Пустой завершённый ответ означает отсутствие строк; ошибка или незавершённый ответ останавливают подготовку отчёта.", "",
    `## Исторический контекст GA4: ${window("context")}`);
  table(["Категория", "Сессии"], [["Известный внешний источник на production", result.context.external], ["Direct / неизвестный источник на production", result.context.direct_or_unknown], ["Исключено: QA / internal", result.context.qa], ["Исключено: источник авторизации", result.context.authentication], ["Исключено: preview / неизвестный hostname", result.context.preview_or_unknown_host]]);
  write("Исторические гостевые посещения владельца нельзя надёжно исключить задним числом. Direct показан отдельно и не объявлен ни новой аудиторией, ни тестовым трафиком.");
  table(["Статья: исторический вход из поиска", "Источник", "Сессии"], result.historicalArticles.length ? result.historicalArticles.map(row => [row.slug, row.source, row.sessions]) : [["Нет зарегистрированных входов в статьи", "—", 0]]);
  write(`## Измеряемое окно v2: ${window("events")}`, "", "Сессии, события и попытки — разные единицы. Новые старты: quiz_start + daily_start + comparison_start; Daily Continue не добавляется к новым стартам. Проценты конверсии из этих агрегатов не рассчитываются.");
  table(["Источник", "Сессии", "Новые старты", "Qualified play", "Daily Continue", "This or That: первое предпочтение"], result.cohort.map(row => [row.source, row.sessions, row.starts, row.qualified, row.resumes, row.comparisons]));
  write("Qualified play сохраняет критерии Classic/Time Attack и Daily. This or That учитывает подтверждённые предпочтения отдельно; до внедрения этих событий отсутствие строк не доказывает отсутствие участия.", "",
    "## Статья → игра в том же измеряемом окне", "", "Просмотры статьи определяются по page_path. Начало/участие связывается со статьёй только через сохранённый article_slug CTA; landing_page не подставляется вместо него. Сессия могла содержать несколько просмотров, кликов и попыток.");
  table(["Статья", "Вход из поиска", "Direct / неизвестный вход", "Другие входы", "Просмотры v2", "CTA", "Старты", "Qualified play", "Первое предпочтение"], result.articles.map(row => row.publishedOn > bundle.sources.events.to ? [row.slug + " (ещё не опубликована в окне)", ...Array(8).fill("—")] : [row.slug, row.organic, row.direct, row.other, row.views, row.clicks, row.starts, row.qualified, row.comparisons]).concat([["Статья неизвестна", "—", "—", "—", "—", result.unknown.clicks, result.unknown.starts, result.unknown.qualified, result.unknown.comparisons]]));
  write(`Из измеряемого окна исключено: ${result.excluded.sessions} сессий и ${result.excluded.events} событий QA/auth/preview; отдельно исключено ${result.excluded.legacyEvents} событий без analytics_version=2.`, "",
    `## Search Console: ${window("search")}`, "", "Постраничные данные Google показаны отдельно от GA4. Клик поиска не приравнивается к сессии или игре. Для стандартных данных Search Console используется Pacific Time.");
  table(["URL", "Клики", "Показы", "CTR", "Позиция"], result.search.map(row => [row.page, row.clicks, row.impressions, row.ctr === null ? "—" : `${(row.ctr * 100).toFixed(2)}%`, row.position?.toFixed(2) || "—"]));
  write("## Границы вывода", "", "- Последние дни могут пересчитываться в течение 24–48 часов; дата запроса не является датой окончательной обработки.",
    "- 18 октября — день выпуска v2 и диагностики. Версия/источник не доказывают, что каждый отдельный посетитель является внешним человеком.",
    "- Блокировщики, отсутствие согласия, потеря соединения и новая вкладка/устройство могут разрывать цепочку. Число событий не заменяет серверную статистику и не доказывает причинность.",
    "- Отсутствующая статья остаётся неизвестной. Старые параметры и источники не исправляются задним числом.", "",
    "## Воспроизводимость", "", "Запросы и правила: frontend/scripts/report-growth.cjs и docs/seo/growth-analytics.md. Данные ниже — агрегаты; учётные данные и индивидуальные идентификаторы не требуются.", "",
    "<details><summary>Исходные агрегаты и периоды</summary>", "", "```json", JSON.stringify(bundle, null, 2), "```", "", "</details>", "");
  return lines.join("\n");
}
function main() {
  const { values } = parseArgs({ options: { queries: { type: "boolean" }, input: { type: "string" }, output: { type: "string" } } });
  if (values.queries) { console.log(JSON.stringify(queries, null, 2)); return; }
  if (!values.input || !values.output) throw Error("Use --queries, or --input <completed-source-bundle.json> --output <private-report.md>");
  const bundle = JSON.parse(fs.readFileSync(values.input, "utf8")), content = render(bundle);
  fs.mkdirSync(path.dirname(path.resolve(values.output)), { recursive: true }); fs.writeFileSync(values.output, content);
  console.log(`Growth report written: ${path.resolve(values.output)}`);
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { queries, summarize, render, sourceBucket };
