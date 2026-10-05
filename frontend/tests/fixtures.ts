import type { Page } from '@playwright/test';

export const categories = [
  { id: 1, name: 'All movies' }, { id: 2, name: 'Actors' },
  { id: 3, name: 'Actresses' }, { id: 4, name: 'TV series' },
];
export const difficulties = [
  { id: 1, key: 'easy', name: 'Easy', time_limit_secs: 42, lives: 3, sort_order: 1 },
  { id: 2, key: 'normal', name: 'Medium', time_limit_secs: 30, lives: 3, sort_order: 2 },
  { id: 3, key: 'hard', name: 'Hard', time_limit_secs: 17, lives: 1, sort_order: 3 },
];

export async function mockQuizApi(page: Page) {
  const calls: { name: string; payload: Record<string, unknown> }[] = [];
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    const name = url.pathname.split('/').pop() || '';
    const request = route.request();
    if (url.pathname.includes('/rpc/')) calls.push({ name, payload: request.postDataJSON() || {} });
    let body: unknown = [];
    const headers: Record<string, string> = { 'access-control-expose-headers': 'content-range' };
    switch (name) {
      case 'category': body = categories; break;
      case 'difficulty_level': body = difficulties; break;
      case 'question': {
        const category = Number(url.searchParams.get('category_id')?.replace('eq.', ''));
        const count = category === 1 ? 100 : category === 2 ? 200 : 0;
        headers['content-range'] = `0-${Math.max(count - 1, 0)}/${count}`;
        body = { correct_answer: 'Fixture answer' };
        break;
      }
      case 'profiles': {
        headers['content-range'] = '0-0/0';
        body = request.method() === 'POST' ? { nickname: request.postDataJSON().nickname, avatar_url: null } : { nickname: 'MovieFan', avatar_url: null };
        break;
      }
      case 'is_admin': body = false; break;
      case 'get_leaderboard': body = [{ nickname: 'FilmExpert', best_score: 25, best_time: 82, updated_at: '2026-10-05T12:00:00Z' }]; break;
      case 'user_best': body = [{ category_id: 1, difficulty_level_id: 3, best_score: 12, best_time: 65, updated_at: '2026-10-05T12:00:00Z' }]; break;
      case 'get_question': {
        const payload = request.postDataJSON();
        body = [{ id: 999, image_url: 'https://quiz-fixture.supabase.co/fixture.svg', options_json: ['Fixture answer', 'Second answer', 'Third answer', 'Fourth answer'], category_id: payload.p_category_id, difficulty_level_id: payload.p_difficulty_id }];
        break;
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers, body: request.method() === 'HEAD' ? '' : JSON.stringify(body) });
  });
  await page.route('**/auth/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/fixture.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="#22232d"/></svg>' }));
  return calls;
}

export async function mockSignedIn(page: Page) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://quiz-fixture.supabase.co';
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  const session = {
    access_token: `e30.${Buffer.from(JSON.stringify({ sub: 'fixture-user', role: 'authenticated', exp: 4102444800 })).toString('base64url')}.fixture`,
    refresh_token: 'fixture-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800,
    user: { id: 'fixture-user', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  };
  await page.addInitScript(({ storageKey, session }) => localStorage.setItem(storageKey, JSON.stringify(session)), { storageKey, session });
}
