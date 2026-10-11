-- Owner-only edits, retirement and immutable Daily versions. No files are overwritten or removed.
alter table public.question add column admin_revision integer not null default 1;
alter table public.question add column retired_at timestamptz;
alter table hq_private.question_imports add column edit_question_id integer references public.question(id);
alter table hq_private.question_imports add column edit_revision integer;
create table hq_private.question_changes(id uuid primary key, owner uuid not null, request jsonb not null, result jsonb not null, before_question jsonb not null, changed_at timestamptz not null default clock_timestamp());
alter table hq_private.question_changes enable row level security;
create table hq_private.daily_questions(d date primary key references public.daily_challenge(d) on delete cascade, question_id integer not null, image_url text not null, options_json jsonb not null, correct_answer text not null, category_id integer, difficulty_level_id integer not null);
alter table hq_private.daily_questions enable row level security;
insert into hq_private.daily_questions select dc.d,q.id,q.image_url,q.options_json,q.correct_answer,q.category_id,q.difficulty_level_id from public.daily_challenge dc join public.question q on q.id=dc.question_id;
create function hq_private.snapshot_daily_question() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare q public.question;
begin
 if tg_op='UPDATE' and new.question_id=old.question_id then return new; end if;
 select * into q from public.question where id=new.question_id for share;
 if not found or q.retired_at is not null then raise exception 'Question unavailable'; end if;
 insert into hq_private.daily_questions values(new.d,q.id,q.image_url,q.options_json,q.correct_answer,q.category_id,q.difficulty_level_id)
 on conflict(d) do update set question_id=excluded.question_id,image_url=excluded.image_url,options_json=excluded.options_json,correct_answer=excluded.correct_answer,category_id=excluded.category_id,difficulty_level_id=excluded.difficulty_level_id;
 return new;
end $$;
create trigger snapshot_daily_question after insert or update of question_id on public.daily_challenge for each row execute function hq_private.snapshot_daily_question();
create function hq_private.advance_question_revision() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if old.admin_revision=2147483647 then raise exception 'Question revision limit reached'; end if;
 new.admin_revision:=old.admin_revision+1;return new;
end $$;
create trigger advance_question_revision before update on public.question for each row execute function hq_private.advance_question_revision();
create function public.admin_change_question(p_operation uuid,p_id integer,p_revision integer,p_options jsonb default null,p_correct_index integer default null,p_delete boolean default false) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare q public.question; v_request jsonb; v_result jsonb; previous hq_private.question_changes;
begin
 perform hq_private.require_owner(auth.uid());
 if p_operation is null or p_id is null or p_id<1 or p_revision is null or p_revision<1 or p_delete is null then raise exception 'Invalid question settings';end if;
 v_request:=jsonb_build_object('id',p_id,'revision',p_revision,'options',p_options,'correct_index',p_correct_index,'delete',p_delete);
 perform pg_advisory_xact_lock(hashtextextended(p_operation::text,7));
 select * into previous from hq_private.question_changes where id=p_operation;
 if found then
  if previous.owner is distinct from auth.uid() or previous.request is distinct from v_request then raise exception 'Operation data changed';end if;
  return previous.result;
 end if;
 select * into q from public.question where id=p_id for update;
 if not found or q.retired_at is not null then raise exception 'Question unavailable';end if;
 if q.admin_revision<>p_revision then raise exception 'Question changed. Reload before editing.' using errcode='40001';end if;
 if not p_delete then
  if p_correct_index is null or p_correct_index not between 0 and 3 or not hq_private.valid_question(p_options,p_options->>p_correct_index)
    or exists(select 1 from jsonb_array_elements_text(p_options) s where length(s)>200 or s<>btrim(s) or s~'[[:cntrl:]]') then raise exception 'Invalid answers';end if;
  update public.question set options_json=p_options,correct_answer=p_options->>p_correct_index where id=p_id;
 else update public.question set retired_at=clock_timestamp() where id=p_id;
 end if;
 v_result:=jsonb_build_object('status','committed','question_id',p_id,'deleted',p_delete,'revision',p_revision+1);
 insert into hq_private.question_changes(id,owner,request,result,before_question) values(p_operation,auth.uid(),v_request,v_result,to_jsonb(q));
 return v_result;
