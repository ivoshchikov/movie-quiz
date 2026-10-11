-- UI-13 expansion. Deploy before the new frontend; privacy cutover is separate.
create schema if not exists hq_private;
revoke all on schema hq_private from public, anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select auth.uid() = '112743d7-f683-4bbb-8117-068e89a00f22'::uuid
    and exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function hq_private.require_owner(p_owner uuid) returns void
language plpgsql stable set search_path = pg_catalog as $$
begin
  if p_owner is distinct from '112743d7-f683-4bbb-8117-068e89a00f22'::uuid
    or not exists(select 1 from public.admin_users where user_id = p_owner) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
end $$;

create or replace function hq_private.valid_question(p_options jsonb, p_correct text) returns boolean
language plpgsql immutable set search_path = pg_catalog as $$
begin
  if jsonb_typeof(p_options) is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_options) <> 4 or nullif(btrim(p_correct), '') is null then return false; end if;
  return not exists(select 1 from jsonb_array_elements(p_options) a where jsonb_typeof(a) <> 'string')
    and (select count(distinct lower(btrim(value))) from jsonb_array_elements_text(p_options)) = 4
    and not exists(select 1 from jsonb_array_elements_text(p_options) where nullif(btrim(value),'') is null or position(chr(65533) in value) > 0)
    and exists(select 1 from jsonb_array_elements_text(p_options) where btrim(value) = btrim(p_correct));
end $$;

create table hq_private.game_questions (
  token uuid primary key default gen_random_uuid(), owner uuid, question_id integer not null,
  options_json jsonb not null, correct_answer text not null,
  selected text, is_correct boolean, created_at timestamptz not null default clock_timestamp(),
  answered_at timestamptz, expires_at timestamptz not null default clock_timestamp() + interval '1 day'
);
create index on hq_private.game_questions(expires_at);
alter table hq_private.game_questions enable row level security;

create or replace function public.count_questions(p_category_id integer, p_difficulty_id integer default null)
returns integer language sql stable security definer set search_path = pg_catalog as $$
  select count(*)::integer from public.question q where q.category_id = p_category_id
    and (p_difficulty_id is null or q.difficulty_level_id = p_difficulty_id)
    and hq_private.valid_question(q.options_json,q.correct_answer);
$$;

create or replace function public.get_game_question(p_exclude_ids integer[], p_category_id integer, p_difficulty_id integer)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare q public.question; v_token uuid;
begin
  if p_category_id is null or p_difficulty_id is null or coalesce(cardinality(p_exclude_ids),0)>5000 then
    raise exception 'Invalid quiz settings';
  end if;
  delete from hq_private.game_questions where token in
    (select token from hq_private.game_questions where expires_at < clock_timestamp() limit 100);
  select * into q from public.question
    where category_id=p_category_id and difficulty_level_id=p_difficulty_id
      and id <> all(coalesce(p_exclude_ids,'{}'::integer[]))
      and hq_private.valid_question(options_json,correct_answer) order by random() limit 1;
  if not found then return null; end if;
  insert into hq_private.game_questions(owner,question_id,options_json,correct_answer)
    values(auth.uid(),q.id,q.options_json,q.correct_answer) returning token into v_token;
  return jsonb_build_object('id',q.id,'image_url',q.image_url,'options_json',q.options_json,
    'category_id',q.category_id,'difficulty_level_id',q.difficulty_level_id,'answer_token',v_token);
end $$;

create or replace function public.answer_game_question(p_token uuid, p_answer text)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare t hq_private.game_questions; v_correct boolean;
begin
  select * into t from hq_private.game_questions where token=p_token for update;
  if not found or (t.owner is not null and t.owner is distinct from auth.uid()) then
    raise exception 'Question unavailable' using errcode='42501';
  end if;
  if t.answered_at is not null then
    if t.selected is distinct from p_answer then raise exception 'Answer already recorded'; end if;
    return t.is_correct;
  end if;
  if t.expires_at < clock_timestamp() then raise exception 'Question expired'; end if;
  if p_answer is null or not exists(select 1 from jsonb_array_elements_text(t.options_json) where value=p_answer) then
    raise exception 'Choose an available answer';
  end if;
  v_correct := lower(btrim(t.correct_answer)) = lower(btrim(p_answer));
  update hq_private.game_questions set selected=p_answer,is_correct=v_correct,answered_at=clock_timestamp() where token=p_token;
  perform public.touch_question_stats(t.question_id,v_correct);
  return v_correct;
