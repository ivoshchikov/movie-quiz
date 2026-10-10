// An isolated PostgreSQL WASM database only; no credentials or network access.
// HQ_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test supabase/tests/admin_daily.test.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
let db, Client;
const nativeUrl = process.env.HQ_SQL_TEST_URL;
if (nativeUrl) {
  const url = new URL(nativeUrl);
  if (!['localhost','127.0.0.1'].includes(url.hostname) || url.pathname !== '/hardquiz_ui11_test') throw new Error('SQL tests require the isolated localhost hardquiz_ui11_test database');
  const pg = await import(process.env.HQ_NODE_PG_MODULE || 'pg');
  Client = pg.default.Client; pg.default.types.setTypeParser(20, Number);
  const connection = new Client({ connectionString: nativeUrl }); await connection.connect();
  db = { exec: sql => connection.query(sql), query: (sql,params) => connection.query(sql,params), close: () => connection.end() };
  const existing = await db.query("select to_regclass('public.daily_challenge') as existing");
  if (existing.rows[0].existing) throw new Error('SQL fixture database must be empty; no existing data will be removed');
} else {
  const { PGlite } = await import(process.env.HQ_PGLITE_MODULE || '@electric-sql/pglite');
  db = new PGlite();
}
const admin = '00000000-0000-0000-0000-000000000001';
const player = '00000000-0000-0000-0000-000000000002';
const migration = await readFile(new URL('../migrations/20261010200933_admin_daily_guard.sql', import.meta.url), 'utf8');
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table public.admin_users(user_id uuid primary key, created_at timestamptz not null default now());
  create table public.question(id integer primary key, image_url text, correct_answer text, options_json jsonb, category_id integer, difficulty_level_id integer);
  create table public.daily_challenge(d date primary key, question_id integer not null, category_id integer not null, difficulty_level_id integer not null, created_at timestamptz not null default now());
  create table public.daily_session(user_id uuid, d date, started_at timestamptz not null default now(), created_at timestamptz not null default now(), primary key(user_id,d));
  create table public.daily_result(user_id uuid, d date, is_correct boolean not null, time_spent integer not null, answered_at timestamptz not null default now(), primary key(user_id,d));
  alter table public.daily_session enable row level security; alter table public.daily_result enable row level security;
  create policy own_session on public.daily_session to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());
  create policy own_result on public.daily_result to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());
  grant usage on schema public,auth to anon,authenticated;
  grant all on all tables in schema public to anon,authenticated;
  insert into public.admin_users(user_id) values('${admin}');
  insert into public.question values(1,'one.jpg','One','["One","Two","Three","Four"]',1,1),(2,'two.jpg','Two','["One","Two","Three","Four"]',2,2),(3,'bad.jpg','Bad','["Bad","Bad","Third","Fourth"]',1,1),(4,'four.jpg','Four','["One","Two","Three","Four"]',1,1);
  create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()) $$;
  create function public.set_daily_question(p_date date,p_question_id integer) returns void language sql security definer as $$ insert into public.daily_challenge(d,question_id,category_id,difficulty_level_id) select p_date,id,category_id,difficulty_level_id from public.question where id=p_question_id on conflict(d) do update set question_id=excluded.question_id $$;
  create function public.get_daily_history_admin(p_limit integer default 30,p_offset integer default 0) returns table(d date,question_id integer,image_url text,correct_answer text,category_id integer,difficulty_level_id integer,total_answers integer,correct_answers integer,created_at timestamptz) language sql security definer as $$ select dc.d,q.id,q.image_url,q.correct_answer,q.category_id,q.difficulty_level_id,0,0,dc.created_at from public.daily_challenge dc join public.question q on q.id=dc.question_id $$;
  create function public.start_daily_session(p_user_id uuid,p_date date) returns timestamptz language plpgsql security definer as $$ declare v timestamptz; begin if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'uid mismatch'; end if; insert into public.daily_session(user_id,d) values(p_user_id,p_date) on conflict(user_id,d) do nothing; select started_at into v from public.daily_session where user_id=p_user_id and d=p_date; return v; end $$;
  create function public.submit_daily_result(p_user_id uuid,p_date date,p_is_correct boolean,p_time integer) returns void language plpgsql security definer as $$ declare uid uuid := auth.uid(); v_started timestamptz; v_elapsed int; begin if uid is null or p_user_id is not null and p_user_id<>uid then raise exception 'uid mismatch'; end if; select started_at into v_started from public.daily_session where user_id=uid and d=p_date; if v_started is null then v_started:=now(); insert into public.daily_session(user_id,d,started_at) values(uid,p_date,v_started) on conflict(user_id,d) do nothing; end if; v_elapsed:=greatest(1,round(extract(epoch from now()-v_started))::int); insert into public.daily_result(user_id,d,is_correct,time_spent) values(uid,p_date,p_is_correct,v_elapsed) on conflict(user_id,d) do nothing; end $$;
