import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockQuizApi, mockSignedIn } from '../tests/fixtures';
import { gameFixture, gameAnswers } from '../tests/game-fixtures';
import { dailyFixture, dailyChoices } from '../tests/daily-fixtures';
import { attackFixture, attackAnswers } from '../tests/time-attack-fixture';
import { pickFixture } from '../tests/this-that-fixture';

// A context-level guard also protects secondary tabs. Page fixtures take priority;
// only read-only frontend documents/assets may reach the network underneath them.
const test = base.extend<{ blockedNetwork: string[] }>({
  blockedNetwork: [async ({ context, baseURL }, use) => {
    const blocked: string[] = [];
    const origin = new URL(baseURL!).origin;
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const ownRead = url.origin === origin && ['GET', 'HEAD'].includes(request.method())
        && !/^\/(?:api|rest|auth|functions)\//.test(url.pathname);
      const canonicalImage = url.origin === 'https://hard-quiz.com'
        && request.method() === 'GET' && url.pathname.startsWith('/blog-assets/');
      const publicStorageImage = url.origin === 'https://vgjfbcihppxbtrjcxoci.supabase.co'
        && request.method() === 'GET' && url.pathname.startsWith('/storage/v1/object/public/');
      if (ownRead || canonicalImage || publicStorageImage) return route.continue();
      blocked.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort('blockedbyclient');
    });
    await use(blocked);
    expect(blocked, 'Every API request must be handled by an in-memory fixture').toEqual([]);
  }, { auto: true }],
});

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (test.info().project.name === 'mobile') {
    const name = new URL(page.url()).pathname.replace(/[^a-z0-9]+/gi, '-') || 'home';
    const heading = (await page.locator('h1').allTextContents()).join('-').replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
    await page.screenshot({ path: test.info().outputPath(`screen${name}-${heading}.png`), fullPage: true });
  }
}

test('the guard stops an unmocked write before it reaches the network', async ({ page, blockedNetwork }) => {
  await page.route('**/network-guard-probe', route => route.fulfill({ contentType: 'text/html', body: '<h1>Isolated guard probe</h1>' }));
  await page.goto('/network-guard-probe');
  await page.evaluate(async () => {
    try { await fetch('https://quiz-fixture.supabase.co/rest/v1/rpc/quiz_start', { method: 'POST', body: '{}' }); }
    catch { /* Expected: the context guard aborts before network. */ }
  });
  expect(blockedNetwork).toEqual(['POST https://quiz-fixture.supabase.co/rest/v1/rpc/quiz_start']);
  blockedNetwork.length = 0;
});

test('home, four categories, rules and blog load, preserve canonicals and fit the screen', async ({ page }) => {
  const calls = await mockQuizApi(page);
  const paths = ['/', '/movie-quiz', '/actor-quiz', '/actress-quiz', '/tv-series-quiz', '/how-to-play', '/blog'];
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://hard-quiz.com${path}`);
    await noOverflow(page);
  }
  expect(calls.some(call => ['quiz_start', 'daily_begin', 'time_attack_start', 'this_that_start'].includes(call.name))).toBe(false);
});

test('article, reading navigation, reload, Back and Forward work on the compiled build', async ({ page }) => {
  await mockQuizApi(page);
  await page.goto('/blog');
  const article = page.locator('.hq-blog-card-link').first();
  const href = await article.getAttribute('href');
  expect(href).toBeTruthy();
  await article.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('article.hq-article')).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  await noOverflow(page);
  await page.reload();
  await expect(page.locator('article.hq-article')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/blog$/);
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('article.hq-article')).toBeVisible();
});

