import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
let db, Client;
const native = process.env.HQ_SQL_TEST_URL;
if (native) {
  const url = new URL(native);
  if (!['localhost','127.0.0.1'].includes(url.hostname) || url.pathname !== '/hardquiz_gameplay_test') throw Error('Only the isolated localhost gameplay database is allowed');
  const pg = await import(process.env.HQ_NODE_PG_MODULE || 'pg'); Client = pg.default.Client; pg.default.types.setTypeParser(20, Number);
  const c = new Client({ connectionString: native }); await c.connect();
  db = { exec: s => c.query(s), query: (s,p) => c.query(s,p), close: () => c.end() };
  if ((await db.query("select to_regclass('public.question') q")).rows[0].q) throw Error('Gameplay fixture must be empty');
} else {
  const { PGlite } = await import(process.env.HQ_PGLITE_MODULE || '@electric-sql/pglite'); db = new PGlite();
}
after(() => db.close());
await db.exec(await readFile(new URL('./fixtures/gameplay.sql', import.meta.url),'utf8'));
if (native) await db.exec('create extension pgcrypto with schema extensions');
else await db.exec("create function extensions.gen_random_bytes(n integer) returns bytea language sql as $$select decode(repeat('ab',n),'hex')$$");
await db.exec(`create schema if not exists hq_private; create table hq_private.test_clock_state(at timestamptz); insert into hq_private.test_clock_state values(null); create function hq_private.test_clock() returns timestamptz language sql volatile as $$select coalesce((select at from hq_private.test_clock_state),clock_timestamp())$$;`);
for (const file of ['20261010200933_admin_daily_guard','20261011145955_admin_question_bank','20261011161955_question_privacy','20261011170955_question_edit_delete','20261015211558_authoritative_gameplay']) {
  if (file.endsWith('authoritative_gameplay')) await db.exec(await readFile(new URL('./fixtures/gameplay-legacy.sql',import.meta.url),'utf8'));
  await db.exec('begin');
  try { await db.exec((await readFile(new URL(`../migrations/${file}.sql`,import.meta.url),'utf8')).replaceAll('clock_timestamp()', 'hq_private.test_clock()')); await db.exec('commit'); }
  catch(e) { await db.exec('rollback'); throw e; }
}
const player='00000000-0000-0000-0000-000000000002', other='00000000-0000-0000-0000-000000000003';
const uid = id => db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);
const value = async (s,p) => (await db.query(s,p)).rows[0].v;
const start = async (category=1,diff=1,id=randomUUID()) => value('select public.quiz_start($1,$2,$3) v',[id,category,diff]);
const next = id => value('select public.quiz_next($1) v',[id]);
const answer = (g,a) => value('select public.quiz_answer($1,$2,$3) v',[g.id,g.round.id,a]);
const finish = id => value('select public.quiz_finish($1) v',[id]);
async function reset() {
  await db.exec('truncate hq_private.answer_events,hq_private.question_metrics,hq_private.game_sessions cascade; truncate public.user_best,public.question_stats,public.daily_result,public.daily_session;');
  await uid(player);
}
test('server snapshots a bank, issues one timed round and never returns correct answers or future rounds',async()=>{
  await reset(); const s=await start(); assert.equal(s.round,null); assert.equal(s.bank_size,1);
  const g=await next(s.id); assert.equal(g.round.question_id,1); assert.equal(g.lives,3);
  assert.equal(Date.parse(g.round.deadline_at)-Date.parse(g.round.issued_at),30000);
  assert.equal(JSON.stringify(g).includes('correct_answer'),false);
  assert.deepEqual((await next(s.id)).round,g.round);
  await db.exec("update public.question set correct_answer='Two',options_json='[\"Two\",\"One\",\"Three\",\"Four\"]' where id=1");
  const done=await answer(g,'One'); assert.equal(done.score,1); assert.equal(done.status,'finished'); assert.equal(done.finish_reason,'completed');
  const retry=await answer(g,'One'); assert.equal(retry.score,1); assert.equal(await value('select count(*) v from hq_private.answer_events'),1);
  await assert.rejects(answer(g,'Two'),/already accepted/);
  await db.exec("update public.question set correct_answer='One',options_json='[\"One\",\"Two\",\"Three\",\"Four\"]' where id=1");
});
test('foreign accounts cannot read, answer, finish or reuse another player session',async()=>{
  await reset(); const s=await start();const g=await next(s.id); await uid(other);
  for (const work of [()=>next(s.id),()=>answer(g,'One'),()=>finish(s.id),()=>start(1,1,s.id)]) await assert.rejects(work(),/unavailable|nickname/);
  await uid(null); await assert.rejects(next(s.id),/unavailable/);
});
test('guests use unguessable capabilities, cannot promote a run to a ranked account',async()=>{
  await reset();await uid(null);const g=await next((await start()).id);const done=await answer(g,'One');assert.equal(done.score,1);
  assert.equal(await value('select count(*) v from public.user_best'),0);await uid(player);await assert.rejects(finish(g.id),/unavailable/);
});
test('early timeout reports spend no life; actual deadline is exclusive and late answers are timeouts',async()=>{
  await reset();const g=await next((await start()).id);assert.equal((await answer(g,null)).lives,3);
  await db.query("update hq_private.game_rounds set deadline_at=clock_timestamp()-interval '1 millisecond' where id=$1",[g.round.id]);
  const late=await answer(g,'One'); assert.equal(late.score,0);assert.equal(late.lives,2);assert.equal(late.round.outcome,'timeout');
  assert.equal((await answer(g,'Two')).lives,2);assert.equal(await value('select count(*) v from hq_private.answer_events'),1);
  assert.equal(await value('select count(*) v from public.question_stats'),0);
});
test('voluntary exit counts the issued unanswered round as abandoned and retries cannot improve its time',async()=>{
  await reset();const g=await next((await start()).id);const done=await finish(g.id);assert.equal(done.finish_reason,'exit');assert.equal(done.score,0);
  assert.equal(done.round.outcome,'abandoned');const retry=await finish(g.id);assert.equal(retry.time_secs,done.time_secs);
  await assert.rejects(answer(g,'One'),/finished/);
  assert.equal(await value("select abandoned v from hq_private.question_metrics where question_id=1"),1);
});
test('a new ranked run closes the previous one; replaying start is idempotent and cannot reset clocks',async()=>{
  await reset();const a=await next((await start()).id);const b=await start();assert.equal((await finish(a.id)).status,'finished');
  assert.equal(await value("select count(*) v from hq_private.game_sessions where owner=$1 and finished_at is null",[player]),1);
  assert.equal((await start(1,1,b.id)).started_at,b.started_at);
  await assert.rejects(start(2,1,b.id),/unavailable/);
});
test('legacy aggregate writes, direct seed mutations and raw answer access are all closed',async()=>{
  await reset();
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    try {
      for (const sql of ["select public.upsert_user_best('00000000-0000-0000-0000-000000000002',1,1,999999,0)",
        'select public.get_game_question(array[]::int[],1,1)','select public.answer_game_question(gen_random_uuid(),\'One\')',
        'select * from public.get_daily_question_public(current_date)','select public.start_daily_session(auth.uid(),current_date)',
        'select * from hq_private.game_rounds','select * from hq_private.answer_events',
        "insert into public.leaderboard_seed(nickname) values('Cheater')", "update public.user_best set best_score=1000"])
        await assert.rejects(db.query(sql),/permission denied/);
    } finally { await db.exec('reset role'); }
  }
});
test('Daily introduction reveals no content, atomic start resumes the original server timestamp and shuffled options',async()=>{
  await reset();const status=await value('select public.daily_status() v');assert.equal(status.question,undefined);assert.equal(status.started_at,null);
  const begun=await value('select public.daily_begin($1) v',[status.date]);assert.ok(begun.question);assert.equal(begun.question.correct_answer,undefined);
  const again=await value('select public.daily_begin($1) v',[status.date]);assert.equal(again.started_at,begun.started_at);assert.deepEqual(again.question,begun.question);
  assert.equal((await value('select public.daily_status() v')).question,undefined);
});
test('Daily rejects yesterday and tomorrow for starts and answers; old saved receipts remain readable',async()=>{
  await reset();const d=await value("select public.us_central_today()::text v");
  for (const offset of [-1,1]) {
    await assert.rejects(db.query('select public.daily_begin($1::date+$2::int)',[d,offset]),/expired/);
    await assert.rejects(db.query('select public.submit_daily_answer($1,$2::date+$3::int,\'One\',0)',[player,d,offset]),/expired/);
  }
  await db.query("insert into public.daily_result(user_id,d,is_correct,time_spent) values($1,$2::date-1,true,7)",[player,d]);
  assert.equal((await db.query('select * from public.get_my_daily_result($1,$2::date-1)',[player,d])).rows[0].time_spent,7);
});
test('Daily measures time on the server, first accepted answer wins and statistics increment only once',async()=>{
  await reset();const status=await value('select public.daily_status() v');const begun=await value('select public.daily_begin($1) v',[status.date]);
  const correct=await value('select correct_answer v from hq_private.daily_questions where d=$1',[status.date]);
  await db.query("update public.daily_session set started_at=clock_timestamp()-interval '9 seconds' where user_id=$1",[player]);
  const submit=a=>db.query('select public.submit_daily_answer($1,$2,$3,-999)',[player,status.date,a]);
  await submit(correct); await submit(begun.question.options.find(x=>x!==correct));
  const r=(await db.query('select * from public.daily_result where user_id=$1',[player])).rows[0];assert.equal(r.is_correct,true);assert.ok(r.time_spent>=9);
  assert.equal(await value('select count(*) v from hq_private.answer_events'),1);assert.equal(await value('select total_attempts v from public.question_stats'),1);
  assert.equal((await value('select public.daily_status() v')).question,undefined);
});
test('rank is computed across everyone, lower time wins equal points, only top plus caller is returned; seeds never enter',async()=>{
  await reset();
  for(let i=1;i<=30;i++) await db.query("insert into public.user_best values($1,1,1,10,$2,clock_timestamp())",[`10000000-0000-0000-0000-${String(i).padStart(12,'0')}`,i]);
  await db.query('insert into public.user_best values($1,1,1,10,99,clock_timestamp())',[player]);
  await db.exec("insert into public.leaderboard_seed values('Fake',1,1,9999,0,now())");
  const board=await value('select public.quiz_leaderboard(1,1,5) v');assert.equal(board.total,31);assert.equal(board.top.length,5);assert.equal(board.me.rank,31);assert.equal(board.top[0].best_time,1);
  assert.deepEqual((await value('select public.quiz_leaderboard(1,1,5) v')).top,board.top);
});
test('question #175 has weight 0.1 and is excluded from random Daily; weighted permutation contains every valid question once',async()=>{
  await reset(); assert.equal(Number(await value('select selection_weight v from public.question where id=175')),0.1);
  assert.equal(await value('select daily_eligible v from public.question where id=175'),false);
  await db.exec("update public.question set options_json='[\"One\",\"Two\",\"Three\",\"Four\"]' where id=175");
  const g=await start(2,1);assert.equal(g.bank_size,2);
  assert.equal(await value('select count(distinct question_id) v from hq_private.game_rounds where session_id=$1',[g.id]),2);
});
test('profile stats split outcomes, never expose question content and include a result-only Daily calendar',async()=>{
  await reset();const g=await next((await start()).id);await answer(g,'Two');await finish(g.id);
  const stats=await value('select public.my_game_stats() v');assert.equal(stats.normal.games,1);assert.equal(stats.normal.wrong,1);assert.equal(stats.normal.correct,0);
  assert.equal(stats.daily_calendar.length,30);assert.equal(JSON.stringify(stats).includes('correct_answer'),false);assert.equal(JSON.stringify(stats).includes('image_url'),false);
  await uid(null);await assert.rejects(value('select public.my_game_stats() v'),/Log in/);
});
test('real simultaneous answers and finish preserve exactly one accepted answer',{skip:!native},async()=>{
  await reset();const g=await next((await start()).id);const a=new Client({connectionString:native}),b=new Client({connectionString:native});await a.connect();await b.connect();
  try {
    for(const c of [a,b]) await c.query("select set_config('request.jwt.claim.sub',$1,false)",[player]);
    const results=await Promise.all([a.query('select public.quiz_answer($1,$2,\'One\') v',[g.id,g.round.id]),b.query('select public.quiz_answer($1,$2,\'One\') v',[g.id,g.round.id])]);
    assert.equal(results[0].rows[0].v.score,1);assert.equal(results[1].rows[0].v.score,1);
    assert.equal(await value('select count(*) v from hq_private.answer_events'),1);
    const saved=await Promise.all([a.query('select public.quiz_finish($1) v',[g.id]),b.query('select public.quiz_finish($1) v',[g.id])]);assert.equal(saved[0].rows[0].v.time_secs,saved[1].rows[0].v.time_secs);
  } finally {await a.end();await b.end();}
});

