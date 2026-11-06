import { test, expect } from '@playwright/test';
import { mockQuizApi, mockSignedIn } from './fixtures';

test('balanced homepage launches the selected category and actual difficulty rules', async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Movie & Actor Quiz Games' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Movies/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: "Actresses", exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'TV Series', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Easy', exact: true })).toHaveAccessibleDescription('45 s · 5 lives');
  await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toHaveAccessibleDescription('30 s · 3 lives');
  await expect(page.getByRole('radio', { name: 'Hard', exact: true })).toHaveAccessibleDescription('20 s · 1 life');
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('homepage-desktop.png'), fullPage: true });
  await page.getByRole('radio', { name: /Actors/ }).click();
  await page.getByRole('radio', { name: 'Hard', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Hard', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Play Actors' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole('button', { name: 'Fixture answer', exact: true })).toBeVisible();
  expect(calls.filter(call => call.name === 'quiz_start').every(call => call.payload.p_category_id === 2 && call.payload.p_difficulty_id === 3)).toBeTruthy();
});

test('all difficulties share category availability without issuing level-specific counts', async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play Movies' })).toBeEnabled();
  await page.getByRole('radio', { name: 'Hard', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play Movies' })).toBeEnabled();
  await page.getByRole('radio', { name: 'Actresses', exact: true }).click();
  await expect(page.getByText('No questions in this category yet. Try another category.')).toBeVisible();
  await page.getByRole('radio', { name: 'Medium', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Coming soon' })).toBeDisabled();
  expect(calls.filter(call => call.name === 'count_questions').map(call => call.payload)).toEqual([
    { p_category_id: 1, p_difficulty_id: null }, { p_category_id: 3, p_difficulty_id: null },
  ]);
});

test('availability failures can be retried without starting a quiz', async ({ page }) => {
  await mockQuizApi(page);
  let fail = true;
  await page.route('**/rest/v1/rpc/count_questions', route => fail
    ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"fixture failure"}' })
    : route.fallback());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Questions could not be checked.');
  await expect(page.getByRole('button', { name: 'Play quiz' })).toBeDisabled();
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Play Movies' })).toBeEnabled();
});

test('late question counts cannot unlock a different category', async ({ page }) => {
  await mockQuizApi(page);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/rest/v1/rpc/count_questions', async route => {
    if (route.request().postDataJSON().p_category_id !== 2) return route.fallback();
    await held;
    await route.fallback().catch(() => {});
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play Movies' })).toBeEnabled();
  const pending = page.waitForRequest(request => request.url().endsWith('/count_questions') && request.postDataJSON().p_category_id === 2);
  await page.getByRole('radio', { name: 'Actors', exact: true }).click();
  await pending;
  await expect(page.getByRole('button', { name: 'Checking questions…' })).toBeDisabled();
  const cancelled = page.waitForEvent('requestfailed', request => request.url().endsWith('/count_questions') && request.postDataJSON().p_category_id === 2);
  await page.getByRole('radio', { name: 'Actresses', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Coming soon' })).toBeDisabled();
  release();
  await cancelled;
  await expect(page.getByRole('button', { name: 'Coming soon' })).toBeDisabled();
});

test('catalog errors can be retried and all categories appear', async ({ page }) => {
  await mockQuizApi(page);
  let fail = true;
  await page.route('**/rest/v1/category?**', route => fail ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"fixture failure"}' }) : route.fallback());
  await page.route('**/rest/v1/rpc/count_questions', route => route.request().postDataJSON().p_category_id === 3
    ? route.fulfill({ status: 200, contentType:'application/json', body: '10' }) : route.fallback());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Quiz options could not be loaded.');
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('radio', { name: /Actresses/ })).toBeVisible();
});

test('leaderboard is public and its filters use the selected ids', async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Rankings', exact: true }).click();
  await expect(page).toHaveURL(/\/leaderboard$/);
  await expect(page.getByRole('cell', { name: 'FilmExpert' })).toBeVisible();
  await page.getByRole('radio', { name: /Actors/ }).click();
  await page.getByRole('radio', { name: 'Medium', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Actors — Medium', exact: true })).toBeVisible();
  await expect.poll(() => calls.filter(call => call.name === 'classic_leaderboard').at(-1)?.payload).toMatchObject({ p_category_id: 2, p_difficulty_id: 2, p_limit: 10 });
});

test('signed-in users can view personal bests with a fixed nickname', async ({ page }) => {
  await mockQuizApi(page);
  await mockSignedIn(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Change nickname' })).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'My results' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: 'Movies', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '01:05' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'MovieFan', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change nickname' })).toHaveCount(0);
});

test('profile requires sign-in while homepage login remains available', async ({ page }) => {
  await mockQuizApi(page);
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login(?:\?redirect=[^#]+)?$/);
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/profile');
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Continue with Google');
});

test('mobile homepage has no overflow and all primary navigation is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockQuizApi(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play Movies' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: test.info().outputPath('homepage-mobile.png'), fullPage: true });
  for (const name of ['Games', 'Rankings', 'Blog']) await expect(page.getByRole('navigation').getByRole('link', { name, exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Daily', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Play Daily' })).toHaveAttribute('href', '/daily');
  await expect(page.getByRole('link', { name: 'Is Whalefall Based on a Book? A Spoiler-Free Guide to the Movie' })).toHaveAttribute('href', '/blog/is-whalefall-based-on-a-book');
  await expect(page.getByRole('link', { name: 'How to play' })).toHaveAttribute('href', '/how-to-play');
});
