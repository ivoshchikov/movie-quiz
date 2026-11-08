import { test, expect } from '@playwright/test';
import { attackFixture, attackAnswers } from './time-attack-fixture';
import { pickFixture, pickOwner } from './this-that-fixture';

for (const category of [{ id: 3, name: 'Actresses', alt: 'Actress photograph to identify' }, { id: 4, name: 'TV Series', alt: 'TV series still to identify' }]) {
  test(`Time Attack ${category.name} starts, reloads and retains its category in results and rankings`, async ({ page }) => {
    const d = await attackFixture(page, { size: 1 });
    await page.goto('/?mode=time-attack');
    const categories = page.getByRole('radiogroup', { name: 'Category', exact: true });
    await expect(categories.getByRole('radio')).toHaveCount(4);
    await categories.getByRole('radio', { name: category.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`attack-category=${category.id}`));
    expect(d.games.size).toBe(0);
    await page.getByRole('button', { name: 'Start Time Attack', exact: true }).click();
    await expect(page.getByAltText(category.alt)).toBeVisible();
    const g = [...d.games.values()][0];
    expect(g.category_id).toBe(category.id);
    page.once('dialog', dialog => dialog.accept());
    await page.reload();
    await expect(page.getByAltText(category.alt)).toBeVisible();
    expect(d.games.size).toBe(1);
    await page.getByRole('button', { name: attackAnswers[0], exact: true }).click();
    await page.clock.runFor(600);
    await expect(page.getByRole('heading', { name: 'Time Attack result', exact: true })).toBeVisible();
    expect(g.finish_reason).toBe('completed');
    await expect(page.getByRole('link', { name: 'Play again', exact: true })).toHaveAttribute('href', new RegExp(`category=${category.id}`));
    await page.getByRole('link', { name: 'View leaderboard', exact: true }).click();
    await expect(page.getByRole('radiogroup', { name: 'Category' }).getByRole('radio', { name: category.name, exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.hq-attack-ranking')).toContainText(category.name);
    await expect.poll(() => d.calls.filter(c => c.name === 'time_attack_leaderboard').at(-1)?.payload.p_category_id).toBe(category.id);
  });
}

test('actress choices and pending retries survive category switches without replacing the actor run', async ({ page }) => {
  const d = await pickFixture(page);
  await page.goto('/this-or-that');
  await page.getByRole('button', { name: 'Choose my first pair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Actor 1', exact: true })).toBeEnabled();
  const actor = [...d.games.values()][0];
  await page.getByRole('link', { name: '← This or That' }).click();
  await page.getByRole('radiogroup', { name: 'Category' }).getByRole('radio', { name: 'Actresses', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue my choices', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose my first pair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Actress 1', exact: true })).toBeEnabled();
  const actress = [...d.games.values()].find(g => g.board === 'actresses')!;
  expect(actress.id).not.toBe(actor.id);
  d.failChoose = true;
  await page.getByRole('button', { name: 'Choose Actress 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  d.failChoose = false;
  await page.reload();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Choice saved', { exact: true })).toBeVisible();
  const attempts = d.calls.filter(c => c.name === 'this_that_choose');
  expect(attempts).toHaveLength(2);
  expect(attempts[0].payload).toEqual(attempts[1].payload);
  expect(actor.round!.outcome).toBeNull();
  await page.getByRole('link', { name: '← This or That' }).click();
  await expect(page).toHaveURL(/board=actresses/);
  await page.getByRole('radiogroup', { name: 'Category' }).getByRole('radio', { name: 'Actors', exact: true }).click();
  await page.getByRole('button', { name: 'Continue my choices', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Actor 1', exact: true })).toBeEnabled();
  expect(d.games.size).toBe(2);
});

test('each account category restores its own profile and favourites after switching', async ({ page }) => {
  const d = await pickFixture(page, { signedIn: true });
  await page.goto('/this-or-that?board=actresses');
  await page.getByRole('button', { name: 'Choose my first pair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Actress 1', exact: true })).toBeEnabled();
  const actress = [...d.games.values()][0];
  expect(actress.owner).toBe(pickOwner);
  await page.getByRole('link', { name: '← This or That' }).click();
  await page.getByRole('radiogroup', { name: 'Category' }).getByRole('radio', { name: 'Actors', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue my choices', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose my first pair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Actor 1', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: '← This or That' }).click();
  await page.getByRole('radiogroup', { name: 'Category' }).getByRole('radio', { name: 'Actresses', exact: true }).click();
  await page.getByRole('button', { name: 'Continue my choices', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Actress 1', exact: true })).toBeEnabled();
  expect(d.games.size).toBe(2);
});

test('guest favourite imports are scoped to the selected category and preserve old actor storage', async ({ page }) => {
  const d = await pickFixture(page, { signedIn: true });
  await page.addInitScript(() => {
    localStorage.setItem('hq:this-that:guest-preferences', JSON.stringify([{ a: 1, b: 2, winner: 1 }]));
    localStorage.setItem('hq:this-that:import:00000000-0000-4000-8000-000000000002', JSON.stringify({ operation: '00000000-0000-4000-8000-000000099001', items: [{ a: 1, b: 2, winner: 1 }] }));
    localStorage.setItem('hq:this-that:guest-preferences:actresses', JSON.stringify([{ a: 1001, b: 1002, winner: 1002 }]));
  });
  await page.goto('/this-or-that?board=actresses');
  await page.getByRole('button', { name: 'Save my guest favourites' }).click();
  await expect(page.getByText('Your guest favourites are saved privately to this account.')).toBeVisible();
  expect(d.importRequests[0].p_board).toBe('actresses');
  expect(d.importRequests[0].p_choices).toEqual([{ a: 1001, b: 1002, winner: 1002 }]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hq:this-that:guest-preferences')!))).toEqual([{ a: 1, b: 2, winner: 1 }]);
  await page.getByRole('radiogroup', { name: 'Category' }).getByRole('radio', { name: 'Actors', exact: true }).click();
  await page.getByRole('button', { name: 'Save my guest favourites' }).click();
  await expect.poll(() => d.importRequests.length).toBe(2);
  expect(d.importRequests[1].p_board).toBe('actors');
  expect(d.importRequests[1].p_operation).toBe('00000000-0000-4000-8000-000000099001');
  expect(d.importRequests[1].p_choices).toEqual([{ a: 1, b: 2, winner: 1 }]);
  expect(d.games.size).toBe(0);
  expect(d.calls.filter(c => c.name === 'this_that_choose')).toHaveLength(0);
});

test('category selection survives Back, Forward and the passive sign-in destination', async ({ page }) => {
  const d = await pickFixture(page);
  await page.goto('/?mode=this-or-that&board=actors');
  await page.getByRole('radio', { name: 'Actresses', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('radio', { name: 'Actors', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.goForward();
  await expect(page.getByRole('radio', { name: 'Actresses', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('link', { name: 'log in before choosing', exact: true }).click();
  const destination = new URL(page.url()).searchParams.get('redirect')!;
  expect(destination).toContain('board=actresses');
  expect(destination).toContain('mode=this-or-that');
  expect(d.games.size).toBe(0);
});

test('actor and actress tabs keep separate guest capabilities and activity', async ({ page, context }) => {
  const actors = await pickFixture(page);
  await page.goto('/this-or-that');
  await page.getByRole('button', { name: 'Choose my first pair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Actor 1', exact: true })).toBeEnabled();
  const second = await context.newPage();
  const actresses = await pickFixture(second, { games: actors.games });
  await second.goto('/this-or-that?board=actresses');
  await second.getByRole('button', { name: 'Choose my first pair', exact: true }).click();
  await expect(second.getByRole('button', { name: 'Choose Actress 1', exact: true })).toBeEnabled();
  await second.getByRole('button', { name: 'Choose Actress 1', exact: true }).click();
  await expect(second.getByText('Choice saved', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose Actor 1', exact: true })).toBeEnabled();
  expect(actors.games.size).toBe(2);
  expect(actors.calls.filter(c => c.name === 'this_that_choose')).toHaveLength(0);
  expect(actresses.calls.filter(c => c.name === 'this_that_choose')[0].payload.p_id).toBe([...actors.games.values()].find(g => g.board === 'actresses')!.id);
  await second.close();
});

test('community and profile favourites select actresses without stale actor rows or search', async ({ page }) => {
  const d = await pickFixture(page, { signedIn: true });
  d.ranking = { total: 1, candidates: 200, updated_at: null, rows: [{ id: 1, name: 'Actor One', image_url: 'actors/one.webp', rank: 1, provisional: true }] };
  d.actressRanking = { total: 1, candidates: 150, updated_at: null, rows: [{ id: 1001, name: 'Actress One', image_url: 'actresses/one.webp', rank: 1, provisional: true }] };
  d.top = [{ id: 1, name: 'Actor One', image_url: 'actors/one.webp', rank: 1, provisional: true }];
  d.actressTop = [{ id: 1001, name: 'Actress One', image_url: 'actresses/one.webp', rank: 1, provisional: true }];
  await page.goto('/leaderboard?mode=this-or-that');
  await expect(page.locator('.hq-pick-rank-list')).toContainText('Actor One');
  await page.getByLabel('Find an actor’s place').fill('One');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('radio', { name: 'Actresses', exact: true }).click();
  await expect(page.getByLabel('Find an actress’s place')).toHaveValue('');
  await expect(page.locator('.hq-pick-rank-list')).toContainText('Actress One');
  await expect(page.locator('.hq-pick-rank-list')).not.toContainText('Actor One');
  expect(d.rankRequests.at(-1)).toEqual({ board: 'actresses', search: '' });
  await page.goto('/profile?mode=this-or-that&board=actresses');
  await expect(page.getByRole('region', { name: 'Your personal actress top' })).toContainText('Actress One');
  await page.getByRole('radio', { name: 'Actors', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Your personal actor top' })).toContainText('Actor One');
  await expect(page.getByRole('region', { name: 'Your personal actor top' })).not.toContainText('Actress One');
});

test('an unavailable actress category does not start or silently resume actors', async ({ page }) => {
  const d = await pickFixture(page);
  d.boards = d.boards.filter(b => b.key === 'actors');
  await page.goto('/this-or-that?board=actresses');
  await expect(page.getByText('Actresses are being prepared. Please check back soon.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose my first pair', exact: true })).toHaveCount(0);
  expect(d.games.size).toBe(0);
});

for (const theme of ['light', 'dark', 'christmas']) for (const width of [320, 1440]) {
  test(`${theme} category selectors and actress pairs fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(theme => localStorage.setItem('hard-quiz-theme', theme), theme);
    const d = await pickFixture(page);
    await page.goto('/?mode=this-or-that&board=actresses');
    await expect(page.getByRole('radio', { name: 'Actresses', exact: true })).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Choose my first pair', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Choose Actress 1', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: /^Choose Actor / })).toHaveCount(0);
    expect(d.calls.find(c => c.name === 'this_that_open')?.payload.p_board).toBe('actresses');
    await page.screenshot({ path: test.info().outputPath(`actresses-${theme}-${width}.png`), fullPage: true });
  });
}


test('an account profile with only imported actress favourites requires an explicit first pair', async ({ page }) => {
  const d = await pickFixture(page, { signedIn: true });
  const id = '00000000-0000-4000-8000-000000088001';
  d.games.set(id, { id, owner: pickOwner, board: 'actresses', version: 0, series: 1, cycle: 1, server_now: '2026-10-19T18:00:00Z', complete: false, summary: { choices: 0, settled: 0 }, round: null });
  await page.goto('/this-or-that?board=actresses');
  await expect.poll(() => d.calls.filter(c => c.name === 'this_that_active').length).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Continue my choices', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Choose my first pair', exact: true })).toBeEnabled();
  expect(d.calls.filter(c => c.name === 'this_that_open')).toHaveLength(0);
});