test('Classic answers once and reload closes the run with a server result without answer credits', async ({ page }) => {
  const data = await gameFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Movies', exact: true }).click();
  await expect(page.getByRole('button', { name: gameAnswers[0], exact: true })).toBeEnabled();
  await noOverflow(page);
  await page.getByRole('button', { name: gameAnswers[0], exact: true }).click();
  await expect(page.getByText('Correct! +1 point', { exact: true })).toBeVisible();
  expect(data.accepted).toBe(1);
  const starts = data.calls.filter(call => call.name === 'quiz_start').length;
  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  expect(data.calls.filter(call => call.name === 'quiz_start')).toHaveLength(starts);
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.locator('.hq-result-score strong')).toHaveText('1');
  await expect(page.getByText('Image credits', { exact: true })).toHaveCount(0);
  await expect(page.getByAltText(/^Credited image/)).toHaveCount(0);
  await noOverflow(page);
});

test('Classic timer expires using server rules', async ({ page }) => {
  const data = await gameFixture(page, { seconds: 5, lives: 1 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Movies', exact: true }).click();
  await expect(page.getByRole('button', { name: gameAnswers[0], exact: true })).toBeEnabled();
  await page.clock.runFor(6000);
  await expect(page.getByText('Time’s up. 1 life lost.')).toBeVisible();
  await page.clock.runFor(1900);
  await expect(page).toHaveURL(/\/result$/);
  expect(data.calls.some(call => call.name === 'quiz_answer' && call.payload.p_answer === null)).toBe(true);
  await expect(page.locator('.hq-result-score strong')).toHaveText('0');
});

test('Daily guest cannot reveal or start the question', async ({ page }) => {
  const data = await dailyFixture(page, false);
  await page.goto('/daily');
  await expect(page.getByRole('button', { name: 'Log in to play', exact: true })).toBeVisible();
  await expect(page.getByAltText('Daily image to identify')).toHaveCount(0);
  expect(data.starts.size).toBe(0);
  await noOverflow(page);
});

test('Daily signed-in fixture starts explicitly, retries a failed save and survives reload', async ({ page }) => {
  const data = await dailyFixture(page);
  await page.goto('/daily');
  await expect(page.getByRole('button', { name: 'Start Daily', exact: true })).toBeVisible();
  expect(data.starts.size).toBe(0);
  await page.getByRole('button', { name: 'Start Daily', exact: true }).click();
  await expect(page.getByRole('button', { name: dailyChoices[0], exact: true })).toBeEnabled();
  await noOverflow(page);
  data.failSubmit = true;
  await page.getByRole('button', { name: dailyChoices[0], exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry saving', exact: true })).toBeVisible();
  data.failSubmit = false;
  await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Correct!', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Correct!', exact: true })).toBeVisible();
  expect(data.starts.size).toBe(1);
  expect(data.results.size).toBe(1);
});

test('Time Attack answer, failed action retry, skip, resume and result preserve one run', async ({ page }) => {
  const data = await attackFixture(page);
  await page.goto('/time-attack');
  await page.getByRole('button', { name: 'Start Time Attack', exact: true }).click();
  await expect(page.getByRole('button', { name: attackAnswers[0], exact: true })).toBeEnabled();
  await noOverflow(page);
  data.failAction = true;
  await page.getByRole('button', { name: attackAnswers[0], exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry Time Attack', exact: true })).toBeVisible();
  data.failAction = false;
  await page.getByRole('button', { name: 'Retry Time Attack', exact: true }).click();
  await expect(page.getByText('Correct! +2 points', { exact: true })).toBeVisible();
  await page.clock.runFor(600);
  await expect(page.getByRole('button', { name: 'Skip · −3 s', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Skip · −3 s', exact: true }).click();
  await expect(page.getByText('Skipped. −3 seconds', { exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  await expect(page.getByRole('button', { name: 'End run', exact: true })).toBeVisible();
  expect(data.games.size).toBe(1);
  await page.getByRole('button', { name: 'End run', exact: true }).click();
  await page.getByRole('button', { name: 'End run & save', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Time Attack result', exact: true })).toBeVisible();
  await expect(page.getByLabel('Score 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Image credits', { exact: true })).toHaveCount(0);
  await noOverflow(page);
});

test('Time Attack expiration ends the run even while its image is loading', async ({ page }) => {
  const data = await attackFixture(page);
  await page.route('**/ta-image-1.svg', route => route.abort());
  await page.goto('/time-attack');
  await page.getByRole('radio', { name: 'Hard · 60 s', exact: true }).click();
  await page.getByRole('button', { name: 'Start Time Attack', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('The image could not load');
  await page.clock.runFor(61_000);
  await expect(page.getByRole('heading', { name: 'Time Attack result', exact: true })).toBeVisible();
  expect(data.accepted).toBe(0);
});

test('This or That retries the same choice after reload and completes exactly ten pairs', async ({ page }) => {
  const data = await pickFixture(page);
  await page.goto('/this-or-that');
  await page.getByRole('button', { name: 'Choose my first pair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Actor 1', exact: true })).toBeEnabled();
  await noOverflow(page);
  data.failChoose = true;
  await page.getByRole('button', { name: 'Choose Actor 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  data.failChoose = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Choice saved', { exact: true })).toBeVisible();
  for (let pair = 2; pair <= 10; pair++) {
    await page.clock.runFor(1250);
    await expect(page.getByText(`Pair ${pair} of 10`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: `Choose Actor ${pair * 2 - 1}`, exact: true }).click();
    await expect(page.getByText('Choice saved', { exact: true })).toBeVisible();
  }
  await page.clock.runFor(1250);
  await expect(page.getByRole('heading', { name: 'Ten pairs. All yours.', exact: true })).toBeVisible();
  expect(data.accepted).toBe(10);
  expect(data.games.size).toBe(1);
  await noOverflow(page);
});

test('leaderboard filters, a signed-in profile and admin guards work without source imports', async ({ page }) => {
  await mockQuizApi(page);
  await mockSignedIn(page);
  await page.goto('/leaderboard?category=2&difficulty=3');
  if (page.viewportSize()!.width < 640) {
    await expect(page.getByRole('combobox', { name: 'Category', exact: true })).toHaveValue('2');
  } else {
    await expect(page.getByRole('radio', { name: 'Actors', exact: true })).toHaveAttribute('aria-checked', 'true');
  }
  await expect(page.getByRole('radio', { name: 'Hard', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('FilmExpert', { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'MovieFan', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.goto('/admin/questions');
  await expect(page.getByRole('heading', { name: /access|forbidden/i })).toBeVisible();
});

test('email login success and errors use this origin and never send a real email', async ({ page, baseURL }) => {
  await mockQuizApi(page);
  await page.goto('/login?redirect=%2Fprofile');
  await expect(page.getByRole('button', { name: 'Continue with Google', exact: true })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('film.fan@example.test');
  const pending = page.waitForRequest(request => new URL(request.url()).pathname === '/auth/v1/otp');
  await page.getByRole('button', { name: 'Send sign-in link', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Check your email', exact: true })).toBeVisible();
  const request = await pending;
  expect(new URL(request.url()).searchParams.get('redirect_to')).toBe(`${baseURL}/profile`);
  await noOverflow(page);
  await page.route('**/auth/v1/otp**', route => route.fulfill({ status: 429, json: { code: 'over_email_send_rate_limit', msg: 'Too many requests' } }));
  await page.reload();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('film.fan@example.test');
  await page.getByRole('button', { name: 'Send sign-in link', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Check your email', exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert')).toBeVisible();
});

test('a cancelled OAuth callback offers recovery and strips the error fragment', async ({ page, baseURL }) => {
  await mockQuizApi(page);
  await page.goto('/daily#error=access_denied');
  await expect(page.getByRole('alert')).toContainText('Sign-in was cancelled');
  await expect.poll(() => new URL(page.url()).hash).toBe('');
  await page.getByRole('button', { name: 'Try signing in again', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill('film.fan@example.test');
  const pending = page.waitForRequest(request => new URL(request.url()).pathname === '/auth/v1/otp');
  await dialog.getByRole('button', { name: 'Send sign-in link', exact: true }).click();
  expect(new URL((await pending).url()).searchParams.get('redirect_to')).toBe(`${baseURL}/daily`);
});

test('Classic failed answer stays locked, retries once and supports explicit exit', async ({ page }) => {
  const data = await gameFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Movies', exact: true }).click();
  await expect(page.getByRole('button', { name: gameAnswers[0], exact: true })).toBeEnabled();
  data.failAnswer = true;
  await page.getByRole('button', { name: gameAnswers[0], exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('couldn’t be confirmed');
  await expect(page.getByRole('button', { name: gameAnswers[1], exact: true })).toBeDisabled();
  data.failAnswer = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('Correct! +1 point', { exact: true })).toBeVisible();
  expect(data.accepted).toBe(1);
  await page.getByRole('button', { name: 'Exit quiz', exact: true }).click();
  await page.getByRole('button', { name: 'End quiz & save', exact: true }).click();
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.locator('.hq-result-score strong')).toHaveText('1');
});

test('empty results, API failures and a real 404 keep an escape route', async ({ page }) => {
  await mockQuizApi(page);
  await page.goto('/result');
  await expect(page.locator('main')).toContainText(/no result|play|quiz/i);
  await noOverflow(page);
  await page.route('**/rest/v1/category?**', route => route.fulfill({ status: 503, json: { message: 'Fixture unavailable' } }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  const response = await page.goto('/acceptance-path-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText(/not found|404/i);
  await noOverflow(page);
});

for (const width of [320, 844]) test(`narrow/landscape home and login do not overflow at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 320 ? 568 : 390 });
  await mockQuizApi(page);
  for (const path of ['/', '/login', '/blog', '/how-to-play']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await noOverflow(page);
  }
});

test.describe('public HTML before hydration', () => {
  test.use({ javaScriptEnabled: false });
  test('all published pages contain readable HTML, unique metadata and valid structured data without JavaScript', async ({ page }) => {
    test.setTimeout(100_000);
    const brokenImages: string[] = [];
    page.on('response', response => {
      if (response.request().resourceType() === 'image' && response.status() >= 400) brokenImages.push(response.url());
    });
    const releaseResponse = await page.goto('/seo-release.json');
    expect(releaseResponse?.status()).toBe(200);
    const release = await releaseResponse!.json() as { revision: string; pages: { path: string; kind: string }[] };
    expect(release.pages).toHaveLength(22);
    for (const entry of release.pages) {
      const response = await page.goto(entry.path);
      expect(response?.status(), entry.path).toBe(200);
      expect(response?.headers()['x-robots-tag'], entry.path).toContain('noindex');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('title')).toHaveCount(1);
      await expect(page.locator('meta[name="description"]')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://hard-quiz.com${entry.path}`);
      await expect(page.locator('meta[name="hardquiz:revision"]')).toHaveAttribute('content', release.revision);
      for (const property of ['og:title', 'og:description', 'og:url', 'og:image']) {
        await expect(page.locator(`meta[property="${property}"]`)).toHaveCount(1);
      }
      const structured = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(structured.length, entry.path).toBeGreaterThan(0);
      for (const block of structured) expect(JSON.parse(block)).toBeTruthy();
      expect((await page.locator('main').innerText()).trim().length, entry.path).toBeGreaterThan(70);
      if (entry.kind === 'article') {
        expect((await page.locator('.hq-article-prose').innerText()).length).toBeGreaterThan(500);
        expect(structured.some(block => JSON.parse(block)['@type'] === 'BlogPosting')).toBe(true);
      }
    }
    for (const path of ['/sitemap.xml', '/feed.xml']) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      const xml = await response!.text();
      expect(xml).toContain('https://hard-quiz.com');
      expect(xml).not.toContain('workers.dev');
      expect(await page.evaluate(xml => new DOMParser().parseFromString(xml, 'application/xml').querySelectorAll('parsererror').length, xml)).toBe(0);
    }
    expect(brokenImages, 'Public images requested by the browser must be available').toEqual([]);
  });
});
