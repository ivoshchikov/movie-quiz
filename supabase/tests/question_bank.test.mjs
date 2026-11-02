import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, after } from 'node:test';
let db, Client;
const native=process.env.HQ_SQL_TEST_URL;
if(native){
 const url=new URL(native);if(!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!='/hardquiz_ui13_test')throw Error('Only the isolated localhost UI-13 test database is allowed.');
 const pg=await import(process.env.HQ_NODE_PG_MODULE||'pg');Client=pg.default.Client;pg.default.types.setTypeParser(20,Number);
 const c=new Client({connectionString:native});await c.connect();db={exec:s=>c.query(s),query:(s,p)=>c.query(s,p),close:()=>c.end()};
 if((await db.query("select to_regclass('public.question') as q")).rows[0].q)throw Error('SQL fixture must be empty.');
}else{const {PGlite}=await import(process.env.HQ_PGLITE_MODULE||'@electric-sql/pglite');db=new PGlite();}
const admin='112743d7-f683-4bbb-8117-068e89a00f22',player='00000000-0000-0000-0000-000000000002';
const options=['One','Two','Three','Four'];
await db.exec(`
create role anon;create role authenticated;create role service_role;
create schema auth;create schema storage;create schema extensions;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth to anon,authenticated,service_role;
create table public.admin_users(user_id uuid primary key,created_at timestamptz default now());
create table public.profiles(user_id uuid primary key,nickname text,avatar_url text,created_at timestamptz default now());
create table public.category(id integer primary key,name text);
create table public.difficulty_level(id integer primary key,name text);
create table public.question(id serial primary key,image_url text not null,correct_answer text not null,options_json jsonb not null,category_id integer,difficulty_level_id integer not null);
create table storage.objects(bucket_id text,name text,metadata jsonb,user_metadata jsonb,unique(bucket_id,name));
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table public.daily_challenge(d date primary key,question_id integer not null,category_id integer not null,difficulty_level_id integer not null,created_at timestamptz default now());
create table public.daily_session(user_id uuid,d date,started_at timestamptz default now(),created_at timestamptz default now(),primary key(user_id,d));
create table public.daily_result(user_id uuid,d date,is_correct boolean,time_spent integer,answered_at timestamptz default now(),primary key(user_id,d));
create table public.question_stats(question_id integer primary key,total_attempts bigint default 0,correct_attempts bigint default 0,updated_at timestamptz default now());
create function public.is_admin() returns boolean language sql stable security definer as $$select exists(select 1 from public.admin_users where user_id=auth.uid())$$;
create function public.touch_question_stats(p_question_id integer,p_is_correct boolean) returns void language sql security definer as $$insert into public.question_stats(question_id,total_attempts,correct_attempts) values(p_question_id,1,p_is_correct::integer) on conflict(question_id) do update set total_attempts=question_stats.total_attempts+1,correct_attempts=question_stats.correct_attempts+p_is_correct::integer$$;
create function public.start_daily_session(p_user_id uuid,p_date date) returns timestamptz language plpgsql security definer as $$declare v timestamptz;begin if auth.uid() is distinct from p_user_id then raise exception 'mismatch';end if;insert into public.daily_session(user_id,d) values(p_user_id,p_date) on conflict do nothing;select started_at into v from public.daily_session where user_id=p_user_id and d=p_date;return v;end$$;
create function public.submit_daily_result(p_user_id uuid,p_date date,p_is_correct boolean,p_time integer) returns void language sql security definer as $$insert into public.daily_result(user_id,d,is_correct,time_spent) values(p_user_id,p_date,p_is_correct,p_time) on conflict do nothing$$;
create function public.set_daily_question(p_date date,p_question_id integer) returns void language sql security definer as $$insert into public.daily_challenge(d,question_id,category_id,difficulty_level_id) select p_date,id,category_id,difficulty_level_id from public.question where id=p_question_id on conflict do nothing$$;
create function public.get_daily_history_admin(p_limit integer,p_offset integer) returns table(d date,question_id integer,image_url text,correct_answer text,category_id integer,difficulty_level_id integer,total_answers integer,correct_answers integer,created_at timestamptz) language sql as $$select null::date,0,'','',0,0,0,0,null::timestamptz where false$$;
create function public.get_daily_history(p_limit integer,p_offset integer) returns table(correct_answer text) language sql security definer as $$select correct_answer from public.question$$;
create function public.get_question(p_category_id integer,p_difficulty_id integer) returns table(correct_answer text) language sql security definer as $$select correct_answer from public.question limit 1$$;
create function public.get_question(p_exclude_ids integer[],p_category_id integer,p_difficulty_id integer) returns table(correct_answer text) language sql security definer as $$select correct_answer from public.question limit 1$$;
create function public.get_daily_question(p_date date) returns table(id integer,image_url text,options_json jsonb,correct_answer text,category_id integer,difficulty_level_id integer) language sql security definer as $$select q.* from (select id,image_url,options_json,correct_answer,category_id,difficulty_level_id from public.question) q join public.daily_challenge d on d.question_id=q.id where d.d=p_date$$;
create function public.get_daily_question_public(p_date date) returns table(id integer,image_url text,options_json jsonb,category_id integer,difficulty_level_id integer) language sql security definer as $$select id,image_url,options_json,category_id,difficulty_level_id from public.get_daily_question(p_date)$$;
insert into public.admin_users values('${admin}',now());insert into public.profiles(user_id,nickname) values('${admin}','Isildur'),('${player}','Isildur');
insert into public.category values(1,'All movies'),(2,'Actors'),(3,'Actresses'),(4,'TV series');insert into public.difficulty_level values(1,'Easy'),(2,'Medium'),(3,'Hard');
insert into public.question values(1,'general/g_00001.webp','One','["One","Two","Three","Four"]',1,1),(100,'general/g_00100.webp','One','["One","Two","Three","Four"]',1,2),(101,'actors/act_00200.webp','One','["One","Two","Three","Four"]',2,1),(175,'actors/act_00075.webp','One','["One","One","Three","Four"]',2,1),(300,'legacy.webp','Missing','["One","Two","Three","Four"]',null,1);
insert into storage.buckets values('movies','movies',true,null,null);insert into storage.objects(bucket_id,name) select 'movies',image_url from public.question;
select setval('public.question_id_seq',5,true);
alter table public.question enable row level security;create policy old_public_read on public.question for select using(true);
grant all on all tables in schema public to anon,authenticated;grant all on sequence public.question_id_seq to anon,authenticated;
`);
if(native)await db.exec('create extension pgcrypto with schema extensions');
else await db.exec("create function extensions.gen_random_bytes(n integer) returns bytea language sql as $$select decode(repeat('ab',n),'hex')$$"); // Fixture only; production uses pgcrypto.
await db.exec(await readFile(new URL('../migrations/20261010200933_admin_daily_guard.sql',import.meta.url),'utf8'));
await db.exec('begin');await db.exec(await readFile(new URL('../migrations/20261011145955_admin_question_bank.sql',import.meta.url),'utf8'));await db.exec('commit');
await db.exec('begin');await db.exec(await readFile(new URL('../migrations/20261011161955_question_privacy.sql',import.meta.url),'utf8'));await db.exec('commit');
await db.exec('begin');await db.exec(await readFile(new URL('../migrations/20261011170955_question_edit_delete.sql',import.meta.url),'utf8'));await db.exec('commit');
await db.exec('begin');await db.exec(await readFile(new URL('../migrations/20261102122652_question_content_bundles.sql',import.meta.url),'utf8'));await db.exec('commit');
// Minimal authoritative aggregate fixtures; the gameplay suite exercises their
// real issuance triggers/backfill separately. No legacy attempts are shows.
await db.exec(`create table hq_private.gameplay_settings(cohort_since timestamptz);
insert into hq_private.gameplay_settings values('2026-10-18T12:00:00Z');
create table hq_private.question_shown_counts(question_id integer,revision integer,mode text,shown bigint,primary key(question_id,revision,mode));
create table hq_private.question_metrics(question_id integer,revision integer,mode text,correct bigint,primary key(question_id,revision,mode));
create table hq_private.question_cohort_metrics(question_id integer,revision integer,mode text,cohort text,correct bigint);`);
// Commit one old-client operation before upgrading, then retry it afterwards.
await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false);
select public.admin_change_question('00000000-0000-4000-8000-000000000600',100,1,'["One","Two","Three","Four"]',0,false);`);
await db.exec('begin');await db.exec(await readFile(new URL('../migrations/20261102170738_question_editor_details.sql',import.meta.url),'utf8'));await db.exec('commit');
const uid=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);
const scalar=async(sql,args)=>(await db.query(sql,args)).rows[0].v;
const reserve=async(id,category=1,allow=false,hash=id.replaceAll('-','').repeat(2))=>scalar('select public.admin_import_reserve($1,$2,$3,$4,null,$5,1,$6,0,$7) v',[admin,id,'f'.repeat(64),hash,category,JSON.stringify(options),allow]);
after(()=>db.close());

test('only the verified Isildur UUID has administrator access, even when nicknames match',async()=>{
 await uid(player);assert.equal(await scalar('select public.is_admin() v'),false);
 await assert.rejects(db.query("select public.admin_question_bank()"),/Administrator/);
 await assert.rejects(db.query('select public.admin_draft_key()'),/Administrator/);
 await uid(admin);assert.equal(await scalar('select public.is_admin() v'),true);
 assert.match(await scalar('select public.admin_draft_key() v'),/^[0-9a-f]{64}$/);
});
test('RLS, table grants and every legacy answer endpoint deny guests and players',async()=>{
 for(const role of ['anon','authenticated']){
  await uid(player);await db.exec(`set role ${role}`);
  try{
   if(role==='anon')await assert.rejects(db.query('select * from public.question'),/permission denied/);
   else assert.equal((await db.query('select correct_answer from public.question')).rows.length,0);
   for(const sql of ['select * from public.get_question(1,1)','select * from public.get_question(array[]::integer[],1,1)','select * from public.get_daily_question(current_date)','select * from public.get_daily_history(30,0)','select * from hq_private.question_imports'])await assert.rejects(db.query(sql),/permission denied/);
   await assert.rejects(db.query(`select public.admin_import_claim('${admin}',gen_random_uuid(),'${'f'.repeat(64)}')`),/permission denied/);
  }finally{await db.exec('reset role');}
 }
 await uid(admin);await db.exec('set role authenticated');try{assert.equal((await db.query('select correct_answer from public.question')).rows.length,5);}finally{await db.exec('reset role');}
});
test('bank search covers options, IDs, paths and literal LIKE characters; malformed rows stay readable',async()=>{
 await uid(admin);
 const get=async(s='',c=null,d=null,sort='id_desc',page=1)=>scalar('select public.admin_question_bank($1,$2,$3,$4,$5) v',[s,c,d,sort,page]);
 assert.equal((await get('Three')).total,5);assert.equal((await get('#100')).rows[0].id,100);
 assert.equal((await get('act_00200')).rows[0].id,101);assert.equal((await get('%')).total,0);
 assert.equal((await get('',0)).rows[0].id,300);assert.equal((await get('',1,2)).total,1);
 const all=await get();assert.equal(all.bank_total,5);assert.equal(all.rows.filter(q=>q.needs_review).length,2);
 assert.equal(all.summary.filter(s=>s.category_id===3).reduce((n,s)=>n+s.count,0),0);
 assert.equal((await get('',null,null,'id_asc')).rows[0].id,1);
 assert.equal((await get('',null,null,'id_desc',999)).page,1);
 await assert.rejects(get('',null,null,'bad_sort'),/Invalid filters/);
});
test('game responses contain no answer labels; tickets are single choice and retries do not double-count',async()=>{
 await uid(null);const q=await scalar('select public.get_game_question(array[]::integer[],1,1) v');
 assert.equal(q.correct_answer,undefined);assert.ok(q.answer_token);assert.equal(q.id,1);
 const checked=async answer=>scalar('select public.answer_game_question($1,$2) v',[q.answer_token,answer]);
 assert.equal(await checked('Two'),false);assert.equal(await checked('Two'),false);await assert.rejects(checked('One'),/already recorded/);
 assert.equal(await scalar('select total_attempts v from public.question_stats where question_id=1'),1);
 assert.equal(await scalar('select public.count_questions(2,1) v'),1);
 await assert.rejects(db.query('select public.answer_game_question(gen_random_uuid(),$1)',['One']),/unavailable/);
});
test('Daily checks the answer on the server and preserves the first result',async()=>{
 const date=await scalar("select (now() at time zone 'America/Chicago')::date::text v");
 await db.query('insert into public.daily_challenge(d,question_id,category_id,difficulty_level_id) values($1,1,1,1)',[date]);
 await uid(player);const q=(await db.query('select * from public.get_daily_question_public($1)',[date])).rows[0];assert.equal(q.correct_answer,undefined);
 await assert.rejects(db.query('select public.submit_daily_answer($1,$2,$3,4)',[player,date,'Two']),/Start Daily/);
 await db.query('select public.start_daily_session($1,$2)',[player,date]);
 await db.query('select public.submit_daily_answer($1,$2,$3,4)',[player,date,'Two']);
 await db.query('select public.submit_daily_answer($1,$2,$3,4)',[player,date,'One']);
 assert.equal(await scalar('select is_correct v from public.daily_result where user_id=$1 and d=$2',[player,date]),false);
 await assert.rejects(db.query('select public.submit_daily_answer($1,$2,$3,4)',[admin,date,'One']),/Account mismatch/);
});
test('names continue existing namespaces; reservations are immutable and idempotent',async()=>{
 const id='00000000-0000-4000-8000-000000000101';const j=await reserve(id);assert.equal(j.image_path,'general/g_00101.webp');
 assert.equal((await reserve(id)).image_path,j.image_path);
 await assert.rejects(db.query('select public.admin_import_reserve($1,$2,$3,$4,null,1,1,$5,0,false)',[admin,id,'e'.repeat(64),'1'.repeat(64),JSON.stringify(options)]),/data changed/);
 assert.equal((await reserve('00000000-0000-4000-8000-000000000102',2)).image_path,'actors/act_00201.webp');
 assert.equal((await reserve('00000000-0000-4000-8000-000000000103',3)).image_path,'actresses/actr_00001.webp');
 assert.equal((await reserve('00000000-0000-4000-8000-000000000104',4)).image_path,'series/tv_00001.webp');
});
test('a confirmed file and atomic SQL commit are both required; retries return the same question',async()=>{
 const id='00000000-0000-4000-8000-000000000105',hash=id.replaceAll('-','').repeat(2);let j=await reserve(id);
 j=await scalar('select public.admin_import_claim($1,$2,$3) v',[admin,id,'f'.repeat(64)]);assert.ok(j.lease_token);
 assert.equal((await scalar('select public.admin_import_claim($1,$2,$3) v',[admin,id,'f'.repeat(64)])).status,'busy');
 const finish=()=>scalar('select public.admin_import_finish($1,$2,$3,$4,$5) v',[admin,id,j.lease_token,'f'.repeat(64),hash]);
 await assert.rejects(finish(),/unconfirmed/);
 await db.query('insert into storage.objects(bucket_id,name,user_metadata) values($1,$2,$3)',['movies',j.image_path,JSON.stringify({hq_import_id:id,sha256:hash})]);
 const saved=await finish();assert.equal(saved.question_id,301);assert.deepEqual(await finish(),saved);
 assert.equal(await scalar('select count(*)::integer v from public.question where image_url=$1',[j.image_path]),1);
 const duplicate=await reserve('00000000-0000-4000-8000-000000000106',1,false,hash);assert.equal(duplicate.status,'duplicate');
 assert.equal((await reserve('00000000-0000-4000-8000-000000000106',1,true,hash)).status,'reserved');
});
test('an externally occupied path is replaced without touching that object',async()=>{
 const id='00000000-0000-4000-8000-000000000107';await reserve(id);const j=await scalar('select public.admin_import_claim($1,$2,$3) v',[admin,id,'f'.repeat(64)]);
 await db.query('insert into storage.objects(bucket_id,name,user_metadata) values($1,$2,$3)',['movies',j.image_path,'{"manual":true}']);
 const path=await scalar('select public.admin_import_repath($1,$2,$3) v',[admin,id,j.lease_token]);assert.notEqual(path,j.image_path);
 assert.deepEqual(await scalar('select user_metadata v from storage.objects where bucket_id=$1 and name=$2',['movies',j.image_path]),{manual:true});
});
test('cleanup never deletes legacy files or files referenced by a question',async()=>{
 await db.exec("update hq_private.question_imports set created_at=now()-interval '8 days',lease_until=null");
 const jobs=await scalar('select public.admin_import_cleanup($1) v',[admin]);
 assert.ok(jobs.every(j=>!j.final_path||!['general/g_00001.webp','actors/act_00200.webp'].includes(j.final_path)));
 const committed=jobs.find(j=>j.id==='00000000-0000-4000-8000-000000000105');assert.equal(committed.final_path,null);
 const expired=await scalar("select image_path v from hq_private.question_imports where status='expired' limit 1");
 await assert.rejects(db.query('insert into public.question(image_url,correct_answer,options_json,category_id,difficulty_level_id) values($1,$2,$3,1,1)',[expired,'One',JSON.stringify(options)]),/expired/);
});
test('real concurrent reservations and repeat submissions serialize across connections',{skip:!native},async()=>{
 const a=new Client({connectionString:native}),b=new Client({connectionString:native});await a.connect();await b.connect();
 try{
  const statement='select public.admin_import_reserve($1,$2,$3,$4,null,1,1,$5,0,true) v';
  const rows=await Promise.all([a.query(statement,[admin,'00000000-0000-4000-8000-000000000201','a'.repeat(64),'2'.repeat(64),JSON.stringify(options)]),b.query(statement,[admin,'00000000-0000-4000-8000-000000000202','b'.repeat(64),'3'.repeat(64),JSON.stringify(options)])]);
  assert.notEqual(rows[0].rows[0].v.image_path,rows[1].rows[0].v.image_path);
  const params=[admin,'00000000-0000-4000-8000-000000000203','c'.repeat(64),'4'.repeat(64),JSON.stringify(options)];
  const same=await Promise.all([a.query(statement,params),b.query(statement,params)]);assert.equal(same[0].rows[0].v.image_path,same[1].rows[0].v.image_path);
  const job=await scalar('select public.admin_import_claim($1,$2,$3) v',[admin,params[1],params[2]]);
  await db.query('insert into storage.objects(bucket_id,name,user_metadata) values($1,$2,$3)',['movies',job.image_path,JSON.stringify({hq_import_id:job.id,sha256:params[3]})]);
  const finish='select public.admin_import_finish($1,$2,$3,$4,$5) v',finishParams=[admin,job.id,job.lease_token,params[2],params[3]];
  const committed=await Promise.all([a.query(finish,finishParams),b.query(finish,finishParams)]);assert.equal(committed[0].rows[0].v.question_id,committed[1].rows[0].v.question_id);
  assert.equal(await scalar('select count(*)::integer v from public.question where image_url=$1',[job.image_path]),1);
 }finally{await a.end();await b.end();}
});
test('concurrent manual references prevent orphan cleanup from deleting a live question path',{skip:!native},async()=>{
 const id='00000000-0000-4000-8000-000000000204',j=await reserve(id,1,true);
 await db.query("update hq_private.question_imports set created_at=now()-interval '8 days' where id=$1",[id]);
 const a=new Client({connectionString:native}),b=new Client({connectionString:native});await a.connect();await b.connect();
 try{
  await a.query('begin');await a.query('insert into public.question(image_url,correct_answer,options_json,category_id,difficulty_level_id) values($1,$2,$3,1,1)',[j.image_path,'One',JSON.stringify(options)]);
  const cleanup=await b.query('select public.admin_import_cleanup($1) v',[admin]);assert.equal(cleanup.rows[0].v.some(x=>x.id===id),false);
  await a.query('commit');assert.equal((await scalar('select public.admin_import_cleanup($1) v',[admin])).some(x=>x.id===id),false);
 }finally{await a.end();await b.end();}
});

test('edits retain Daily snapshots and old game answers; stale revisions and retries are safe',async()=>{
 const date=await scalar("select (now() at time zone 'America/Chicago')::date::text v");
 await uid(null);const ticket=await scalar('select public.get_game_question(array(select id from public.question where id<>1),1,1) v');
 await uid(admin);const row=await scalar('select public.admin_question_detail(1) v');
 const op='00000000-0000-4000-8000-000000000401';
 const change=()=>scalar('select public.admin_change_question($1,1,$2,$3,1,false) v',[op,row.admin_revision,JSON.stringify(['New One','New Two','New Three','New Four'])]);
 const saved=await change();assert.equal(saved.revision,row.admin_revision+1);assert.deepEqual(await change(),saved);
 await assert.rejects(scalar('select public.admin_change_question(gen_random_uuid(),1,$1,$2,0,false) v',[row.admin_revision,JSON.stringify(options)]),/Question changed/);
 await uid(null);assert.equal(await scalar('select public.answer_game_question($1,$2) v',[ticket.answer_token,'One']),true);
 await uid(player);const daily=(await db.query('select * from public.get_daily_question_public($1)',[date])).rows[0];assert.equal(daily.options_json[0],'One');
 await uid(admin);const history=(await db.query('select * from public.get_daily_history_admin(30,0)')).rows.find(r=>(r.d instanceof Date ? r.d.toISOString().slice(0,10) : r.d)===date);assert.equal(history.correct_answer,'One');
});
test('replacement images update the same ID once, retaining original files and Daily image',async()=>{
 await uid(admin);const row=await scalar('select public.admin_question_detail(1) v');const id='00000000-0000-4000-8000-000000000402',hash='9'.repeat(64),fp='8'.repeat(64);
 const reserveEdit=()=>scalar('select public.admin_edit_import_reserve($1,$2,$3,$4,null,1,1,$5,0,true,1,$6) v',[admin,id,fp,hash,JSON.stringify(options),row.admin_revision]);
 await reserveEdit();const j=await scalar('select public.admin_import_claim($1,$2,$3) v',[admin,id,fp]);
 await db.query('insert into storage.objects(bucket_id,name,user_metadata) values($1,$2,$3)',['movies',j.image_path,JSON.stringify({hq_import_id:id,sha256:hash})]);
 const finish=()=>scalar('select public.admin_import_finish($1,$2,$3,$4,$5) v',[admin,id,j.lease_token,fp,hash]);
 const result=await finish();assert.equal(result.question_id,1);assert.deepEqual(await finish(),result);assert.equal((await reserveEdit()).question_id,1);
 assert.equal(await scalar('select image_url v from public.question where id=1'),j.image_path);assert.equal(await scalar("select count(*)::integer v from storage.objects where name='general/g_00001.webp'"),1);
 assert.equal(await scalar("select image_url v from hq_private.daily_questions order by d desc limit 1"),'general/g_00001.webp');
});
test('deletion retires the question, excludes new pools and preserves pending games and Daily',async()=>{
 await uid(null);const ticket=await scalar('select public.get_game_question(array(select id from public.question where id<>1),1,1) v');
 assert.equal(ticket.id,1);await uid(admin);const remaining=await scalar('select public.count_questions(1,1) v');const revision=await scalar('select admin_revision v from public.question where id=1');const op='00000000-0000-4000-8000-000000000403';
 const remove=()=>scalar('select public.admin_change_question($1,1,$2,null,null,true) v',[op,revision]);const result=await remove();assert.equal(result.deleted,true);assert.deepEqual(await remove(),result);
 assert.equal(await scalar('select public.admin_question_detail(1) v'),null);assert.equal((await scalar('select public.admin_question_bank() v')).rows.some(r=>r.id===1),false);
 assert.equal(await scalar('select public.count_questions(1,1) v'),remaining-1);assert.equal(await scalar('select public.get_game_question(array(select id from public.question where id<>1),1,1) v'),null);
 assert.equal(await scalar('select count(*)::integer v from public.question where id=1'),1);
 await uid(null);assert.equal(await scalar('select public.answer_game_question($1,$2) v',[ticket.answer_token,'One']),true);
 await uid(admin);await assert.rejects(db.query("insert into public.daily_challenge(d,question_id,category_id,difficulty_level_id) values('2099-01-01',1,1,1)"),/Question unavailable/);
});
test('edit and deletion APIs reject guests, players and direct service-only calls',async()=>{
 await uid(player);await db.exec('set role authenticated');try{
 await assert.rejects(db.query('select public.admin_change_question(gen_random_uuid(),100,1,null,null,true)'),/Administrator/);
 await assert.rejects(db.query(`select public.admin_edit_import_reserve('${admin}',gen_random_uuid(),'x','y',null,1,1,'[]',0,false,100,1)`),/permission denied/);
 await assert.rejects(db.query('select * from hq_private.daily_questions'),/permission denied/);
 }finally{await db.exec('reset role');}
 await db.exec('set role anon');try{await assert.rejects(db.query('select public.admin_change_question(gen_random_uuid(),100,1,null,null,true)'),/permission denied/);}finally{await db.exec('reset role');}
});

test('two owner tabs cannot overwrite each other with the same revision',{skip:!native},async()=>{
 await uid(admin);
 const q=await scalar("insert into public.question(image_url,correct_answer,options_json,category_id,difficulty_level_id) values('test/concurrent.webp','One','[\"One\",\"Two\",\"Three\",\"Four\"]',4,1) returning id v");
 const a=new Client({connectionString:native}),b=new Client({connectionString:native});await a.connect();await b.connect();
 try{
  await Promise.all([a.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]),b.query("select set_config('request.jwt.claim.sub',$1,false)",[admin])]);
  const query='select public.admin_change_question($1,$2,1,$3,0,false,$4) v';
  const outcomes=await Promise.allSettled([a.query(query,['00000000-0000-4000-8000-000000000411',q,JSON.stringify(['A1','A2','A3','A4']),2]),b.query(query,['00000000-0000-4000-8000-000000000412',q,JSON.stringify(['B1','B2','B3','B4']),3])]);
  assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);const failure=outcomes.find(o=>o.status==='rejected');assert.match(failure.reason.message,/Question changed/);assert.equal(await scalar('select admin_revision v from public.question where id=$1',[q]),2);
  const detail=await scalar('select public.admin_question_detail($1) v',[q]);assert.equal(detail.difficulty_level_id,detail.correct_answer==='A1'?2:3);
 }finally{await a.end();await b.end();}
});
test('deletion during a replacement upload prevents the upload from resurrecting a question',async()=>{
 await uid(admin);const q=await scalar("insert into public.question(image_url,correct_answer,options_json,category_id,difficulty_level_id) values('test/upload-delete.webp','One','[\"One\",\"Two\",\"Three\",\"Four\"]',4,1) returning id v");
 const id='00000000-0000-4000-8000-000000000420',hash='7'.repeat(64),fp='6'.repeat(64);
 await scalar('select public.admin_edit_import_reserve($1,$2,$3,$4,null,4,1,$5,0,true,$6,1) v',[admin,id,fp,hash,JSON.stringify(options),q]);
 const j=await scalar('select public.admin_import_claim($1,$2,$3) v',[admin,id,fp]);
 await db.query('insert into storage.objects(bucket_id,name,user_metadata) values($1,$2,$3)',['movies',j.image_path,JSON.stringify({hq_import_id:id,sha256:hash})]);
 await scalar('select public.admin_change_question(gen_random_uuid(),$1,1,null,null,true) v',[q]);
 await assert.rejects(scalar('select public.admin_import_finish($1,$2,$3,$4,$5) v',[admin,id,j.lease_token,fp,hash]),/Question unavailable/);
 assert.equal(await scalar('select image_url v from public.question where id=$1',[q]),'test/upload-delete.webp');assert.equal(await scalar('select status v from hq_private.question_imports where id=$1',[id]),'reserved');
});

const metadata = hash => ({ image: { sha256: hash, photographer: 'Example creator', source_page_url: 'https://example.com/subject-source', license: 'CC BY-SA 4.0', license_url: 'https://creativecommons.org/licenses/by-sa/4.0/', attribution_required: true, attribution_text: 'Example creator, CC BY-SA 4.0. Cropped.', share_alike_required: true, derivative_license: 'CC BY-SA 4.0', processing: { changes: 'Cropped; converted to WebP.' } }, identity: { wikidata_id: 'Q12345' } });
const contentReserve = async (id, temp, category=3, hash='8'.repeat(64), meta=metadata(hash), owner=admin) => scalar('select public.admin_content_import_reserve($1,$2,$3,$4,null,$5,1,$6,0,true,$7,$8,$9) v',[owner,id,'9'.repeat(64),hash,category,JSON.stringify(options),'HQ-SQL-BUNDLE',temp,meta===null?null:JSON.stringify(meta)]);
async function contentCommit(id, temp, category=3) {
 const reserved=await contentReserve(id,temp,category);
 const job=await scalar('select public.admin_import_claim($1,$2,$3) v',[admin,id,'9'.repeat(64)]);
 await db.query('insert into storage.objects(bucket_id,name,user_metadata) values($1,$2,$3)',['movies',reserved.image_path,JSON.stringify({hq_import_id:id,sha256:'8'.repeat(64)})]);
 return scalar('select public.admin_import_finish($1,$2,$3,$4,$5) v',[admin,id,job.lease_token,'9'.repeat(64),'8'.repeat(64)]);
}
test('bundle inspection is read-only; private credits and content reservation remain guarded', async()=>{
 await uid(admin);const before=await scalar('select count(*)::integer v from hq_private.question_imports');
 const numbers=(await db.query('select category_id,last_number from hq_private.question_namespaces order by category_id')).rows;
 assert.deepEqual(await scalar("select public.admin_bundle_status('HQ-SQL-BUNDLE',array['unopened']) v"),{});
 assert.deepEqual(await scalar(`select public.admin_bundle_warnings('[{"temp_id":"unopened","category_id":3,"names":["Nobody"],"sha256":"none"}]') v`),{unopened:[]});
 assert.equal(await scalar('select count(*)::integer v from hq_private.question_imports'),before);
 assert.deepEqual((await db.query('select category_id,last_number from hq_private.question_namespaces order by category_id')).rows,numbers);
 for(const role of ['anon','authenticated']){
  await uid(player);await db.exec(`set role ${role}`);try{
   await assert.rejects(db.query('select * from hq_private.question_media'),/permission denied/);
   await assert.rejects(db.query("select public.admin_bundle_status('HQ-SQL-BUNDLE',array['one'])"),/permission denied|Administrator/);
   await assert.rejects(contentReserve('00000000-0000-5000-8000-000000000501','one'),/permission denied/);
  }finally{await db.exec('reset role');}
 }
 await assert.rejects(contentReserve('00000000-0000-5000-8000-000000000501','one',3,'8'.repeat(64),metadata('8'.repeat(64)),player),/Administrator/);
});
const contentResults=[];
test('selected approvals preserve image provenance atomically, keep namespaces and repeat exactly once in all four categories',async()=>{
 await uid(admin);
 for(const category of [1,2,3,4]) {
  const id=`00000000-0000-5000-8000-00000000050${category}`,temp=`approved-${category}`;
  const result=await contentCommit(id,temp,category);contentResults.push(result);
  assert.equal(result.status,'committed');
  const detail=await scalar('select public.admin_question_detail($1) v',[result.question_id]);
  assert.deepEqual(detail.content_metadata,metadata('8'.repeat(64)));
  assert.equal(detail.category_id,category);
  assert.equal((await contentReserve(id,temp,category)).question_id,result.question_id);
  const status=await scalar('select public.admin_bundle_status($1,$2) v',['HQ-SQL-BUNDLE',[temp]]);
  assert.equal(status[temp].question_id,result.question_id);
  await assert.rejects(contentReserve(id,temp,category,'8'.repeat(64),{...metadata('8'.repeat(64)),image:{...metadata('8'.repeat(64)).image,photographer:'Different creator'}}),/data changed/);
  await assert.rejects(contentReserve(`00000000-0000-5000-8000-00000000051${category}`,temp,category),/already linked/);
 }
 assert.equal(await scalar('select count(*)::integer v from hq_private.question_media'),4);
});
test('possible names/aliases/diacritics and identical images warn independently and never merge questions',async()=>{
 await uid(admin);
 await db.query('update public.question set correct_answer=$1,options_json=$2 where id=$3',['Zoë Example',JSON.stringify(['Zoë Example','Two','Three','Four']),contentResults[2].question_id]);
 const warnings=await scalar('select public.admin_bundle_warnings($1) v',[JSON.stringify([{temp_id:'review-me',category_id:3,names:['Stage Name','Zoe Example'],wikidata_id:null,sha256:'8'.repeat(64)}])]);
 assert.equal(warnings['review-me'].length,2);
 const wrongOptionsOnly=await scalar('select public.admin_bundle_warnings($1) v',[JSON.stringify([{temp_id:'wrong-options-only',category_id:3,names:['Two'],sha256:'no-match'}])]);
 assert.deepEqual(wrongOptionsOnly['wrong-options-only'],[]);
});
test('full credits are unavailable before a completed owned run, and only issued images are returned afterwards',async()=>{
 await db.exec(`create table hq_private.game_sessions(id uuid primary key,owner uuid,finished_at timestamptz);
 create table hq_private.game_rounds(session_id uuid,number integer,image_url text,issued_at timestamptz);
 create table hq_private.time_attack_sessions(id uuid primary key,owner uuid,finished_at timestamptz);
 create table hq_private.time_attack_rounds(session_id uuid,number integer,image_url text,issued_at timestamptz);
 create table hq_private.tt_people(id bigint primary key,image_url text,active boolean,source_question integer);`);
 for(const mode of ['normal','time-attack']){
  const sessions=mode==='normal'?'game_sessions':'time_attack_sessions',rounds=mode==='normal'?'game_rounds':'time_attack_rounds';
  const id='00000000-0000-4000-8000-000000000550';
  await db.query(`insert into hq_private.${sessions} values($1,$2,null)`,[id,player]);
  await db.query(`insert into hq_private.${rounds} values($1,1,$2,now()),($1,2,$3,null)`,[id,contentResults[0].image_path,contentResults[1].image_path]);
  await uid(player);await assert.rejects(scalar('select public.question_image_credits($1,$2) v',[mode,id]),/until.*finished/);
  await db.query(`update hq_private.${sessions} set finished_at=now() where id=$1`,[id]);
  await uid(admin);await assert.rejects(scalar('select public.question_image_credits($1,$2) v',[mode,id]),/until.*finished/);
  await uid(null);await assert.rejects(scalar('select public.question_image_credits($1,$2) v',[mode,id]),/until.*finished/);
  await uid(player);await db.exec('set role authenticated');try{
   const credits=await scalar('select public.question_image_credits($1,$2) v',[mode,id]);
   assert.equal(credits.length,1);assert.equal(credits[0].image_url,contentResults[0].image_path);
   assert.equal(credits[0].metadata.image.license,'CC BY-SA 4.0');assert.equal(credits[0].metadata.identity,undefined);assert.equal(credits[0].metadata.editorial,undefined);
  }finally{await db.exec('reset role');}
 }
});
test('Daily credits require a saved answer; public preference portraits retain accessible credits',async()=>{
 const date='2020-01-01',q=contentResults[1];
 await uid(admin);await db.query('insert into public.daily_challenge(d,question_id,category_id,difficulty_level_id) values($1,$2,2,1)',[date,q.question_id]);
 await uid(player);await assert.rejects(scalar("select public.question_image_credits('daily',null,$1) v",[date]),/until.*saved/);
 await db.query('insert into public.daily_result(user_id,d,is_correct,time_spent) values($1,$2,true,4)',[player,date]);
 const credits=await scalar("select public.question_image_credits('daily',null,$1) v",[date]);assert.equal(credits[0].image_url,q.image_path);
 await uid(null);await assert.rejects(scalar("select public.question_image_credits('daily',null,$1) v",[date]),/until.*saved/);
 await db.query('insert into hq_private.tt_people values(77,$1,true,$2)',[q.image_path,q.question_id]);
 await db.exec('set role anon');try{assert.equal((await scalar("select public.question_image_credits('comparison',null,null,77) v"))[0].metadata.image.photographer,'Example creator');}finally{await db.exec('reset role');}
});
test('replacing a photo clears current attribution and keeps credits for historical snapshots',async()=>{
 await uid(admin);const q=contentResults[2],id='00000000-0000-4000-8000-000000000560',hash='a'.repeat(64),fp='b'.repeat(64);
 const revision=await scalar('select admin_revision v from public.question where id=$1',[q.question_id]);
 await scalar('select public.admin_edit_import_reserve($1,$2,$3,$4,null,3,1,$5,0,true,$6,$7) v',[admin,id,fp,hash,JSON.stringify(options),q.question_id,revision]);
 const j=await scalar('select public.admin_import_claim($1,$2,$3) v',[admin,id,fp]);
 await db.query('insert into storage.objects(bucket_id,name,user_metadata) values($1,$2,$3)',['movies',j.image_path,JSON.stringify({hq_import_id:id,sha256:hash})]);
 await scalar('select public.admin_import_finish($1,$2,$3,$4,$5) v',[admin,id,j.lease_token,fp,hash]);
 assert.equal((await scalar('select public.admin_question_detail($1) v',[q.question_id])).content_metadata,null);
 assert.deepEqual(await scalar('select content_metadata v from hq_private.question_media where image_path=$1',[q.image_path]),metadata('8'.repeat(64)));
});
test('concurrent approvals use one bundle identity and one production number',{skip:!native},async()=>{
 const clients=[new Client({connectionString:native}),new Client({connectionString:native})];await Promise.all(clients.map(c=>c.connect()));
 try{
  const query='select public.admin_content_import_reserve($1,$2,$3,$4,null,3,1,$5,0,true,$6,$7,$8) v',args=[admin,'00000000-0000-5000-8000-000000000570','c'.repeat(64),'d'.repeat(64),JSON.stringify(options),'HQ-SQL-BUNDLE','concurrent',JSON.stringify(metadata('d'.repeat(64)))];
  const result=await Promise.all(clients.map(c=>c.query(query,args)));assert.equal(result[0].rows[0].v.image_path,result[1].rows[0].v.image_path);
  assert.equal(await scalar("select count(*)::integer v from hq_private.question_imports where package_id='HQ-SQL-BUNDLE' and temp_id='concurrent'"),1);
 }finally{await Promise.all(clients.map(c=>c.end()));}
});

test('difficulty upgrade preserves committed old-client receipts and one unambiguous RPC signature',async()=>{
 await uid(admin);
 const receipt=await scalar("select public.admin_change_question('00000000-0000-4000-8000-000000000600',100,1,'[\"One\",\"Two\",\"Three\",\"Four\"]',0,false) v");
 assert.equal(receipt.revision,2);
 assert.equal(await scalar('select difficulty_level_id v from public.question where id=100'),2);
 assert.equal(await scalar("select count(*)::integer v from pg_proc where pronamespace='public'::regnamespace and proname='admin_change_question'"),1);
});

test('difficulty edits in all four categories are revision-checked, idempotent and leave Daily snapshots unchanged',async()=>{
 await uid(admin);
 for(const category of [1,2,3,4]){
  const q=await scalar("insert into public.question(image_url,correct_answer,options_json,category_id,difficulty_level_id) values($1,'One',$2,$3,1) returning id v",[`test/difficulty-${category}.webp`,JSON.stringify(options),category]);
  const date=`2010-01-0${category}`;
  await db.query('insert into public.daily_challenge(d,question_id,category_id,difficulty_level_id) values($1,$2,$3,1)',[date,q,category]);
  const op=`00000000-0000-4000-8000-00000000060${category}`;
  const change=d=>scalar('select public.admin_change_question($1,$2,1,$3,0,false,$4) v',[op,q,JSON.stringify(options),d]);
  const receipt=await change(3);assert.deepEqual(await change(3),receipt);
  const detail=await scalar('select public.admin_question_detail($1) v',[q]);
  assert.equal(detail.difficulty_level_id,3);assert.equal(detail.admin_revision,2);assert.equal(detail.correct_answer,'One');
  assert.equal(detail.image_url,`test/difficulty-${category}.webp`);
  assert.equal(await scalar('select difficulty_level_id v from hq_private.daily_questions where d=$1',[date]),1);
  assert.ok((await scalar('select public.admin_question_bank(\'\',$1,3) v',[category])).rows.some(r=>r.id===q));
  await assert.rejects(change(2),/Operation data changed/);
  await assert.rejects(scalar('select public.admin_change_question(gen_random_uuid(),$1,1,$2,0,false,2) v',[q,JSON.stringify(options)]),/Question changed/);
  await assert.rejects(scalar('select public.admin_change_question(gen_random_uuid(),$1,2,$2,0,false,99999) v',[q,JSON.stringify(options)]),/Invalid difficulty/);
  assert.equal(await scalar('select admin_revision v from public.question where id=$1',[q]),2);
 }
});

test('difficulty with a replacement image commits atomically and retries without another version',async()=>{
 await uid(admin);
 const q=await scalar("insert into public.question(image_url,correct_answer,options_json,category_id,difficulty_level_id) values('test/difficulty-photo.webp','One',$1,3,1) returning id v",[JSON.stringify(options)]);
 const id='00000000-0000-4000-8000-000000000610',hash='6'.repeat(64),fp='5'.repeat(64);
 await assert.rejects(scalar('select public.admin_edit_import_reserve($1,$2,$3,$4,null,3,9999,$5,0,true,$6,1) v',[admin,id,fp,hash,JSON.stringify(options),q]),/Invalid/);
 await scalar('select public.admin_edit_import_reserve($1,$2,$3,$4,null,3,2,$5,0,true,$6,1) v',[admin,id,fp,hash,JSON.stringify(options),q]);
 const job=await scalar('select public.admin_import_claim($1,$2,$3) v',[admin,id,fp]);
 const finish=()=>scalar('select public.admin_import_finish($1,$2,$3,$4,$5) v',[admin,id,job.lease_token,fp,hash]);
 await assert.rejects(finish(),/Image upload unconfirmed/);
 assert.equal(await scalar('select difficulty_level_id v from public.question where id=$1',[q]),1);
 await db.query('insert into storage.objects(bucket_id,name,user_metadata,metadata) values($1,$2,$3,$4)',['movies',job.image_path,JSON.stringify({hq_import_id:id,sha256:hash}),JSON.stringify({size:123456})]);
 const receipt=await finish();assert.deepEqual(await finish(),receipt);
 const detail=await scalar('select public.admin_question_detail($1) v',[q]);
 assert.equal(detail.difficulty_level_id,2);assert.equal(detail.admin_revision,2);assert.equal(detail.image_bytes,123456);assert.equal(detail.image_url,job.image_path);
});

test('image size uses current Storage bytes and tolerates absent or malformed metadata',async()=>{
 await uid(admin);
 const q=contentResults[0];
 for(const size of [311190,'311190',0,null,'bad','1.5','-2','999999999999999999999999']){
  await db.query('update storage.objects set metadata=$1 where bucket_id=\'movies\' and name=$2',[JSON.stringify({size}),q.image_path]);
  const detail=await scalar('select public.admin_question_detail($1) v',[q.question_id]);
  assert.equal(detail.image_bytes,typeof size==='number'?size:size==='311190'?311190:null);
  assert.equal(detail.content_metadata.image.photographer,'Example creator');
 }
 const before=await scalar('select public.admin_question_detail($1) v',[q.question_id]);
 await scalar('select public.admin_change_question(gen_random_uuid(),$1,$2,$3,0,false,2) v',[q.question_id,before.admin_revision,JSON.stringify(options)]);
 const after=await scalar('select public.admin_question_detail($1) v',[q.question_id]);
 assert.deepEqual(after.content_metadata,before.content_metadata);
 assert.equal(after.difficulty_level_id,2);
});

test('compact activity sums modes and revisions without legacy counters or overlapping cohorts',async()=>{
 await uid(admin);
 const q=100;
 await db.query("insert into hq_private.question_shown_counts values($1,1,'normal',10),($1,2,'daily',5),($1,2,'time_attack',16)",[q]);
 await db.query("insert into hq_private.question_metrics values($1,1,'normal',5),($1,2,'daily',2),($1,2,'time_attack',5)",[q]);
 await db.query("insert into hq_private.question_cohort_metrics values($1,1,'normal','account',100),($1,1,'normal','first_account',100)",[q]);
 await db.query("insert into public.question_stats(question_id,total_attempts,correct_attempts) values($1,5000,4000) on conflict(question_id) do update set total_attempts=5000,correct_attempts=4000",[q]);
 const metrics=await scalar('select public.admin_question_metrics($1) v',[q]);
 assert.deepEqual(metrics.activity,{shown:31,correct:12,accuracy:38.7});
 assert.equal(metrics.legacy.total_attempts,5000);assert.equal(metrics.cohorts.length,2);
 assert.deepEqual((await scalar('select public.admin_question_metrics(300) v')).activity,{shown:0,correct:0,accuracy:null});
 await uid(player);await db.exec('set role authenticated');try{
  await assert.rejects(scalar('select public.admin_question_metrics($1) v',[q]),/Administrator/);
  await assert.rejects(scalar('select public.admin_question_detail($1) v',[q]),/Administrator/);
  await assert.rejects(scalar('select public.admin_change_question(gen_random_uuid(),100,2,$1,0,false,3) v',[JSON.stringify(options)]),/Administrator/);
 }finally{await db.exec('reset role');}
 await uid(null);await db.exec('set role anon');try{
  await assert.rejects(db.query('select public.admin_question_metrics(100)'),/permission denied/);
  await assert.rejects(db.query('select public.admin_question_detail(100)'),/permission denied/);
 }finally{await db.exec('reset role');}
});
