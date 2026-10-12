import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';

let db;
const native = process.env.HQ_SQL_TEST_URL;
if (native) {
  const url = new URL(native);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/hardquiz_streak_test') throw Error('Only the isolated localhost streak test database is allowed.');
  const pg = await import(process.env.HQ_NODE_PG_MODULE || 'pg');
  const client = new pg.default.Client({ connectionString: native });
  await client.connect();
  db = { exec: sql => client.query(sql), query: (sql, args) => client.query(sql, args), close: () => client.end() };
  if ((await db.query("select to_regclass('public.daily_result') as existing")).rows[0].existing) throw Error('Streak SQL fixture must be empty.');
} else {
  const { PGlite } = await import(process.env.HQ_PGLITE_MODULE || '@electric-sql/pglite');
  db = new PGlite();
}
after(() => db.close());
const owner = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
await db.exec(`
  create role anon; create role authenticated;
  create table public.daily_result(user_id uuid, d date, is_correct boolean, primary key(user_id,d));
  create function public.us_central_today() returns date language sql stable as
    $$ select (current_setting('hq.test_now')::timestamptz at time zone 'America/Chicago')::date $$;
  create function public.get_daily_user_streak(p_user_id uuid)
    returns table(user_id uuid,current_streak integer,longest_streak integer,total_correct integer,last_played date,last_correct date)
    language sql stable security definer set search_path = public as
    $$ select p_user_id,0,0,0,null::date,null::date $$;
  grant execute on function public.get_daily_user_streak(uuid) to anon,authenticated;
`);
const before = (await db.query("select proacl::text as acl from pg_proc where oid='public.get_daily_user_streak(uuid)'::regprocedure")).rows[0].acl;
const migration = await readFile(new URL('../migrations/20261012182356_daily_streak_pending_day.sql', import.meta.url), 'utf8');
await db.exec(migration);
const now = value => db.query("select set_config('hq.test_now',$1,false)", [value]);
const stats = async (user = owner) => (await db.query('select * from public.get_daily_user_streak($1)', [user])).rows[0];
async function reset(value = '2026-10-12T17:00:00Z') { await db.exec('truncate public.daily_result'); await now(value); }
async function seed(offsets, correct = true, user = owner) {
  for (const offset of offsets) await db.query('insert into public.daily_result values($1,public.us_central_today()+$2::integer,$3)', [user, offset, correct]);
}

test('no answers returns real zeroes and null dates', async () => {
  await reset();
  assert.deepEqual(await stats(), { user_id: owner, current_streak: 0, longest_streak: 0, total_correct: 0, last_played: null, last_correct: null });
});
test('four correct days through yesterday remain current before answering today', async () => {
  await reset(); await seed([-4, -3, -2, -1]);
  const row = await stats();
  assert.equal(row.current_streak, 4); assert.equal(row.longest_streak, 4); assert.equal(row.total_correct, 4);
});
test('a correct answer today extends the pending streak', async () => {
  await reset(); await seed([-4, -3, -2, -1, 0]);
  const row = await stats(); assert.equal(row.current_streak, 5); assert.equal(row.longest_streak, 5);
});
test('a wrong answer today immediately breaks yesterday\'s streak', async () => {
  await reset(); await seed([-4, -3, -2, -1]); await seed([0], false);
  const row = await stats(); assert.equal(row.current_streak, 0); assert.equal(row.longest_streak, 4); assert.equal(row.total_correct, 4);
});
test('a missed yesterday breaks the streak', async () => {
  await reset(); await seed([-5, -4, -3, -2]);
  assert.equal((await stats()).current_streak, 0);
});
test('a wrong yesterday never revives an older streak', async () => {
  await reset(); await seed([-5, -4, -3, -2]); await seed([-1], false);
  assert.equal((await stats()).current_streak, 0);
});
test('a new correct answer after a gap starts at one and retains the historical best', async () => {
  await reset(); await seed([-6, -5, -4, -3, 0]);
  const row = await stats(); assert.equal(row.current_streak, 1); assert.equal(row.longest_streak, 4); assert.equal(row.total_correct, 5);
});
test('the current streak can be shorter than the historical best', async () => {
  await reset(); await seed([-10, -9, -8, -7, -6, -2, -1]);
  const row = await stats(); assert.equal(row.current_streak, 2); assert.equal(row.longest_streak, 5);
});
test('another player\'s answer does not break this player\'s pending streak', async () => {
  await reset(); await seed([-4, -3, -2, -1]); await seed([0], false, other);
  assert.equal((await stats()).current_streak, 4); assert.equal((await stats(other)).current_streak, 0);
});
test('consecutive dates work across leap-day and month boundaries', async () => {
  await reset('2028-03-01T17:00:00Z'); await seed([-4, -3, -2, -1]);
  assert.equal((await stats()).current_streak, 4);
});
for (const [label, end, boundary, pendingEnd, missed] of [
  ['Chicago midnight', '2026-10-13T04:59:59Z', '2026-10-13T05:00:00Z', '2026-10-14T04:59:59Z', '2026-10-14T05:00:00Z'],
  ['spring DST', '2026-03-08T05:59:59Z', '2026-03-08T06:00:00Z', '2026-03-09T04:59:59Z', '2026-03-09T05:00:00Z'],
  ['autumn DST', '2026-11-01T04:59:59Z', '2026-11-01T05:00:00Z', '2026-11-02T05:59:59Z', '2026-11-02T06:00:00Z'],
]) test(`${label}: keep the streak throughout the pending day, break only after a missed day`, async () => {
  await reset(end); await seed([-3, -2, -1, 0]);
  assert.equal((await stats()).current_streak, 4);
  await now(boundary); assert.equal((await stats()).current_streak, 4);
  await now(pendingEnd); assert.equal((await stats()).current_streak, 4);
  await now(missed); assert.equal((await stats()).current_streak, 0);
});
test('replacement preserves the RPC contract and privileges and is safe to reapply', async () => {
  await db.exec(migration);
  const row = (await db.query("select proacl::text as acl,proconfig from pg_proc where oid='public.get_daily_user_streak(uuid)'::regprocedure")).rows[0];
  assert.equal(row.acl, before); assert.deepEqual(row.proconfig, ['search_path=pg_catalog']);
});
