import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockQuizApi, mockSignedIn } from './fixtures';
import { attackFixture, attackAnswers } from './time-attack-fixture';
import { pickFixture } from './this-that-fixture';

async function options(page: Page) {
  const calls = await mockQuizApi(page);
  await page.route('**/rest/v1/rpc/time_attack_catalog', r => r.fulfill({ json: {
    categories: [{ id: 1, name: 'All movies', bank_size: 100 }, { id: 2, name: 'Actors', bank_size: 200 }],
    levels: [{ key: 'easy', name: 'Easy', duration_secs: 120 }, { key: 'medium', name: 'Medium', duration_secs: 90 }, { key: 'hard', name: 'Hard', duration_secs: 60 }],
  } }));
  await page.route('**/rest/v1/rpc/this_that_catalog', r => r.fulfill({ json: { boards: [{ key: 'actors', name: 'Actors', people: 200, pairs: 19900 }] } }));
  await page.route('**/functions/v1/this-that-ranking', r => r.fulfill({ json: { rows: [], total: 0, candidates: 200, updated_at: null } }));
  return calls;
}
for (const width of [320, 1440]) test(`direct mode links stay passive and open the intended landing at ${width}px`, async ({ page }) => {
  const calls = await options(page);
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  for (const [label, path] of [['Time Attack', '/time-attack'], ['This or That', '/this-or-that'], ['Daily Challenge', '/daily'], ['Classic quiz', '/']]) {
    await page.getByRole('navigation', { name: 'More games', exact: true }).getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/$' : path + '$'}`));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://hard-quiz.com${path}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (path === '/daily') {
      await expect(page.getByRole('button', { name: 'Log in to play', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Daily rules', exact: true })).toHaveAttribute('href', '/how-to-play#daily');
    }
    if (path === '/time-attack') await expect(page.getByRole('button', { name: 'Start Time Attack', exact: true })).toBeEnabled();
    if (path === '/this-or-that') await expect(page.getByRole('button', { name: 'Choose my first pair', exact: true })).toBeEnabled();
    if (path === '/') await expect(page.getByRole('button', { name: 'Play Movie Stills', exact: true })).toBeEnabled();
    await page.screenshot({ path: test.info().outputPath(`landing-${path.replaceAll('/', '') || 'home'}-${width}.png`), fullPage: true });
  }
  expect(calls.filter(c => /^(quiz_start|daily_begin|time_attack_start|this_that_open|submit_daily_answer)$/.test(c.name))).toEqual([]);
});
for (const width of [1440, 768, 390, 320]) for (const theme of ['dark', 'light', 'halloween']) {
  test(`four equal modes and passive previews in ${theme}, ${width}px`, async ({ page }, info) => {
    const calls = await options(page);
    await page.addInitScript(t => localStorage.setItem('hard-quiz-theme', t), theme);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const modes = page.getByRole('radiogroup', { name: 'Game mode', exact: true });
    await expect(modes.getByRole('radio')).toHaveCount(4);
    const sizes = await modes.getByRole('radio').evaluateAll(els => els.map(el => ({ w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height })));
    expect(Math.max(...sizes.map(s => s.w)) - Math.min(...sizes.map(s => s.w))).toBeLessThan(2);
    expect(sizes.every(s => s.h >= 44)).toBe(true);
    for (const name of ['Classic', 'Time Attack', 'This or That', 'Daily']) {
      await modes.getByRole('radio', { name, exact: true }).click();
      await expect(modes.getByRole('radio', { name, exact: true })).toHaveAttribute('aria-checked', 'true');
      await expect(page.getByRole('figure', { name: new RegExp(`^${name} preview:`) })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(calls.filter(c => /^(quiz_start|daily_begin|time_attack_start|this_that_open|submit_daily_answer)$/.test(c.name))).toEqual([]);
    }
    await expect(page.getByText('200 actors · 19,900 possible pairs')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('daily-preview.png'), fullPage: true });
  });
}
test('mode, Classic and Time Attack settings survive switching, reload and Back', async ({ page }) => {
  await options(page);
  await page.goto('/');
  await page.getByRole('radio', { name: 'Actors', exact: true }).click();
  await page.getByRole('radio', { name: 'Hard', exact: true }).click();
  await page.getByRole('radio', { name: 'Time Attack', exact: true }).click();
  await page.getByRole('radio', { name: 'Actors', exact: true }).click();
  await page.getByRole('radio', { name: 'Medium · 90 s', exact: true }).click();
  await page.getByRole('radio', { name: 'Classic', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Actors', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'Hard', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.goBack();
  await expect(page.getByRole('radio', { name: 'Time Attack', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Medium · 90 s', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('link', { name: 'View rankings', exact: true })).toHaveAttribute('href', /attack-category=2.*level=medium/);
});
test('keyboard changes mode, preview images have a stable fallback, invalid mode falls back to Classic', async ({ page }) => {
  await options(page);
  await page.route('**/storage/v1/object/public/movies/**', r => r.abort());
  await page.route('**/blog-assets/responsive/classic-preview-*.webp', r => r.abort());
  await page.goto('/?mode=invalid');
  const classic = page.getByRole('radio', { name: 'Classic', exact: true });
  await expect(classic).toHaveAttribute('aria-checked', 'true');
  await classic.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Time Attack', exact: true })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Time Attack', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.hq-preview-photo-fallback')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Time Attack', exact: true })).toBeEnabled();
});
test('Time Attack starts from the home switcher only after an explicit action', async ({ page }) => {
  const data = await attackFixture(page); await page.goto('/?mode=time-attack&attack-category=2&level=hard');
  await expect(page.getByRole('button', { name: 'Start Time Attack', exact: true })).toBeEnabled(); expect(data.games.size).toBe(0);
  await page.getByRole('button', { name: 'Start Time Attack', exact: true }).click();
  await expect(page).toHaveURL(/\/time-attack\/play$/);
  await expect.poll(() => data.games.size).toBe(1);
  await expect(page.getByRole('button', { name: attackAnswers[0], exact: true })).toBeEnabled();
  expect(data.calls.find(c => c.name === 'time_attack_start')?.payload).toMatchObject({ p_category_id: 2, p_level: 'hard' });
});
test('This or That starts from the home switcher only after an explicit action', async ({ page }) => {
  const data = await pickFixture(page); await page.goto('/?mode=this-or-that');
  await expect(page.getByRole('button', { name: 'Choose my first pair', exact: true })).toBeEnabled(); expect(data.games.size).toBe(0);
  await page.getByRole('button', { name: 'Choose my first pair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Actor 1', exact: true })).toBeEnabled(); expect(data.games.size).toBe(1);
});
test('Daily summary, login and return stay passive and keep the selected home mode', async ({ page }) => {
  const calls = await options(page); await page.goto('/?mode=daily');
  await expect(page.getByText('Sign in to play. Opening Daily won’t use your attempt.')).toBeVisible();
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(calls.filter(c => c.name === 'daily_begin')).toHaveLength(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('radio', { name: 'Daily', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('link', { name: 'Play Daily', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log in to play', exact: true })).toBeVisible();
  expect(calls.filter(c => c.name === 'daily_begin')).toHaveLength(0);
});
test('profile separates Classic records, Daily history, Time Attack and private favourites', async ({ page }) => {
  await options(page); await mockSignedIn(page); await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Personal bests', exact: false })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your personal actor top' })).toHaveCount(0);
  await expect(page.locator('.hq-profile-daily')).toHaveCount(0);
  await page.getByRole('radio', { name: 'Daily', exact: true }).click();
  await expect(page.locator('.hq-profile-daily')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Personal bests', exact: false })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Time Attack', exact: true }).click();
  await expect(page.locator('.hq-attack-profile')).toBeVisible();
  await page.getByRole('radio', { name: 'This or That', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Your personal actor top' })).toBeVisible();
});

test('guide starts with all four modes and old nested anchors reveal the rules', async ({ page }) => {
  const calls = await options(page); await page.goto('/how-to-play');
  await expect(page.locator('.hq-howto-expanded')).not.toHaveAttribute('open', '');
  for (const name of ['Classic', 'Time Attack', 'This or That', 'Daily Challenge']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.goto('/how-to-play#howto-difficulty');
  await expect(page.getByRole('table', { name: 'Current Classic quiz difficulty settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Difficulty levels', exact: true })).toBeFocused();
  expect(calls.filter(c => ['quiz_start', 'daily_begin', 'time_attack_start', 'this_that_open'].includes(c.name))).toHaveLength(0);
});
test('central rankings keep four distinct views and filter state through Back', async ({ page }) => {
  await options(page); await page.goto('/leaderboard?category=2&difficulty=3');
  const modes = page.getByRole('radiogroup', { name: 'Ranking mode' });
  await expect(page.getByRole('heading', { name: 'Actors — Hard', exact: true })).toBeVisible();
  await modes.getByRole('radio', { name: 'Time Attack', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Time Attack leaderboard', exact: true })).toBeVisible();
  await modes.getByRole('radio', { name: 'This or That', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Community favourites', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Time Attack leaderboard', exact: true })).toHaveCount(0);
  await modes.getByRole('radio', { name: 'Daily', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Daily streak leaderboard' })).toBeVisible();
  await modes.getByRole('radio', { name: 'Classic', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Actors', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'Hard', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.goBack(); await expect(modes.getByRole('radio', { name: 'Daily', exact: true })).toHaveAttribute('aria-checked', 'true');
});