end $$;

-- The inner legacy function is only used by this definer; never return its answer.
create or replace function public.get_daily_question_public(p_date date default (now() at time zone 'America/Chicago')::date)
returns table(id integer,image_url text,options_json jsonb,category_id integer,difficulty_level_id integer)
language plpgsql security definer set search_path=pg_catalog as $$
begin
  if p_date is null or p_date > (clock_timestamp() at time zone 'America/Chicago')::date
    or (p_date <> (clock_timestamp() at time zone 'America/Chicago')::date and not exists
      (select 1 from public.daily_session where user_id=auth.uid() and d=p_date)) then
    raise exception 'Daily unavailable';
  end if;
  return query select q.id,q.image_url,q.options_json,q.category_id,q.difficulty_level_id
    from public.get_daily_question(p_date) d join public.question q on q.id=d.id
    where hq_private.valid_question(q.options_json,q.correct_answer);
end $$;

create or replace function public.submit_daily_answer(p_user_id uuid,p_date date,p_answer text,p_time integer)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare v_correct boolean; q public.question;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Account mismatch' using errcode='42501';
  end if;
  if p_date is null or p_date > (clock_timestamp() at time zone 'America/Chicago')::date then raise exception 'Daily unavailable'; end if;
  if exists(select 1 from public.daily_result where user_id=auth.uid() and d=p_date) then return; end if;
  if not exists(select 1 from public.daily_session where user_id=auth.uid() and d=p_date) then raise exception 'Start Daily first'; end if;
  select s.* into q from public.question s join public.daily_challenge d on d.question_id=s.id where d.d=p_date;
  if not found or not hq_private.valid_question(q.options_json,q.correct_answer) then raise exception 'Daily unavailable'; end if;
  if not exists(select 1 from jsonb_array_elements_text(q.options_json) where value=p_answer) then raise exception 'Choose an available answer'; end if;
  v_correct := btrim(p_answer)=btrim(q.correct_answer);
  perform public.submit_daily_result(p_user_id,p_date,v_correct,p_time);
end $$;

create or replace function public.admin_question_bank(p_search text default '',p_category_id integer default null,
  p_difficulty_id integer default null,p_sort text default 'id_desc',p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare v_pattern text; v_total integer; v_page integer; v_rows jsonb; v_summary jsonb;
begin
  perform hq_private.require_owner(auth.uid());
  if length(coalesce(p_search,''))>200 or p_sort not in('id_desc','id_asc','answer_asc') or p_page<1 or p_page>100000 then raise exception 'Invalid filters'; end if;
  v_pattern := '%' || replace(replace(replace(lower(btrim(coalesce(p_search,''))),chr(92),chr(92)||chr(92)),'%',chr(92)||'%'),'_',chr(92)||'_') || '%';
  select count(*)::integer into v_total from public.question q
    where (p_category_id is null or q.category_id=p_category_id or (p_category_id=0 and q.category_id is null)) and (p_difficulty_id is null or q.difficulty_level_id=p_difficulty_id)
      and (p_search='' or lower(q.correct_answer) like v_pattern or lower(q.options_json::text) like v_pattern
        or lower(q.image_url) like v_pattern or q.id::text=replace(btrim(p_search),'#',''));
  v_page := least(p_page,greatest(1,ceil(v_total/25.0)::integer));
  select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) into v_rows from
    (select q.*,not hq_private.valid_question(q.options_json,q.correct_answer) as needs_review from public.question q
      where (p_category_id is null or q.category_id=p_category_id or (p_category_id=0 and q.category_id is null)) and (p_difficulty_id is null or q.difficulty_level_id=p_difficulty_id)
        and (p_search='' or lower(q.correct_answer) like v_pattern or lower(q.options_json::text) like v_pattern
          or lower(q.image_url) like v_pattern or q.id::text=replace(btrim(p_search),'#',''))
      order by case when p_sort='answer_asc' then lower(q.correct_answer) end asc,
        case when p_sort='id_asc' then q.id end asc,q.id desc limit 25 offset (v_page-1)*25) rows;
  select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into v_summary from
    (select c.id as category_id,l.id as difficulty_level_id,count(q.id)::integer as count
      from (select id from public.category union all select 0) c cross join public.difficulty_level l
      left join public.question q on coalesce(q.category_id,0)=c.id and q.difficulty_level_id=l.id group by c.id,l.id order by c.id,l.id) s;
  return jsonb_build_object('rows',v_rows,'total',v_total,'page',v_page,'page_size',25,
    'bank_total',(select count(*)::integer from public.question),'summary',v_summary);
