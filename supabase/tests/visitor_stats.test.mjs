import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';

let db, Client;
const native = process.env.HQ_TRAFFIC_TEST_URL;
if (native) {
  const url = new URL(native);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/hardquiz_traffic_test') throw Error('Only the isolated localhost traffic database is allowed.');
  const pg = await import(process.env.HQ_NODE_PG_MODULE || 'pg');
  Client = pg.default.Client;
  const client = new Client({ connectionString: native });
  await client.connect();
  db = { exec: s => client.query(s), query: (s, p) => client.query(s, p), close: () => client.end() };
  if ((await db.query("select to_regclass('hq_private.site_visit_days') as existing")).rows[0].existing) throw Error('Traffic test database must be empty.');
} else {
  const { PGlite } = await import(process.env.HQ_PGLITE_MODULE || '@electric-sql/pglite');
  db = new PGlite();
}
after(() => db.close());
const owner = '112743d7-f683-4bbb-8117-068e89a00f22';
const player = '00000000-0000-4000-8000-000000000002';
const visitor = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema hq_private;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema public,auth to anon,authenticated,service_role;
  create table public.admin_users(user_id uuid primary key);
  insert into public.admin_users values('${owner}');
  create function public.is_admin() returns boolean language sql security definer set search_path=pg_catalog
    as $$select auth.uid()='${owner}'::uuid and exists(select 1 from public.admin_users where user_id=auth.uid())$$;
  create function hq_private.traffic_test_now() returns timestamptz language sql as $$select current_setting('hq.test_now')::timestamptz$$;
  select set_config('hq.test_now','2026-11-01T18:00:00Z',false);
