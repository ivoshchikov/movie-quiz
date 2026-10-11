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
await db.exec('begin');await db.exec(await readFile(new URL('../migrations/20261011165030_question_edit_delete.sql',import.meta.url),'utf8'));await db.exec('commit');
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
 const q=await scalar("insert into public.question(image_url,correct_answer,options_json,category_id,difficulty_level_id) values('test/concurrent.webp','One','[\"One\",\"Two\",\"Three\",\"Four\"]',4,1) returning id v");
 const a=new Client({connectionString:native}),b=new Client({connectionString:native});await a.connect();await b.connect();
 try{
  await Promise.all([a.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]),b.query("select set_config('request.jwt.claim.sub',$1,false)",[admin])]);
  const query='select public.admin_change_question($1,$2,1,$3,0,false) v';
  const outcomes=await Promise.allSettled([a.query(query,['00000000-0000-4000-8000-000000000411',q,JSON.stringify(['A1','A2','A3','A4'])]),b.query(query,['00000000-0000-4000-8000-000000000412',q,JSON.stringify(['B1','B2','B3','B4'])])]);
  assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);const failure=outcomes.find(o=>o.status==='rejected');assert.match(failure.reason.message,/Question changed/);assert.equal(await scalar('select admin_revision v from public.question where id=$1',[q]),2);
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