const setTime = at => db.query('update hq_private.test_clock_state set at=$1',[at]);
for (const [before,cutoff] of [
 ['2026-10-16T04:59:59.999Z','2026-10-16T05:00:00Z'],
 ['2026-03-09T04:59:59.999Z','2026-03-09T05:00:00Z'],
 ['2026-11-02T05:59:59.999Z','2026-11-02T06:00:00Z'],
]) test(`Chicago cutoff is exclusive, including DST: ${cutoff}`,async()=>{
 await reset();try {
  await setTime(before);const status=await value('select public.daily_status() v');assert.equal(Date.parse(status.closes_at),Date.parse(cutoff));
  const begun=await value('select public.daily_begin($1) v',[status.date]);assert.ok(begun.question);
  await setTime(cutoff);
  await assert.rejects(value('select public.daily_begin($1) v',[status.date]),/expired/);
  await assert.rejects(db.query('select public.submit_daily_answer($1,$2,$3,1)',[player,status.date,begun.question.options[0]]),/expired/);
  assert.equal(await value('select count(*) v from public.daily_result'),0);
  assert.notEqual((await value('select public.daily_status() v')).date,status.date);
 } finally {await setTime(null);}
});
test('server enforces feedback delay; clients cannot skip animations to improve ranked time',async()=>{
 await reset();try {
  await db.exec("insert into public.question(id,image_url,correct_answer,options_json,category_id,difficulty_level_id) values(500,'extra.webp','One','[\"One\",\"Two\",\"Three\",\"Four\"]',1,1)");
  await setTime('2026-10-15T18:00:00Z');const g=await next((await start()).id);await answer(g,'One');
  assert.equal((await next(g.id)).round.id,g.round.id);
  await setTime('2026-10-15T18:00:00.899Z');assert.equal((await next(g.id)).round.id,g.round.id);
  await setTime('2026-10-15T18:00:00.900Z');assert.equal((await next(g.id)).round.number,2);
 } finally {await setTime(null);await db.exec('delete from public.question where id=500');}
});
test('weighted draws reduce #175 relative to each ordinary question, without removing it from the bank',async()=>{
 await reset();await uid(null);let first=0;
 for(let i=0;i<250;i++) {const g=await start(2,1);if((await next(g.id)).round.question_id===175)first++;}
 assert.ok(first>=5 && first<=45,`weighted first draws: ${first}/250`);
});
test('a transaction waiting over midnight uses the clock after the lock, not its transaction start',{skip:!native},async()=>{
 await reset();const a=new Client({connectionString:native}),b=new Client({connectionString:native});await a.connect();await b.connect();
 try {
  await setTime('2026-10-16T04:59:59.999Z');const d=(await value('select public.daily_status() v')).date;
  await a.query('begin');await a.query('select public.hq_lock_daily_date($1)',[d]);
  await b.query("select set_config('request.jwt.claim.sub',$1,false)",[player]);
  const pending=b.query('select public.daily_begin($1) v',[d]);
  // Poll the database lock state, not an arbitrary sleep, to prove the request is queued.
  for(let i=0;i<100;i++) {const waiting=await value("select count(*) v from pg_stat_activity where wait_event='advisory' and query like 'select public.daily_begin%'");if(waiting)break;if(i===99)throw Error('Daily request did not wait for its lock');await new Promise(r=>setTimeout(r,10));}
  await setTime('2026-10-16T05:00:00Z');await a.query('commit');await assert.rejects(pending,/expired/);
  assert.equal(await value('select count(*) v from public.daily_session'),0);
 } finally {await a.query('rollback');await a.end();await b.end();await setTime(null);}
});