end $$;
create function public.admin_edit_import_reserve(p_owner uuid,p_id uuid,p_fingerprint text,p_hash text,p_source_hash text,p_category integer,p_difficulty integer,p_options jsonb,p_correct_index integer,p_allow_duplicate boolean,p_question_id integer,p_revision integer) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare q public.question; j hq_private.question_imports; result jsonb;
begin
 perform hq_private.require_owner(p_owner);
 if p_question_id is null or p_revision is null then raise exception 'Invalid edit target';end if;
 -- Lock order is import then question, shared with finish/cleanup.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1313));
 select * into j from hq_private.question_imports where id=p_id for update;
 if found then
  if j.owner is distinct from p_owner or j.fingerprint<>p_fingerprint or j.edit_question_id is distinct from p_question_id or j.edit_revision is distinct from p_revision then raise exception 'Import data changed';end if;
  if j.status='committed' then return jsonb_build_object('status','committed','question_id',j.question_id,'image_path',j.image_path);end if;
 end if;
 select * into q from public.question where id=p_question_id for update;
 if not found or q.retired_at is not null then raise exception 'Question unavailable';end if;
 if q.admin_revision<>p_revision then raise exception 'Question changed. Reload before editing.' using errcode='40001';end if;
 if q.category_id is distinct from p_category or q.difficulty_level_id<>p_difficulty then raise exception 'Invalid edit settings';end if;
 result:=public.admin_import_reserve(p_owner,p_id,p_fingerprint,p_hash,p_source_hash,p_category,p_difficulty,p_options,p_correct_index,p_allow_duplicate);
 if result->>'status'<>'duplicate' then update hq_private.question_imports set edit_question_id=p_question_id,edit_revision=p_revision where id=p_id;end if;
 return result;
end $$;
create or replace function public.count_questions(p_category_id integer, p_difficulty_id integer default null)
returns integer language sql stable security definer set search_path = pg_catalog as $$
  select count(*)::integer from public.question q where q.retired_at is null and q.category_id = p_category_id
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
    where retired_at is null and category_id=p_category_id and difficulty_level_id=p_difficulty_id
      and id <> all(coalesce(p_exclude_ids,'{}'::integer[]))
      and hq_private.valid_question(options_json,correct_answer) order by random() limit 1;
  if not found then return null; end if;
  insert into hq_private.game_questions(owner,question_id,options_json,correct_answer)
    values(auth.uid(),q.id,q.options_json,q.correct_answer) returning token into v_token;
  return jsonb_build_object('id',q.id,'image_url',q.image_url,'options_json',q.options_json,
    'category_id',q.category_id,'difficulty_level_id',q.difficulty_level_id,'answer_token',v_token);
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
    where q.retired_at is null and (p_category_id is null or q.category_id=p_category_id or (p_category_id=0 and q.category_id is null)) and (p_difficulty_id is null or q.difficulty_level_id=p_difficulty_id)
      and (p_search='' or lower(q.correct_answer) like v_pattern or lower(q.options_json::text) like v_pattern
        or lower(q.image_url) like v_pattern or q.id::text=replace(btrim(p_search),'#',''));
  v_page := least(p_page,greatest(1,ceil(v_total/25.0)::integer));
  select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) into v_rows from
    (select q.*,not hq_private.valid_question(q.options_json,q.correct_answer) as needs_review from public.question q
      where q.retired_at is null and (p_category_id is null or q.category_id=p_category_id or (p_category_id=0 and q.category_id is null)) and (p_difficulty_id is null or q.difficulty_level_id=p_difficulty_id)
        and (p_search='' or lower(q.correct_answer) like v_pattern or lower(q.options_json::text) like v_pattern
          or lower(q.image_url) like v_pattern or q.id::text=replace(btrim(p_search),'#',''))
      order by case when p_sort='answer_asc' then lower(q.correct_answer) end asc,
        case when p_sort='id_asc' then q.id end asc,q.id desc limit 25 offset (v_page-1)*25) rows;
  select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into v_summary from
    (select c.id as category_id,l.id as difficulty_level_id,count(q.id)::integer as count
      from (select id from public.category union all select 0) c cross join public.difficulty_level l
      left join public.question q on coalesce(q.category_id,0)=c.id and q.difficulty_level_id=l.id and q.retired_at is null group by c.id,l.id order by c.id,l.id) s;
  return jsonb_build_object('rows',v_rows,'total',v_total,'page',v_page,'page_size',25,
    'bank_total',(select count(*)::integer from public.question where retired_at is null),'summary',v_summary);
end $$;
create or replace function public.admin_question_detail(p_id integer) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare v jsonb;
begin
  perform hq_private.require_owner(auth.uid());
  select to_jsonb(q)||jsonb_build_object('needs_review',not hq_private.valid_question(q.options_json,q.correct_answer))
    into v from public.question q where id=p_id and retired_at is null;
  return v;