end $$;

create or replace function public.admin_question_detail(p_id integer) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare v jsonb;
begin
  perform hq_private.require_owner(auth.uid());
  select to_jsonb(q)||jsonb_build_object('needs_review',not hq_private.valid_question(q.options_json,q.correct_answer))
    into v from public.question q where id=p_id;
  return v;
end $$;

create table hq_private.question_namespaces (
  category_id integer primary key references public.category(id),folder text unique not null,prefix text not null,
  last_number integer not null default 0 check(last_number>=0)
);
insert into hq_private.question_namespaces(category_id,folder,prefix) values
  (1,'general','g'),(2,'actors','act'),(3,'actresses','actr'),(4,'series','tv');
update hq_private.question_namespaces n set last_number=coalesce((
  select max(substring(p.path from '_([0-9]+)[.]webp$')::integer) from
    (select image_url path from public.question union all select name from storage.objects where bucket_id='movies') p
    where p.path ~ ('^'||n.folder||'/'||n.prefix||'_[0-9]+[.]webp$')),0);

create table hq_private.question_imports (
  id uuid primary key,owner uuid not null,fingerprint text not null check(fingerprint ~ '^[0-9a-f]{64}$'),
  file_hash text not null check(file_hash ~ '^[0-9a-f]{64}$'),source_hash text,
  category_id integer not null references public.category(id),difficulty_level_id integer not null references public.difficulty_level(id),
  options_json jsonb not null,correct_index integer not null check(correct_index between 0 and 3),
  image_path text unique not null,status text not null default 'reserved' check(status in('reserved','uploaded','committed','expired')),
  question_id integer references public.question(id),duplicate_confirmed boolean not null default false,staging_cleaned boolean not null default false,
  lease_token uuid,lease_until timestamptz,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp()
);
create table hq_private.question_images (
  image_path text primary key,file_hash text not null check(file_hash ~ '^[0-9a-f]{64}$'),
  source_hash text,question_id integer references public.question(id)
);
create index on hq_private.question_images(file_hash);
create index on hq_private.question_images(source_hash) where source_hash is not null;
create index on hq_private.question_imports(updated_at) where status <> 'committed';
alter table hq_private.question_namespaces enable row level security;
alter table hq_private.question_imports enable row level security;
alter table hq_private.question_images enable row level security;

-- Serialize manual references to an imported path with orphan cleanup.
-- A path marked expired must never become a question after cleanup starts.
create function hq_private.protect_import_reference() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare v_status text;
begin
  select status into v_status from hq_private.question_imports
    where image_path=new.image_url for key share;
  if v_status='expired' then raise exception 'Imported image expired; attach it as a new question'; end if;
  return new;
end $$;
create trigger protect_import_reference before insert or update of image_url on public.question
for each row execute function hq_private.protect_import_reference();

-- Service-only calls use an owner verified from getUser and is_admin by the Edge Function.
create or replace function public.admin_import_reserve(p_owner uuid,p_id uuid,p_fingerprint text,p_hash text,
 p_source_hash text,p_category integer,p_difficulty integer,p_options jsonb,p_correct_index integer,p_allow_duplicate boolean default false)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare j hq_private.question_imports; n hq_private.question_namespaces; v_path text; v_duplicate integer;
