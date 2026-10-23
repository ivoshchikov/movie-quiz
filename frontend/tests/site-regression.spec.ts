import { test, expect } from '@playwright/test';
import { mockQuizApi, mockSignedIn } from './fixtures';
import { dailyFixture } from './daily-fixtures';

test('analytics keeps Google Arguments commands and records quiz events once', async ({ page }) => {
  await mockQuizApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Movie Stills' }).click();
  await page.getByRole('button', { name: 'Fixture answer', exact: true }).click();
  await expect(page.getByText('Correct! +1 point', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Exit quiz', exact: true }).click();
  await page.getByRole('button', { name: 'End quiz & save' }).click();
  await expect(page).toHaveURL(/\/result$/);

  const commands = await page.evaluate(() => window.dataLayer.map(entry => ({
    shape: Object.prototype.toString.call(entry), args: Array.from(entry as IArguments),
  })));
  expect(commands.every(command => command.shape === '[object Arguments]')).toBe(true);
  expect(commands.some(command => command.args[0] === 'config' && command.args[1] === 'G-QUIZFIXTURE')).toBe(true);
  for (const name of ['quiz_start', 'quiz_answer', 'quiz_end']) {
    expect(commands.filter(command => command.args[0] === 'event' && command.args[1] === name)).toHaveLength(1);
  }
  expect(commands.find(command => command.args[1] === 'quiz_start')?.args[2]).toMatchObject({ category_id: 1, difficulty_id: 1 });
  expect(commands.find(command => command.args[1] === 'quiz_answer')?.args[2]).toMatchObject({ question_id: 999, correct: true });
  expect(commands.find(command => command.args[1] === 'quiz_end')?.args[2]).toMatchObject({ score: 1, finish_reason: 'exit' });
});

test('email sign-in retains the destination and sends the same OTP request', async ({ page }) => {
  await mockQuizApi(page);
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login(?:\?redirect=[^#]+)?$/);
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('fixture@example.test');
  const request = page.waitForRequest(item => new URL(item.url()).pathname === '/auth/v1/otp');
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  const sent = await request;
  expect(sent.postDataJSON()).toMatchObject({ email: 'fixture@example.test' });
  expect(new URL(sent.url()).searchParams.get('redirect_to')).toBe('http://localhost:5173/profile');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hq_auth_return_v1') || '{}').path)).toBe('/profile');
});

test('Google sign-in retains the provider and requested return path', async ({ page }) => {
  await mockQuizApi(page);
  await page.goto('/login?redirect=%2Fdaily');
  const request = page.waitForRequest(item => new URL(item.url()).pathname === '/auth/v1/authorize');
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  const target = new URL((await request).url());
  expect(target.searchParams.get('provider')).toBe('google');
  expect(target.searchParams.get('redirect_to')).toBe('http://localhost:5173/daily');
});

test('local sign-out updates the account and protects personal results', async ({ page }) => {
  await mockQuizApi(page);
  await mockSignedIn(page);
  await page.route('**/auth/v1/logout?**', route => route.fulfill({ status: 204, body: '' }));
  await page.goto('/profile');
  await expect(page.locator('.hq-account-name')).toHaveText('MovieFan');
  await page.getByRole('button', { name: 'Account menu' }).click();
  const request = page.waitForRequest(item => new URL(item.url()).pathname === '/auth/v1/logout');
  await page.getByRole('menuitem', { name: 'Log out', exact: true }).click();
  expect(new URL((await request).url()).searchParams.get('scope')).toBe('local');
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login(?:\?redirect=[^#]+)?$/);
});

test('a new profile loads an empty nickname and saves the existing profile fields', async ({ page }) => {
  await mockQuizApi(page);
  await mockSignedIn(page);
  let nickname: string | null = null;
  await page.route('**/rest/v1/profiles?**', route => {
    if (route.request().method() === 'PATCH') nickname = route.request().postDataJSON().nickname;
    return route.fulfill({ contentType: 'application/json', headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' }, body: route.request().method() === 'HEAD' ? '' : JSON.stringify({ nickname, avatar_url: null }) });
  });
  await page.goto('/setup-profile');
  await page.getByRole('textbox', { name: 'Nickname', exact: true }).fill('NewFilmFan');
  const request = page.waitForRequest(item => item.url().includes('/rest/v1/profiles') && item.method() === 'PATCH');
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
  const saved = await request;
  expect(saved.postDataJSON()).toEqual({ nickname: 'NewFilmFan' });
  expect(new URL(saved.url()).searchParams.get('nickname')).toBe('is.null');
  expect(new URL(saved.url()).searchParams.get('user_id')).toBe('eq.fixture-user');
  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.locator('.hq-account-name')).toHaveText('NewFilmFan');
});

test('Daily loads personal stats, switches ranked lists and submits a server-graded answer',async({page})=>{
 const data=await dailyFixture(page);await page.goto('/daily');const card=page.getByRole('region',{name:'Your Daily stats',exact:true});await expect(card.locator('dd').first()).toHaveText('3 days');
 await page.getByRole('button',{name:'Streak leaderboard',exact:true}).click();await expect(page.getByText('ActivePlayer 1',{exact:true})).toBeVisible();await page.getByRole('button',{name:'All-time best',exact:true}).click();await expect(page.getByText('BestPlayer 1',{exact:true})).toBeVisible();
 expect(data.calls.filter(c=>c.name==='daily_begin')).toHaveLength(0);await page.getByRole('button',{name:'Start Daily',exact:true}).click();await expect(page.getByRole('button',{name:'Fixture answer',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Fixture answer',exact:true}).click();await expect(page.getByRole('heading',{name:'Correct!',exact:true})).toBeVisible();expect(data.calls.filter(c=>c.name==='daily_begin')).toHaveLength(1);expect(data.calls.find(c=>c.name==='submit_daily_answer')?.payload).toMatchObject({p_user_id:'fixture-user',p_answer:'Fixture answer',p_time:0});
});

test('admin history and answer search retain their typed fields and image URLs', async ({ page }) => {
  await mockQuizApi(page);
  await mockSignedIn(page);
  await page.route('**/rest/v1/rpc/is_admin', route => route.fulfill({ contentType: 'application/json', body: 'true' }));
  await page.route('**/rest/v1/rpc/get_daily_history_admin', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ d: '2026-10-06', question_id: 800, image_url: 'history-film.jpg', correct_answer: 'History Film', category_id: 1, difficulty_level_id: 1, total_answers: 5, correct_answers: 3, created_at: '2026-10-06T12:00:00Z' }]) }));
  await page.route('**/rest/v1/question?**', route => new URL(route.request().url()).searchParams.has('correct_answer')
    ? route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 801, image_url: 'https://quiz-fixture.supabase.co/fixture.svg', correct_answer: 'Search Film', category_id: 1, difficulty_level_id: 1 }]) })
    : route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 801, image_url: 'https://quiz-fixture.supabase.co/fixture.svg', correct_answer: 'Search Film', options_json: ['Search Film', 'Second', 'Third', 'Fourth'], category_id: 1, difficulty_level_id: 1 }]) }));
  await page.goto('/admin/daily');
  await expect(page.getByText('History Film', { exact: true })).toBeVisible();
  await expect(page.getByAltText('Daily for 2026-10-06')).toHaveAttribute('src', /\/history-film\.jpg$/);
  await expect(page.getByText('3/5 correct', { exact: true })).toBeVisible();
  await page.getByLabel('Search by answer').fill('Search');
  await expect(page.getByText('Search Film', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Select question 801' }).click();
  await expect(page.getByRole('heading', { name: 'Search Film' })).toBeVisible();
});

