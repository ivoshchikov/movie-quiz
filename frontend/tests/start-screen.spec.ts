import { test, expect } from '@playwright/test';
import { mockQuizApi, mockSignedIn } from './fixtures';

test('balanced homepage launches the selected category and actual difficulty rules', async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'How well do you know cinema?' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Movie Stills/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: /Actresses/ })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: /TV series/ })).toHaveCount(0);
  await expect(page.getByText('42 sec per question')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('homepage-desktop.png'), fullPage: true });
  await page.getByRole('radio', { name: /Actors/ }).click();
  await page.getByRole('radio', { name: 'Hard', exact: true }).click();
  await expect(page.getByText('17 sec per question')).toBeVisible();
  await expect(page.getByText('1 life', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play Actors' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole('button', { name: 'Fixture answer', exact: true })).toBeVisible();
  expect(calls.filter(call => call.name === 'get_question').every(call => call.payload.p_category_id === 2 && call.payload.p_difficulty_id === 3)).toBeTruthy();
});

test('question counts cannot enable play for an empty level', async ({ page }) => {
  await mockQuizApi(page);
  await page.route('**/rest/v1/question?**', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('difficulty_level_id')) return route.fulfill({ status: 200, headers: { 'access-control-expose-headers': 'content-range', 'content-range': '0-0/0' }, body: '' });
    return route.fallback();
  });
  await page.goto('/');
  await expect(page.getByText('No questions for this difficulty yet. Try another level.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Coming soon' })).toBeDisabled();
});

test('availability failures can be retried without starting a quiz', async ({ page }) => {
  await mockQuizApi(page);
  let fail = true;
  await page.route('**/rest/v1/question?**', route => {
    if (new URL(route.request().url()).searchParams.has('difficulty_level_id') && fail) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"fixture failure"}' });
    return route.fallback();
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Questions could not be checked.');
  await expect(page.getByRole('button', { name: 'Play quiz' })).toBeDisabled();
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Play Movie Stills' })).toBeEnabled();
});

test('late question counts cannot unlock play after the selection changes', async ({ page }) => {
  await mockQuizApi(page);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/rest/v1/question?**', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('category_id') !== 'eq.2' || !url.searchParams.has('difficulty_level_id')) return route.fallback();
    if (url.searchParams.get('difficulty_level_id') === 'eq.1') {
      await held;
      return route.fulfill({ status: 200, headers: { 'access-control-expose-headers': 'content-range', 'content-range': '0-9/10' }, body: '' });
    }
    return route.fulfill({ status: 200, headers: { 'access-control-expose-headers': 'content-range', 'content-range': '0-0/0' }, body: '' });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play Movie Stills' })).toBeEnabled();
  const pending = page.waitForRequest(request => request.url().includes('category_id=eq.2') && request.url().includes('difficulty_level_id=eq.1'));
  await page.getByRole('radio', { name: /Actors/ }).click();
  await pending;
  await expect(page.getByRole('button', { name: 'Checking questions…' })).toBeDisabled();
  await page.getByRole('radio', { name: 'Hard', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Coming soon' })).toBeDisabled();
  const response = page.waitForResponse(item => item.url().includes('category_id=eq.2') && item.url().includes('difficulty_level_id=eq.1'));
  release();
  await response;
  await expect(page.getByRole('radio', { name: 'Hard', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: 'Coming soon' })).toBeDisabled();
});

test('catalog errors can be retried and newly populated categories appear', async ({ page }) => {
  await mockQuizApi(page);
  let fail = true;
  await page.route('**/rest/v1/category?**', route => fail ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"fixture failure"}' }) : route.fallback());
  await page.route('**/rest/v1/question?**', route => new URL(route.request().url()).searchParams.get('category_id') === 'eq.3'
    ? route.fulfill({ status: 200, headers: { 'access-control-expose-headers': 'content-range', 'content-range': '0-9/10' }, body: '' }) : route.fallback());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Quiz options could not be loaded.');
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('radio', { name: /Actresses/ })).toBeVisible();
});

test('leaderboard is public and its filters use the selected ids', async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Leaderboard', exact: true }).click();
  await expect(page).toHaveURL(/\/leaderboard$/);
  await expect(page.getByRole('cell', { name: 'FilmExpert' })).toBeVisible();
  await page.getByRole('radio', { name: /Actors/ }).click();
  await page.getByRole('radio', { name: 'Medium', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Actors — Medium', exact: true })).toBeVisible();
  await expect.poll(() => calls.filter(call => call.name === 'get_leaderboard').at(-1)?.payload).toMatchObject({ p_category_id: 2, p_difficulty_id: 2, p_limit: 11 });
});

test('signed-in users can view personal bests with a fixed nickname', async ({ page }) => {
  await mockQuizApi(page);
  await mockSignedIn(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Change nickname' })).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'My results' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: 'Movie Stills', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '01:05' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'MovieFan', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change nickname' })).toHaveCount(0);
});

test('profile requires sign-in while homepage login remains available', async ({ page }) => {
  await mockQuizApi(page);
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  await expect.poll(() => page.evaluate(() => window.history.state.usr.redirectTo)).toBe('/profile');
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Sign in with Google');
});

test('mobile homepage has no overflow and all primary navigation is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockQuizApi(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play Movie Stills' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: test.info().outputPath('homepage-mobile.png'), fullPage: true });
  for (const name of ['Play', 'Daily', 'Leaderboard', 'Blog']) await expect(page.getByRole('navigation').getByRole('link', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Play Daily' })).toHaveAttribute('href', '/daily');
  await expect(page.getByRole('link', { name: 'Why 2.39:1 Feels More Cinematic' })).toHaveAttribute('href', '/blog/why-2-39-1-feels-more-cinematic');
  await expect(page.getByRole('link', { name: 'How to play' })).toHaveAttribute('href', '/how-to-play');
});