`);
// Replace only the clock in the isolated fixture; production has no client/test clock input.
const source = await readFile(new URL('../migrations/20261101174455_admin_visitor_stats.sql', import.meta.url), 'utf8');
await db.exec(source.replaceAll('clock_timestamp()', 'hq_private.traffic_test_now()'));
const pageViewSource = await readFile(new URL('../migrations/20261101212340_admin_page_views.sql', import.meta.url), 'utf8');
await db.exec(pageViewSource.replaceAll('clock_timestamp()', 'hq_private.traffic_test_now()'));
const scalar = async (sql, args) => (await db.query(sql, args)).rows[0].v;
const uid = id => db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
const clock = at => db.query("select set_config('hq.test_now',$1,false)", [at]);
const beat = id => db.query('select public.site_visit_heartbeat($1)', [visitor(id)]);
const stats = (id = owner) => scalar('select public.admin_visitor_stats($1) v', [id]);
async function reset(at = '2026-11-01T18:00:00Z') {
  await db.exec('truncate hq_private.site_visit_days,hq_private.site_visit_exclusions,hq_private.site_page_views');
  await uid(null); await clock(at);
  await db.exec("update hq_private.site_traffic_settings set started_at=hq_private.traffic_test_now()-interval '35 days', page_views_started_at=hq_private.traffic_test_now()-interval '1 hour'");
}
async function read() { await uid(owner); return stats(); }
async function seed(id, daysAgo, secondsAgo = 1000) {
  await db.query(`insert into hq_private.site_visit_days values(
    (hq_private.traffic_test_now() at time zone 'America/Chicago')::date-$1::integer,$2,
    hq_private.traffic_test_now()-($3::text||' seconds')::interval)`, [daysAgo, visitor(id), secondsAgo]);
}
async function asRole(role, work) {
  await db.exec(`set role ${role}`);
  try { return await work(); } finally { await db.exec('reset role'); }
}

test('empty, confirmed data returns zero counts and the collection start', async () => {
  await reset(); const row = await read();
  assert.equal(row.online, 0); assert.equal(row.today, 0); assert.equal(row.week, 0); assert.equal(row.month, 0);
  assert.equal(row.date, '2026-11-01'); assert.equal(row.timezone, 'America/Chicago'); assert.ok(row.since && row.updated_at);
});
test('guests and players can ingest but cannot read the private aggregate or tables', async () => {
  await reset();
  for (const [role, id, n] of [['anon', null, 1], ['authenticated', player, 2]]) {
    await uid(id);
    await asRole(role, async () => {
      await beat(n);
      await assert.rejects(stats(owner), /permission denied|Administrator/);
      if (id) await assert.rejects(stats(id), /Administrator/);
      for (const name of ['site_visit_days', 'site_visit_exclusions', 'site_traffic_settings']) {
        await assert.rejects(db.query(`select * from hq_private.${name}`), /permission denied/);
      }
      await assert.rejects(db.query('select hq_private.prune_site_visits()'), /permission denied/);
    });
  }
  assert.equal((await read()).today, 2);
});
test('owner RPC checks both verified account and admin membership, including the expected account', async () => {
  await reset(); await uid(owner);
  await asRole('authenticated', async () => {
    assert.equal((await stats()).month, 0);
    await assert.rejects(stats(player), /Administrator/);
    await assert.rejects(stats(null), /Administrator/);
  });
  await db.query('delete from public.admin_users where user_id=$1', [owner]);
  try { await assert.rejects(stats(), /Administrator/); }
  finally { await db.query('insert into public.admin_users values($1)', [owner]); }
});
test('repeat heartbeats and tabs count once; writes are throttled for 45 seconds', async () => {
  await reset(); await beat(1);
  const first = await scalar('select last_seen::text v from hq_private.site_visit_days');
  await clock('2026-11-01T18:00:20Z'); await beat(1);
  assert.equal(await scalar('select last_seen::text v from hq_private.site_visit_days'), first);
  await clock('2026-11-01T18:00:46Z'); await beat(1);
  assert.notEqual(await scalar('select last_seen::text v from hq_private.site_visit_days'), first);
  assert.equal((await read()).today, 1);
});
test('owner never increases counts and removes earlier guest activity from the same browser', async () => {
  await reset(); await beat(1); await beat(2);
  await uid(owner); await beat(1); await beat(3);
  assert.equal((await stats()).today, 1);
  await uid(null); await beat(1); await beat(3);
  assert.equal((await read()).today, 1);
});
test('a player cannot impersonate the owner or exclude another visitor', async () => {
  await reset(); await uid(player); await beat(1);
  assert.equal(await scalar('select count(*)::integer v from hq_private.site_visit_exclusions'), 0);
  assert.equal((await read()).today, 1);
});
test('weekly and monthly uniques are distinct visitors, never the sum of daily counts', async () => {
  await reset();
  for (const [id, days] of [[1,0],[1,1],[1,6],[2,6],[3,7],[4,29],[5,30],[6,34]]) await seed(id, days);
  const row = await read(); assert.equal(row.today, 1); assert.equal(row.week, 2); assert.equal(row.month, 4);
});
test('online expires at two minutes independently from daily visitor counts', async () => {
  await reset(); await seed(1,0,119); await seed(2,0,120); await seed(3,0,121);
  assert.equal((await read()).online, 1); assert.equal((await stats()).today, 3);
});
test('online across Chicago midnight is deduplicated and a new day does not inflate monthly uniques', async () => {
  await reset('2026-11-02T05:59:30Z'); await beat(1);
  await clock('2026-11-02T06:00:10Z');
  let row = await read(); assert.equal(row.date,'2026-11-02'); assert.equal(row.today,0); assert.equal(row.online,1);
  await uid(null); await beat(1); row=await read();
  assert.equal(row.online,1); assert.equal(row.today,1); assert.equal(row.week,1); assert.equal(row.month,1);
});
for (const [before, after] of [
  ['2026-03-08T07:59:00Z','2026-03-08T08:01:00Z'],
  ['2026-11-01T06:59:00Z','2026-11-01T07:01:00Z'],
]) test(`Chicago DST does not create a second visit day: ${before}`, async () => {
  await reset(before); await beat(1); const d=(await read()).date;
  await uid(null); await clock(after); await beat(1);
  const row=await read(); assert.equal(row.date,d); assert.equal(row.today,1); assert.equal(row.month,1);
});
test('invalid identifiers cannot create rows or override server dates', async () => {
  await reset();
  for (const value of [null, '00000000-0000-0000-0000-000000000000', owner.replace('-4bbb-', '-5bbb-')]) {
    await assert.rejects(db.query('select public.site_visit_heartbeat($1)', [value]), /Invalid visitor/);
  }
  assert.equal((await read()).month,0);
});
test('retention removes only data older than 35 Chicago dates and expired exclusions', async () => {
  await reset(); await seed(1,29); await seed(2,34); await seed(3,35);
  await db.query("insert into hq_private.site_visit_exclusions values($1,hq_private.traffic_test_now()-interval '36 days'),($2,hq_private.traffic_test_now())",[visitor(4),visitor(5)]);
  await db.exec('select hq_private.prune_site_visits()');
  assert.equal(await scalar('select count(*)::integer v from hq_private.site_visit_days'),2);
  assert.equal(await scalar('select count(*)::integer v from hq_private.site_visit_exclusions'),1);
});
test('RLS, grants, fixed search paths and minimal void response remain enforced', async () => {
  for (const name of ['site_visit_days','site_traffic_settings','site_visit_exclusions']) {
    assert.equal(await scalar("select relrowsecurity v from pg_class where oid=$1::regclass",[`hq_private.${name}`]),true);
    for (const role of ['anon','authenticated','service_role']) assert.equal(await scalar("select has_table_privilege($1,$2,'select') v",[role,`hq_private.${name}`]),false);
  }
  assert.equal(await scalar("select has_function_privilege('anon','public.admin_visitor_stats(uuid)','execute') v"),false);
  for (const name of ['public.site_visit_heartbeat(uuid)','public.admin_visitor_stats(uuid)']) {
    assert.ok((await scalar('select proconfig v from pg_proc where oid=$1::regprocedure',[name])).includes('search_path=pg_catalog'));
  }
  assert.equal(await scalar("select prorettype::regtype::text v from pg_proc where oid='public.site_visit_heartbeat(uuid)'::regprocedure"),'void');
});
test('concurrent tabs and owner exclusion serialize on a native PostgreSQL connection', {skip:!native}, async () => {
  await reset(); const a=new Client({connectionString:native}),b=new Client({connectionString:native});
  await a.connect();await b.connect();
  try {
    for(const c of [a,b]) await c.query("select set_config('hq.test_now','2026-11-01T18:00:00Z',false)");
    await Promise.all([a.query('select public.site_visit_heartbeat($1)',[visitor(1)]),b.query('select public.site_visit_heartbeat($1)',[visitor(1)])]);
    assert.equal((await read()).today,1);
    await b.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
    await Promise.all([a.query('select public.site_visit_heartbeat($1)',[visitor(1)]),b.query('select public.site_visit_heartbeat($1)',[visitor(1)])]);
    await uid(null);await beat(1);assert.equal((await read()).today,0);
  } finally { await a.end(); await b.end(); }
});

const view = (browser, token) => db.query('select public.site_record_page_view($1,$2)', [visitor(browser),visitor(token)]);
const pageStats = (expected = owner) => scalar('select public.admin_page_view_stats($1) v',[expected]);
async function readPageStats() { await uid(owner); return pageStats(); }

test('page view collection starts independently and heartbeat polling never creates views', async () => {
  await reset(); await beat(1); await beat(2);
  const row = await readPageStats();
  assert.deepEqual([row.hours24,row.days7,row.days30],[0,0,0]);
  assert.equal(Date.parse(row.since),Date.parse(row.updated_at)-3600000);
  assert.notEqual(row.since,(await stats()).since);
});
test('each new page activation counts, while retries retain the original timestamp', async () => {
  await reset(); await view(1,101);
  const first=await scalar('select viewed_at::text v from hq_private.site_page_views');
  await clock('2026-11-01T18:01:00Z'); await view(1,101);
  assert.equal(await scalar('select viewed_at::text v from hq_private.site_page_views'),first);
  await view(1,102); await view(2,103);
  const row=await readPageStats(); assert.deepEqual([row.hours24,row.days7,row.days30],[3,3,3]);
  assert.equal((await stats()).today,2);
});
test('a page token cannot be transferred to another browser', async () => {
  await reset(); await view(1,101);
  await assert.rejects(view(2,101),/Invalid page view/);
  assert.equal((await readPageStats()).hours24,1);
  assert.equal((await stats()).today,1); // The conflicting statement rolls back its heartbeat too.
});
test('page ingestion is public, but tables and aggregate are private to verified Isildur', async () => {
  await reset();
  for(const [role,account,n] of [['anon',null,1],['authenticated',player,2]]) {
    await uid(account);
    await asRole(role,async()=>{
      await view(n,100+n);
      await assert.rejects(pageStats(),/permission denied|Administrator/);
      if(account) await assert.rejects(pageStats(account),/Administrator/);
      for(const operation of ['select * from','delete from']) await assert.rejects(db.query(`${operation} hq_private.site_page_views`),/permission denied/);
    });
  }
  await uid(owner);
  await asRole('authenticated', async()=>{
    assert.equal((await pageStats()).days30,2);
    await assert.rejects(pageStats(player),/Administrator/);
    await assert.rejects(pageStats(null),/Administrator/);
  });
  await db.query('delete from public.admin_users where user_id=$1',[owner]);
  try { await assert.rejects(pageStats(),/Administrator/); }
  finally { await db.query('insert into public.admin_users values($1)',[owner]); }
});
test('owner heartbeat purges earlier guest page views and late guest retries stay excluded', async () => {
  await reset(); await view(1,101); await view(1,102); await view(2,103);
  await uid(owner); await beat(1); await view(3,104);
  assert.equal((await pageStats()).hours24,1);
  await uid(null); await view(1,101); await view(1,105); await view(3,106);
  assert.equal((await readPageStats()).hours24,1);
});
test('rolling page-view windows use exact 24, 168 and 720 hours with future rows excluded', async () => {
  await reset('2026-11-02T06:30:00Z');
  for(const [i,hours] of [0,23.999,24,167.999,168,719.999,720,800,-1].entries()) {
    await db.query("insert into hq_private.site_page_views values($1,$2,hq_private.traffic_test_now()-($3::text||' hours')::interval)",[visitor(i+101),visitor(1),hours]);
  }
  for(const zone of ['UTC','America/Chicago','Asia/Nicosia']) {
    await db.query("select set_config('TimeZone',$1,false)",[zone]);
    const row=await readPageStats(); assert.deepEqual([row.hours24,row.days7,row.days30],[2,4,6]);
  }
  await db.exec("set timezone='UTC'");
});
test('a retry after 24 hours does not move an old view into the current window', async () => {
  await reset('2026-11-01T07:30:00Z'); await view(1,101);
  await clock('2026-11-02T07:30:01Z'); await view(1,101);
  const row=await readPageStats(); assert.equal(row.hours24,0); assert.equal(row.days7,1);
});
test('invalid page and visitor identifiers cannot add observations', async () => {
  await reset();
  for(const args of [[visitor(1),null],[null,visitor(101)],['00000000-0000-0000-0000-000000000000',visitor(101)],[visitor(1),'00000000-0000-0000-0000-000000000000']]) {
    await assert.rejects(db.query('select public.site_record_page_view($1,$2)',args),/Invalid/);
  }
  assert.equal((await readPageStats()).days30,0);
});
test('page rows retain only opaque IDs and server time; grants and search paths stay bounded', async () => {
  assert.deepEqual((await db.query("select column_name from information_schema.columns where table_schema='hq_private' and table_name='site_page_views' order by ordinal_position")).rows.map(r=>r.column_name),['view_id','visitor_id','viewed_at']);
  assert.equal(await scalar("select relrowsecurity v from pg_class where oid='hq_private.site_page_views'::regclass"),true);
  for(const role of ['anon','authenticated','service_role']) {
    for(const op of ['select','insert','update','delete']) assert.equal(await scalar("select has_table_privilege($1,'hq_private.site_page_views',$2) v",[role,op]),false);
  }
  assert.equal(await scalar("select has_function_privilege('anon','public.admin_page_view_stats(uuid)','execute') v"),false);
  for(const signature of ['public.site_record_page_view(uuid,uuid)','public.admin_page_view_stats(uuid)']) assert.ok((await scalar('select proconfig v from pg_proc where oid=$1::regprocedure',[signature])).includes('search_path=pg_catalog'));
  assert.equal(await scalar("select prorettype::regtype::text v from pg_proc where oid='public.site_record_page_view(uuid,uuid)'::regprocedure"),'void');
});
test('existing daily cleanup also removes page views older than 840 hours', async () => {
  await reset();
  for(const [i,hours] of [720,839,841].entries()) await db.query("insert into hq_private.site_page_views values($1,$2,hq_private.traffic_test_now()-($3::text||' hours')::interval)",[visitor(i+101),visitor(1),hours]);
  await db.exec('select hq_private.prune_site_visits()');
  assert.equal(await scalar('select count(*)::integer v from hq_private.site_page_views'),2);
});
test('concurrent duplicate views and owner sign-in serialize on native PostgreSQL', {skip:!native}, async () => {
  await reset(); const a=new Client({connectionString:native}),b=new Client({connectionString:native});
  await a.connect();await b.connect();
  try {
    for(const c of [a,b]) await c.query("select set_config('hq.test_now','2026-11-01T18:00:00Z',false)");
    await Promise.all([a.query('select public.site_record_page_view($1,$2)',[visitor(1),visitor(101)]),b.query('select public.site_record_page_view($1,$2)',[visitor(1),visitor(101)])]);
    assert.equal((await readPageStats()).hours24,1);
    await b.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
    await Promise.all([a.query('select public.site_record_page_view($1,$2)',[visitor(1),visitor(102)]),b.query('select public.site_visit_heartbeat($1)',[visitor(1)])]);
    await uid(null);await view(1,103); assert.equal((await readPageStats()).hours24,0);
  } finally { await a.end(); await b.end(); }
});