test('article posters remain available without gallery data and reset on navigation', async ({ page }) => {
  await mockQuizApi(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/blog');
  await page.evaluate(async () => {
    const moduleUrl = new URL('/src/blog/index.ts', window.location.origin).href;
    const { posts } = await import(moduleUrl) as { posts: { gallery?: string[] }[] };
    for (const post of posts) post.gallery = [];
  });
  await page.getByRole('link', { name: 'August 2025 Movie Releases: 7 Picks (US)', exact: true }).click();
  await expect(page.locator('.hq-movie-poster img')).toHaveCount(7);
  const poster = page.locator('.hq-movie-poster img').first();
  await expect(poster).toHaveAttribute('src', /bad-guys-2(?:-\d+)?\.webp$/);
  await page.getByRole('link', { name: /September 2025 Movie Releases: 9 Picks/ }).click();
  await expect(page.locator('.hq-movie-poster img')).toHaveCount(9);
  await expect(poster).toHaveAttribute('src', /the-conjuring-last-rites(?:-\d+)?\.webp$/);
  expect(errors).toEqual([]);
});

test('public pages and empty game states load without JavaScript exceptions', async ({ page }) => {
  await mockQuizApi(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/', '/leaderboard', '/how-to-play', '/blog', '/blog/why-2-39-1-feels-more-cinematic', '/login', '/result', '/play']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});