begin
  perform hq_private.require_owner(p_owner);
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,1313));
  select * into j from hq_private.question_imports where id=p_id for update;
  if found then
    if j.owner<>p_owner or j.fingerprint<>p_fingerprint then raise exception 'Import data changed'; end if;
    if j.status='expired' then raise exception 'Draft expired'; end if;
    if p_allow_duplicate then update hq_private.question_imports set duplicate_confirmed=true where id=p_id; end if;
    return to_jsonb(j)-'lease_token';
  end if;
  if p_correct_index not between 0 and 3 or not hq_private.valid_question(p_options,p_options->>p_correct_index)
    or exists(select 1 from jsonb_array_elements_text(p_options) where length(value)>200 or value<>btrim(value) or value<>normalize(value,NFC)) then raise exception 'Invalid answers'; end if;
  if not exists(select 1 from public.difficulty_level where id=p_difficulty) then raise exception 'Invalid difficulty'; end if;
  select question_id into v_duplicate from hq_private.question_images where file_hash=p_hash
    or (p_source_hash is not null and (file_hash=p_source_hash or source_hash=p_source_hash)) limit 1;
  if found and not p_allow_duplicate then
    return jsonb_build_object('status','duplicate','question_id',v_duplicate);
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_hash,1314));
  if not p_allow_duplicate and exists(select 1 from hq_private.question_imports where file_hash=p_hash and status<>'expired') then
    return jsonb_build_object('status','duplicate','question_id',null);
  end if;
  select * into n from hq_private.question_namespaces where category_id=p_category for update;
  if not found then raise exception 'Unsupported image category'; end if;
  loop
    if n.last_number>=2147483646 then raise exception 'Image number limit reached'; end if;
    n.last_number:=n.last_number+1;
    v_path:=n.folder||'/'||n.prefix||'_'||lpad(n.last_number::text,greatest(5,length(n.last_number::text)),'0')||'.webp';
    exit when not exists(select 1 from storage.objects where bucket_id='movies' and name=v_path)
      and not exists(select 1 from public.question where image_url=v_path)
      and not exists(select 1 from hq_private.question_imports where image_path=v_path);
  end loop;
  update hq_private.question_namespaces set last_number=n.last_number where category_id=n.category_id;
  insert into hq_private.question_imports(id,owner,fingerprint,file_hash,source_hash,category_id,difficulty_level_id,options_json,correct_index,image_path,duplicate_confirmed)
    values(p_id,p_owner,p_fingerprint,p_hash,p_source_hash,p_category,p_difficulty,p_options,p_correct_index,v_path,p_allow_duplicate) returning * into j;
  return to_jsonb(j)-'lease_token';
end $$;

