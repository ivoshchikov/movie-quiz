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
  const games = new Map<string, Record<string, unknown>>();
  // Keep analytics in its local command queue; never send test events to Google.
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.route('https://hard-quiz.com/blog-assets/best-horror-movies-2026-cover.webp', route => route.fulfill({ contentType: 'image/webp', path: 'public/blog-assets/best-horror-movies-2026-cover.webp' }));
  await page.route('https://hard-quiz.com/blog-assets/whalefall-book-to-film-cover.webp', route => route.fulfill({ contentType: 'image/webp', path: 'public/blog-assets/whalefall-book-to-film-cover.webp' }));
  await page.route('**/storage/v1/object/public/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#22232d"/></svg>' }));
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    const name = url.pathname.split('/').pop() || '';
    const request = route.request();
    if (url.pathname.includes('/rpc/')) calls.push({ name, payload: request.postDataJSON() || {} });
    let body: unknown = [];
    const headers: Record<string, string> = { 'access-control-expose-headers': 'content-range' };
    switch (name) {
      case 'quiz_start': {
        const p = request.postDataJSON();
        body = games.get(p.p_session) ?? { id: p.p_session, category_id: p.p_category_id, difficulty_id: p.p_difficulty_id,
          score: 0, lives: difficulties.find(d => d.id === p.p_difficulty_id)?.lives ?? 3, bank_size: 10,
          status: 'active', started_at: new Date().toISOString(), server_now: new Date().toISOString(), time_secs: 0,
          finish_reason: null, round: null, previous_best: null, personal_best: null, record_outcome: null };
        games.set(p.p_session, body as Record<string, unknown>); break;
      }
      case 'quiz_next': case 'quiz_answer': case 'quiz_finish': {
        const p = request.postDataJSON(), g = games.get(p.p_session);
        if (!g) return route.fulfill({ status: 404, body: '{}' });
        const now = new Date().toISOString(); g.server_now = now;
        if (name === 'quiz_next') g.round = { id: '00000000-0000-4000-8000-000000000999', number: 1, question_id: 999,
          image_url: 'https://quiz-fixture.supabase.co/fixture.svg', options: ['Fixture answer','Second answer','Third answer','Fourth answer'],
          issued_at: now, deadline_at: new Date(Date.parse(now) + 30000).toISOString(), outcome: null, selected: null };
        if (name === 'quiz_answer') {
          const r = g.round as Record<string, unknown>; r.selected = p.p_answer; r.outcome = p.p_answer === 'Fixture answer' ? 'correct' : p.p_answer == null ? 'timeout' : 'wrong';
          if (r.outcome === 'correct') g.score = Number(g.score) + 1; else g.lives = Number(g.lives) - 1;
        }
        if (name === 'quiz_finish') { g.status = 'finished'; g.finish_reason = 'exit'; }
        body = g; break;
      }
      case 'quiz_leaderboard': body = { total: 1, top: [{ rank: 1, user_id: 'expert', nickname: 'FilmExpert', best_score: 25, best_time: 82, updated_at: '2026-10-05T12:00:00Z' }], me: null }; break;
      case 'daily_status': body = { date: '2026-10-07', server_now: '2026-10-07T17:00:00Z', closes_at: '2026-10-08T05:00:00Z', started_at: null, result: null }; break;
      case 'daily_leaderboard': body = { total: 0, top: [], me: null }; break;
      case 'my_game_stats': body = { tracking_since: '2026-10-15T00:00:00Z', normal: { games: 0, correct: 0, wrong: 0, timeouts: 0, abandoned: 0, average_ms: null, best_streak: 0, unique_questions: 0 }, breakdown: [], trend: [], daily_calendar: [] }; break;
      case 'category': body = categories; break;
      case 'difficulty_level': body = difficulties; break;
      case 'count_questions': {
        const category = request.postDataJSON().p_category_id;
        body = category === 1 ? 100 : category === 2 ? 200 : 0;
        break;
      }
      case 'question': return route.fulfill({status:403,body:'{}'});
      case 'answer_game_question': body = request.postDataJSON().p_answer === 'Fixture answer'; break;
      case 'profiles': {
        headers['content-range'] = '0-0/0';
        body = request.method() === 'POST' ? { nickname: request.postDataJSON().nickname, avatar_url: null } : { nickname: 'MovieFan', avatar_url: null };
        break;
      }
      case 'is_admin': case 'is_nickname_taken': body = false; break;
      case 'get_leaderboard': body = [{ nickname: 'FilmExpert', best_score: 25, best_time: 82, updated_at: '2026-10-05T12:00:00Z' }]; break;
      case 'user_best': body = [{ category_id: 1, difficulty_level_id: 3, best_score: 12, best_time: 65, updated_at: '2026-10-05T12:00:00Z' }]; break;
      case 'get_game_question': {
        const payload = request.postDataJSON();
        body = [{ id: 999, answer_token: '00000000-0000-4000-8000-000000000999', image_url: 'https://quiz-fixture.supabase.co/fixture.svg', options_json: ['Fixture answer', 'Second answer', 'Third answer', 'Fourth answer'], category_id: payload.p_category_id, difficulty_level_id: payload.p_difficulty_id }];
        break;
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers, body: request.method() === 'HEAD' ? '' : JSON.stringify(body) });
  });
  await page.route('**/auth/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/fixture.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="#22232d"/></svg>' }));
  return calls;
}

export async function mockSignedIn(page: Page, owner = 'fixture-user') {
  const supabaseUrl = 'https://quiz-fixture.supabase.co';
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  const session = {
    access_token: `e30.${Buffer.from(JSON.stringify({ sub: owner, role: 'authenticated', exp: 4102444800 })).toString('base64url')}.fixture`,
    refresh_token: 'fixture-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800,
    user: { id: owner, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  };
  await page.addInitScript(({ storageKey, session }) => localStorage.setItem(storageKey, JSON.stringify(session)), { storageKey, session });
}