end $$;
create or replace function public.admin_import_finish(p_owner uuid,p_id uuid,p_lease uuid,p_fingerprint text,p_hash text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare j hq_private.question_imports; v_id integer; q public.question;
begin
  perform hq_private.require_owner(p_owner);
  select * into j from hq_private.question_imports where id=p_id and owner=p_owner for update;
  if not found or j.fingerprint<>p_fingerprint or j.file_hash<>p_hash then raise exception 'Import unavailable'; end if;
  if j.status='committed' then return jsonb_build_object('status','committed','question_id',j.question_id,'image_path',j.image_path); end if;
  if j.lease_token is distinct from p_lease or j.lease_until<clock_timestamp() or j.status='expired' then raise exception 'Import lease expired'; end if;
  if not exists(select 1 from storage.objects where bucket_id='movies' and name=j.image_path
    and user_metadata->>'hq_import_id'=p_id::text and user_metadata->>'sha256'=p_hash) then raise exception 'Image upload unconfirmed'; end if;
  if j.edit_question_id is not null then
    select * into q from public.question where id=j.edit_question_id for update;
    if not found or q.retired_at is not null then raise exception 'Question unavailable';end if;
    if q.admin_revision<>j.edit_revision then raise exception 'Question changed. Reload before editing.' using errcode='40001';end if;
    update public.question set image_url=j.image_path,options_json=j.options_json,correct_answer=j.options_json->>j.correct_index where id=q.id returning id into v_id;
    insert into hq_private.question_changes(id,owner,request,result,before_question) values(j.id,p_owner,jsonb_build_object('image_import',j.id),jsonb_build_object('status','committed','question_id',v_id),to_jsonb(q));
  else
  insert into public.question(image_url,correct_answer,options_json,category_id,difficulty_level_id)
    values(j.image_path,j.options_json->>j.correct_index,j.options_json,j.category_id,j.difficulty_level_id) returning id into v_id;
  end if;
  insert into hq_private.question_images(image_path,file_hash,source_hash,question_id) values(j.image_path,j.file_hash,j.source_hash,v_id);
  update hq_private.question_imports set status='committed',question_id=v_id,updated_at=clock_timestamp(),lease_token=null,lease_until=null where id=p_id;
  return jsonb_build_object('status','committed','question_id',v_id,'image_path',j.image_path);
end $$;
create or replace function public.get_daily_question_public(p_date date default (now() at time zone 'America/Chicago')::date)
returns table(id integer,image_url text,options_json jsonb,category_id integer,difficulty_level_id integer)
language plpgsql security definer set search_path=pg_catalog as $$
begin
  if p_date is null or p_date > (clock_timestamp() at time zone 'America/Chicago')::date
    or (p_date <> (clock_timestamp() at time zone 'America/Chicago')::date and not exists
      (select 1 from public.daily_session where user_id=auth.uid() and d=p_date)) then
    raise exception 'Daily unavailable';
  end if;
  return query select q.question_id,q.image_url,q.options_json,q.category_id,q.difficulty_level_id
    from public.get_daily_question(p_date) d join hq_private.daily_questions q on q.d=p_date and q.question_id=d.id
    where hq_private.valid_question(q.options_json,q.correct_answer);
end $$;
create or replace function public.submit_daily_answer(p_user_id uuid,p_date date,p_answer text,p_time integer)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare v_correct boolean; q hq_private.daily_questions;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Account mismatch' using errcode='42501';
  end if;
  if p_date is null or p_date > (clock_timestamp() at time zone 'America/Chicago')::date then raise exception 'Daily unavailable'; end if;
  if exists(select 1 from public.daily_result where user_id=auth.uid() and d=p_date) then return; end if;
  if not exists(select 1 from public.daily_session where user_id=auth.uid() and d=p_date) then raise exception 'Start Daily first'; end if;
  select s.* into q from hq_private.daily_questions s where s.d=p_date;
  if not found or not hq_private.valid_question(q.options_json,q.correct_answer) then raise exception 'Daily unavailable'; end if;
  if not exists(select 1 from jsonb_array_elements_text(q.options_json) where value=p_answer) then raise exception 'Choose an available answer'; end if;
  v_correct := btrim(p_answer)=btrim(q.correct_answer);
  perform public.submit_daily_result(p_user_id,p_date,v_correct,p_time);
end $$;
CREATE OR REPLACE FUNCTION public.get_daily_archive_public(p_limit integer DEFAULT 30, p_offset integer DEFAULT 0)
 RETURNS TABLE(d date, image_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select dc.d, q.image_url
  from public.daily_challenge dc
  join hq_private.daily_questions q on q.d = dc.d
  order by dc.d desc
  limit greatest(1, least(365, coalesce(p_limit,30)))
  offset greatest(0, coalesce(p_offset,0));
$function$
;
CREATE OR REPLACE FUNCTION public.get_daily_history_admin(p_limit integer DEFAULT 30, p_offset integer DEFAULT 0)
 RETURNS TABLE(d date, question_id integer, image_url text, correct_answer text, category_id integer, difficulty_level_id integer, total_answers integer, correct_answers integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden: admin only'; end if;
  return query
  with agg as (select r.d, count(*)::int as total_answers, count(*) filter (where r.is_correct)::int as correct_answers from public.daily_result r group by r.d)
  select dc.d, dc.question_id, coalesce(q.image_url, ''), coalesce(nullif(btrim(q.correct_answer), ''), 'Question #' || dc.question_id || ' (unavailable)'), dc.category_id, dc.difficulty_level_id, coalesce(a.total_answers, 0), coalesce(a.correct_answers, 0), dc.created_at
  from public.daily_challenge dc left join hq_private.daily_questions q on q.d = dc.d left join agg a on a.d = dc.d
  order by dc.d desc limit greatest(1, least(365, coalesce(p_limit, 30))) offset greatest(0, coalesce(p_offset, 0));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_daily_question(p_date date DEFAULT ((now() AT TIME ZONE 'America/Chicago'::text))::date)
 RETURNS TABLE(id integer, image_url text, options_json jsonb, correct_answer text, category_id integer, difficulty_level_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- уже закреплён?
  return query
  select q.question_id, q.image_url, q.options_json, NULL::text, q.category_id, q.difficulty_level_id
  from public.daily_challenge dc
  join hq_private.daily_questions q on q.d = dc.d
  where dc.d = p_date
  limit 1;

  if found then return; end if;

  -- выбрать случайный вопрос, не использовавшийся за 30 дней
  with recent as (
    select question_id
    from public.daily_challenge
    where d >= p_date - interval '30 days'
  ),
  pool as (
    select q.*
    from public.question q
    left join recent r on r.question_id = q.id
    where q.retired_at is null and r.question_id is null
      and hq_private.valid_question(q.options_json,q.correct_answer)
      and q.category_id in (1,2)  -- при необходимости поправьте набор
  ),
  pick as (
    select * from pool
    order by random()
    limit 1
  )
  insert into public.daily_challenge(d, question_id, category_id, difficulty_level_id)
  select p_date, p.id, p.category_id, p.difficulty_level_id
  from pick p
  on conflict (d) do nothing;

  -- возвращаем закреплённый вопрос
  return query
  select q.question_id, q.image_url, q.options_json, NULL::text, q.category_id, q.difficulty_level_id
  from public.daily_challenge dc
  join hq_private.daily_questions q on q.d = dc.d
  where dc.d = p_date
  limit 1;
end;
$function$
;
revoke all on all tables in schema hq_private from public,anon,authenticated;
revoke all on function public.admin_change_question(uuid,integer,integer,jsonb,integer,boolean),public.admin_edit_import_reserve(uuid,uuid,text,text,text,integer,integer,jsonb,integer,boolean,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_change_question(uuid,integer,integer,jsonb,integer,boolean) to authenticated;
grant execute on function public.admin_edit_import_reserve(uuid,uuid,text,text,text,integer,integer,jsonb,integer,boolean,integer,integer) to service_role;
revoke all on function hq_private.snapshot_daily_question(),hq_private.advance_question_revision() from public,anon,authenticated;

alter policy question_owner_read on public.question using ((select public.is_admin()) and retired_at is null);

create function public.admin_daily_question_snapshot(p_date date) returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
 perform hq_private.require_owner(auth.uid());
 select jsonb_build_object('id',question_id,'image_url',image_url,'correct_answer',correct_answer,'options_json',options_json,'category_id',category_id,'difficulty_level_id',difficulty_level_id) into result from hq_private.daily_questions where d=p_date;
 return result;
end $$;
revoke all on function public.admin_daily_question_snapshot(date) from public,anon,authenticated;
grant execute on function public.admin_daily_question_snapshot(date) to authenticated;