`);
await db.exec(migration);
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
const today = (await db.query("select (clock_timestamp() at time zone 'America/Chicago')::date::text as d")).rows[0].d;
const day = n => { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10); };
const read = async d => (await db.query('select * from public.get_daily_assignment_admin($1)',[d])).rows[0];
const source = async id => (await db.query('select image_url,correct_answer,options_json,category_id,difficulty_level_id from public.question where id=$1',[id])).rows[0] ?? {};
const save = async (d,id,expected=null,version=0,actor=admin,question=null) => (await db.query('select * from public.set_daily_question_admin($1,$2,$3,$4,$5,$6)',[d,id,expected,version,actor,JSON.stringify(question ?? await source(id))])).rows[0];
after(async () => db.close());

test('exact-date inspection is read only and returns an explicit unassigned date', async () => {
  assert.deepEqual(await read(day(1)),{d:new Date(`${day(1)}T00:00:00Z`),question_id:null,attempt_count:0,version:0});
  assert.equal((await db.query('select count(*)::int as n from public.daily_challenge')).rows[0].n,0);
});
test('new assignment, replacement and revision are confirmed; stale/ABA drafts fail', async () => {
  assert.equal((await save(day(2),1)).question_id,1);
  assert.equal((await save(day(2),2,1,0)).version,1);
  await assert.rejects(save(day(2),1,1,0),/assignment changed/);
  assert.equal((await save(day(2),1,2,1)).version,2);
  await assert.rejects(save(day(2),2,1,0),/assignment changed/);
});
test('past, missing and malformed questions fail without creating an assignment', async () => {
  await assert.rejects(save(day(-1),1),/Past/);
  await assert.rejects(save(day(3),999),/not found/);
  await assert.rejects(save(day(3),3),/Invalid question options/);
  assert.equal((await read(day(3))).question_id,null);
});
test('admin membership and the expected current account are enforced on the server', async () => {
  await assert.rejects(save(day(4),1,null,0,player),/account mismatch/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[player]);
  await assert.rejects(read(day(4)),/admin only/);
  await assert.rejects(save(day(4),1,null,0,player),/admin only/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
});
test('starting an attempt locks replacement even before an answer is submitted', async () => {
  await save(day(5),1);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[player]);
  await db.query('select public.start_daily_session($1,$2)',[player,day(5)]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
  assert.equal((await read(day(5))).attempt_count,1);
  await assert.rejects(save(day(5),2,1,0),/attempt has already started/);
  await assert.rejects(db.query('update public.daily_challenge set question_id=2 where d=$1',[day(5)]),/attempt has already started/);
});
test('fallback starts and direct session/result writes use the same date lock', async () => {
  await save(day(6),1);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[player]);
  await db.query('select public.submit_daily_result($1,$2,true,1)',[player,day(6)]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
  assert.equal((await read(day(6))).attempt_count,1); // Session and result are one player, not two attempts.
  await assert.rejects(save(day(6),2,1,0),/attempt has already started/);
  const triggers = await db.query("select count(*)::int as n from pg_trigger where tgname in ('hq_ui11_assignment_guard','hq_ui11_session_lock','hq_ui11_result_lock') and not tgisinternal");
  assert.equal(triggers.rows[0].n,3);
});
test('untrusted roles cannot use the blind writer, modify assignments, or grant themselves admin', async () => {
  const secured = await db.query("select count(*)::int as n from pg_class where oid in ('public.admin_users'::regclass,'public.daily_challenge'::regclass) and relrowsecurity");
  assert.equal(secured.rows[0].n,2);
  for (const role of ['anon','authenticated']) {
    assert.equal((await db.query("select has_function_privilege($1,'public.set_daily_question(date,integer)','EXECUTE') as allowed",[role])).rows[0].allowed,false);
    assert.equal((await db.query("select has_table_privilege($1,'public.admin_users','INSERT') as allowed",[role])).rows[0].allowed,false);
    assert.equal((await db.query("select has_table_privilege($1,'public.daily_challenge','UPDATE') as allowed",[role])).rows[0].allowed,false);
  }
  assert.equal((await db.query("select has_function_privilege('authenticated','public.set_daily_question_admin(date,integer,integer,bigint,uuid,jsonb)','EXECUTE') as allowed")).rows[0].allowed,true);
  assert.equal((await db.query("select has_function_privilege('anon','public.get_daily_assignment_admin(date)','EXECUTE') as allowed")).rows[0].allowed,false);
  await db.exec('set role anon');
  try {
    assert.equal((await db.query('select question_id from public.daily_challenge where d=$1',[day(2)])).rows.length,1);
    await assert.rejects(db.query('select * from public.admin_users'),/permission denied/);
  } finally { await db.exec('reset role'); }
  // RLS still protects membership if table privileges are accidentally restored.
  await db.exec('begin; grant select,insert on public.admin_users to authenticated; set local role authenticated');
  try {
    assert.equal((await db.query('select * from public.admin_users')).rows.length,0);
    await assert.rejects(db.query("insert into public.admin_users(user_id) values('00000000-0000-0000-0000-000000000003')"),/row-level security/);
  } finally { await db.exec('rollback'); }
});
test('history keeps missing source questions and paginates with correct statistics', async () => {
  await save(day(7),2); await db.exec('delete from public.question where id=2');
  const rows = (await db.query('select * from public.get_daily_history_admin(1,0)')).rows;
  assert.equal(rows.length,1); assert.equal(rows[0].question_id,2); assert.match(rows[0].correct_answer,/unavailable/);
  assert.equal(rows[0].image_url,''); assert.equal(rows[0].category_id,2);
  const result = (await db.query('select * from public.get_daily_history_admin(20,0)')).rows.find(row => row.question_id===1 && row.total_answers===1);
  assert.equal(result.correct_answers,1);
});
test('migration is rerunnable without removing assignments or resetting revisions', async () => {
  const before = await read(day(2)); await db.exec(migration); assert.deepEqual(await read(day(2)),before);
});
test('repeatable-read changes fail closed instead of using stale attempt snapshots', async () => {
  await db.exec('begin isolation level repeatable read');
  try { await assert.rejects(save(day(8),1),/READ COMMITTED/); } finally { await db.exec('rollback'); }
});

test('question edits after preview are rejected in the same locked server transaction', async () => {
  const captured = await source(1);
  await db.query("update public.question set image_url='changed.jpg' where id=1");
  await assert.rejects(save(day(9),1,null,0,admin,captured),/changed since preview/);
  assert.equal((await read(day(9))).question_id,null);
});
test('read-only installation verification reports the compatible contract and effective rights', async () => {
  const sql = await readFile(new URL('../UI11-verify.sql',import.meta.url),'utf8');
  const status = (await db.query(sql)).rows[0].ui11_status;
  assert.equal(status.ready,true);
});

async function connectAs(uid) {
  const client = new Client({ connectionString: nativeUrl }); await client.connect();
  await client.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]); return client;
}
async function waiting(pid) {
  const until = Date.now() + 5000;
  while (Date.now() < until) {
    const row = (await db.query("select wait_event from pg_stat_activity where pid=$1",[pid])).rows[0];
    if (row?.wait_event === 'advisory') return;
    await new Promise(resolve => setTimeout(resolve,25));
  }
  throw new Error('Expected a second real transaction to wait on the Daily advisory lock');
}
const guardedSql = 'select * from public.set_daily_question_admin($1,$2,$3,$4,$5,$6)';
test('concurrency: an uncommitted start blocks replacement; committing the start rejects it', {skip:!nativeUrl}, async () => {
  const d=day(10); await save(d,1); const captured=await source(4);
  const session=await connectAs(player), writer=await connectAs(admin);
  try {
    await session.query('begin'); await session.query('select public.start_daily_session($1,$2)',[player,d]);
    const result=writer.query(guardedSql,[d,4,1,0,admin,JSON.stringify(captured)]).then(value=>({value}),error=>({error}));
    await waiting(writer.processID); await session.query('commit');
    const outcome=await result; assert.match(outcome.error?.message ?? '',/attempt has already started/);
    assert.equal((await read(d)).question_id,1); assert.equal((await read(d)).attempt_count,1);
  } finally { await session.query('rollback'); await writer.query('rollback'); await session.end(); await writer.end(); }
});
test('concurrency: an uncommitted replacement blocks the next start until commit', {skip:!nativeUrl}, async () => {
  const d=day(11); await save(d,1); const captured=await source(4);
  const writer=await connectAs(admin), session=await connectAs(player);
  try {
    await writer.query('begin'); await writer.query(guardedSql,[d,4,1,0,admin,JSON.stringify(captured)]);
    const result=session.query('select public.start_daily_session($1,$2)',[player,d]);
    await waiting(session.processID); await writer.query('commit'); await result;
    assert.equal((await read(d)).question_id,4); assert.equal((await read(d)).attempt_count,1);
    await assert.rejects(save(d,1,4,1),/attempt has already started/);
  } finally { await writer.query('rollback'); await session.query('rollback'); await writer.end(); await session.end(); }
});
test('concurrency: two writers for an initially unassigned date cannot overwrite each other', {skip:!nativeUrl}, async () => {
  const d=day(12), first=await connectAs(admin), second=await connectAs(admin);
  try {
    await first.query('begin'); await first.query(guardedSql,[d,1,null,0,admin,JSON.stringify(await source(1))]);
    const result=second.query(guardedSql,[d,4,null,0,admin,JSON.stringify(await source(4))]).then(value=>({value}),error=>({error}));
    await waiting(second.processID); await first.query('commit');
    const outcome=await result; assert.match(outcome.error?.message ?? '',/assignment changed/);
    assert.equal((await read(d)).question_id,1);
  } finally { await first.query('rollback'); await second.query('rollback'); await first.end(); await second.end(); }
});