test('authenticated RPC grants work while protected table writes and private helpers stay closed',async()=>{
 await reset();await db.exec('set role authenticated');
 try {const s=await start();assert.equal((await next(s.id)).round.number,1);await finish(s.id);
  await assert.rejects(db.query('select hq_private.prune_gameplay()'),/permission denied/);
  await assert.rejects(db.query('select * from public.daily_session'),/permission denied/);
  await assert.rejects(db.query('select * from public.daily_challenge'),/permission denied/);
 } finally {await db.exec('reset role');}
});
test('nicknames are immutable and case-insensitively unique; a delete cannot bypass immutability',async()=>{
 await reset();await assert.rejects(db.query("update public.profiles set nickname='Renamed' where user_id=$1",[player]),/cannot be changed/);
 await assert.rejects(db.query("insert into public.profiles(user_id,nickname) values($1,' player ')",[other]),/duplicate key/);
 await db.exec('set role authenticated');try {await assert.rejects(db.query('delete from public.profiles where user_id=$1',[player]),/permission denied/);}finally {await db.exec('reset role');}
});
test('empty banks do not create competitive records and bounded retention keeps account statistics',async()=>{
 await reset();const empty=await start(4,1);assert.equal(empty.bank_size,0);assert.equal(await value('select count(*) v from public.user_best'),0);
 const g=await next((await start()).id);await answer(g,'One');
 await db.query("update hq_private.game_sessions set finished_at=clock_timestamp()-interval '31 days' where id=$1",[g.id]);
 await db.exec('select hq_private.prune_gameplay()');assert.equal(await value('select count(*) v from hq_private.game_rounds where session_id=$1',[g.id]),0);
 const receipt=await finish(g.id);assert.equal(receipt.score,1);assert.equal(receipt.round,null);assert.equal((await value('select public.my_game_stats() v')).normal.correct,1);
});