create or replace function public.admin_import_claim(p_owner uuid,p_id uuid,p_fingerprint text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare j hq_private.question_imports;
begin
  perform hq_private.require_owner(p_owner);
  select * into j from hq_private.question_imports where id=p_id and owner=p_owner for update;
  if not found or j.fingerprint<>p_fingerprint then raise exception 'Import unavailable'; end if;
  if j.status='committed' then return to_jsonb(j)-'lease_token'; end if;
  if j.status='expired' then raise exception 'Draft expired'; end if;
  if j.lease_until>clock_timestamp() then return jsonb_build_object('status','busy'); end if;
  update hq_private.question_imports set lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '2 minutes',updated_at=clock_timestamp()
    where id=p_id returning * into j;
  return to_jsonb(j);
end $$;

create or replace function public.admin_import_finish(p_owner uuid,p_id uuid,p_lease uuid,p_fingerprint text,p_hash text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare j hq_private.question_imports; v_id integer;
begin
  perform hq_private.require_owner(p_owner);
  select * into j from hq_private.question_imports where id=p_id and owner=p_owner for update;
  if not found or j.fingerprint<>p_fingerprint or j.file_hash<>p_hash then raise exception 'Import unavailable'; end if;
  if j.status='committed' then return jsonb_build_object('status','committed','question_id',j.question_id,'image_path',j.image_path); end if;
  if j.lease_token is distinct from p_lease or j.lease_until<clock_timestamp() or j.status='expired' then raise exception 'Import lease expired'; end if;
  if not exists(select 1 from storage.objects where bucket_id='movies' and name=j.image_path
    and user_metadata->>'hq_import_id'=p_id::text and user_metadata->>'sha256'=p_hash) then raise exception 'Image upload unconfirmed'; end if;
  insert into public.question(image_url,correct_answer,options_json,category_id,difficulty_level_id)
    values(j.image_path,j.options_json->>j.correct_index,j.options_json,j.category_id,j.difficulty_level_id) returning id into v_id;
  insert into hq_private.question_images(image_path,file_hash,source_hash,question_id) values(j.image_path,j.file_hash,j.source_hash,v_id);
  update hq_private.question_imports set status='committed',question_id=v_id,updated_at=clock_timestamp(),lease_token=null,lease_until=null where id=p_id;
  return jsonb_build_object('status','committed','question_id',v_id,'image_path',j.image_path);
end $$;

create or replace function public.admin_import_release(p_owner uuid,p_id uuid,p_lease uuid) returns void
language plpgsql security definer set search_path=pg_catalog as $$
begin
  perform hq_private.require_owner(p_owner);
  update hq_private.question_imports set lease_token=null,lease_until=null,updated_at=clock_timestamp()
    where id=p_id and owner=p_owner and lease_token=p_lease and status<>'committed';
end $$;

create or replace function public.admin_import_status(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
  perform hq_private.require_owner(auth.uid());
  return (select jsonb_build_object('status',status,'question_id',question_id,'image_path',image_path,'fingerprint',fingerprint)
    from hq_private.question_imports where id=p_id and owner=auth.uid());
end $$;

-- Prevent primary-key collisions after historical imports. Never move a sequence back.
lock table public.question in share row exclusive mode;
select setval('public.question_id_seq',greatest((select last_value from public.question_id_seq),coalesce((select max(id) from public.question),1)),true);

-- Staging can only be accessed by the server; no client Storage write policy is added.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('question-staging','question-staging',false,1048576,array['image/webp']) on conflict(id) do nothing;

revoke all on all tables in schema hq_private from public,anon,authenticated;
revoke all on all functions in schema hq_private from public,anon,authenticated;
revoke all on function public.count_questions(integer,integer),public.get_game_question(integer[],integer,integer),
  public.answer_game_question(uuid,text),public.submit_daily_answer(uuid,date,text,integer),
  public.admin_question_bank(text,integer,integer,text,integer),public.admin_question_detail(integer),
  public.admin_import_status(uuid) from public,anon,authenticated;
grant execute on function public.count_questions(integer,integer),public.get_game_question(integer[],integer,integer),
  public.answer_game_question(uuid,text) to anon,authenticated;
grant execute on function public.submit_daily_answer(uuid,date,text,integer),public.admin_question_bank(text,integer,integer,text,integer),
  public.admin_question_detail(integer),public.admin_import_status(uuid) to authenticated;
revoke all on function public.admin_import_reserve(uuid,uuid,text,text,text,integer,integer,jsonb,integer,boolean),
  public.admin_import_claim(uuid,uuid,text),public.admin_import_finish(uuid,uuid,uuid,text,text),
  public.admin_import_release(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_import_reserve(uuid,uuid,text,text,text,integer,integer,jsonb,integer,boolean),
  public.admin_import_claim(uuid,uuid,text),public.admin_import_finish(uuid,uuid,uuid,text,text),
  public.admin_import_release(uuid,uuid,uuid) to service_role;

create or replace function public.admin_import_repath(p_owner uuid,p_id uuid,p_lease uuid) returns text
language plpgsql security definer set search_path=pg_catalog as $$
declare j hq_private.question_imports; n hq_private.question_namespaces; v_path text;
begin
  perform hq_private.require_owner(p_owner);
  select * into j from hq_private.question_imports where id=p_id and owner=p_owner for update;
  if not found or j.status='committed' or j.status='expired' or j.lease_token is distinct from p_lease or j.lease_until<clock_timestamp() then raise exception 'Import unavailable'; end if;
  select * into n from hq_private.question_namespaces where category_id=j.category_id for update;
  loop
    if n.last_number>=2147483646 then raise exception 'Image number limit reached'; end if;
    n.last_number:=n.last_number+1;
    v_path:=n.folder||'/'||n.prefix||'_'||lpad(n.last_number::text,greatest(5,length(n.last_number::text)),'0')||'.webp';
    exit when not exists(select 1 from storage.objects where bucket_id='movies' and name=v_path)
      and not exists(select 1 from public.question where image_url=v_path)
      and not exists(select 1 from hq_private.question_imports where image_path=v_path);
  end loop;
  update hq_private.question_namespaces set last_number=n.last_number where category_id=n.category_id;
  update hq_private.question_imports set image_path=v_path,updated_at=clock_timestamp() where id=p_id;
  return v_path;
end $$;

create or replace function public.admin_import_object(p_owner uuid,p_path text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
  perform hq_private.require_owner(p_owner);
  return (select jsonb_build_object('metadata',metadata,'user_metadata',user_metadata) from storage.objects where bucket_id='movies' and name=p_path);
end $$;

create or replace function public.admin_import_cleanup(p_owner uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare j hq_private.question_imports; v_result jsonb := '[]'::jsonb;
begin
  perform hq_private.require_owner(p_owner);
  for j in select * from hq_private.question_imports where owner=p_owner
    and not staging_cleaned and created_at<clock_timestamp()-interval '7 days' and (lease_until is null or lease_until<clock_timestamp())
    and status in('reserved','uploaded','committed','expired') order by created_at limit 50 for update skip locked loop
    if j.status='committed' then
      v_result:=v_result||jsonb_build_array(jsonb_build_object('id',j.id,'final_path',null));
    elsif not exists(select 1 from public.question where image_url=j.image_path) then
      update hq_private.question_imports set status='expired',lease_token=null,lease_until=null where id=j.id;
      v_result:=v_result||jsonb_build_array(jsonb_build_object('id',j.id,'final_path',case when exists
        (select 1 from storage.objects where bucket_id='movies' and name=j.image_path and user_metadata->>'hq_import_id'=j.id::text and user_metadata->>'sha256'=j.file_hash)
        then j.image_path else null end));
    end if;
  end loop;
  return v_result;
end $$;
revoke all on function public.admin_import_repath(uuid,uuid,uuid),public.admin_import_object(uuid,text),public.admin_import_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.admin_import_repath(uuid,uuid,uuid),public.admin_import_object(uuid,text),public.admin_import_cleanup(uuid) to service_role;

create or replace function public.admin_import_cleanup_ack(p_owner uuid,p_id uuid) returns void
language plpgsql security definer set search_path=pg_catalog as $$
begin
  perform hq_private.require_owner(p_owner);
  update hq_private.question_imports j set staging_cleaned=true where id=p_id and owner=p_owner and status in('committed','expired')
    and not exists(select 1 from storage.objects where bucket_id='question-staging' and name=p_owner::text||'/'||p_id::text||'.webp')
    and (status='committed' or not exists(select 1 from storage.objects where bucket_id='movies' and name=j.image_path and user_metadata->>'hq_import_id'=p_id::text));
end $$;
revoke all on function public.admin_import_cleanup_ack(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_import_cleanup_ack(uuid,uuid) to service_role;

-- Local drafts are encrypted. A different account in the same browser cannot decrypt them.
create table hq_private.admin_draft_keys(owner uuid primary key,secret text not null);
alter table hq_private.admin_draft_keys enable row level security;
revoke all on hq_private.admin_draft_keys from public,anon,authenticated;
create or replace function public.admin_draft_key() returns text
language plpgsql security definer set search_path=pg_catalog as $$
begin
  perform hq_private.require_owner(auth.uid());
  insert into hq_private.admin_draft_keys(owner,secret) values(auth.uid(),encode(extensions.gen_random_bytes(32),'hex')) on conflict(owner) do nothing;
  return (select secret from hq_private.admin_draft_keys where owner=auth.uid());
end $$;
revoke all on function public.admin_draft_key() from public,anon,authenticated;
grant execute on function public.admin_draft_key() to authenticated;
