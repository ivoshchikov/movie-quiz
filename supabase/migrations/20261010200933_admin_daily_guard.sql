-- UI-11. Based on the owner's schema export from 2026-10-10.
-- Run as postgres in Supabase SQL Editor before releasing the new admin UI.
-- Transactional and rerunnable. Existing challenges, sessions and results are retained.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $preflight$
begin
  if to_regprocedure('public.is_admin()') is null
     or to_regprocedure('public.set_daily_question(date,integer)') is null
     or to_regprocedure('public.start_daily_session(uuid,date)') is null
     or to_regprocedure('public.submit_daily_result(uuid,date,boolean,integer)') is null
     or to_regprocedure('public.get_daily_history_admin(integer,integer)') is null then
    raise exception 'UI-11: the Daily schema does not match the reviewed export';
  end if;
  if not exists (select 1 from pg_attribute where attrelid = 'public.question'::regclass and attname = 'options_json' and atttypid = 'jsonb'::regtype and not attisdropped) then
    raise exception 'UI-11: expected question.options_json jsonb';
  end if;
end;
$preflight$;

alter table public.daily_challenge add column if not exists admin_revision bigint not null default 0;
do $column_check$
begin
  if not exists (select 1 from pg_attribute where attrelid = 'public.daily_challenge'::regclass and attname = 'admin_revision' and atttypid = 'bigint'::regtype and attnotnull and not attisdropped) then
    raise exception 'UI-11: incompatible admin_revision column';
  end if;
end;
$column_check$;

-- One transaction lock per date, including dates with no challenge row yet.
-- Volatile trigger queries get a fresh snapshot after waiting at READ COMMITTED.
-- Reject snapshot isolation here rather than permitting a stale attempt check.
create or replace function public.hq_lock_daily_date(p_date date)
returns void language plpgsql volatile set search_path = pg_catalog as $function$
begin
  if p_date is null or not isfinite(p_date) then raise exception 'invalid Daily date'; end if;
  if current_setting('transaction_isolation') not in ('read committed', 'read uncommitted') then
    raise exception 'Daily changes require READ COMMITTED isolation';
  end if;
  perform pg_advisory_xact_lock(721104, p_date - date '2000-01-01');
end;
$function$;

create or replace function public.hq_guard_daily_assignment()
returns trigger language plpgsql volatile security definer set search_path = pg_catalog as $function$
declare v_date date; v_changed boolean;
begin
  if tg_op = 'UPDATE' and new.d is distinct from old.d then raise exception 'Daily dates cannot be moved'; end if;
  v_date := case when tg_op = 'DELETE' then old.d else new.d end;
  perform public.hq_lock_daily_date(v_date);
  if tg_op = 'UPDATE' then
    v_changed := (new.question_id, new.category_id, new.difficulty_level_id) is distinct from (old.question_id, old.category_id, old.difficulty_level_id);
  else v_changed := true;
  end if;
  if v_changed then
    if tg_op <> 'INSERT' and v_date < (clock_timestamp() at time zone 'America/Chicago')::date then raise exception 'Past Daily assignments are read only'; end if;
    if exists (select 1 from public.daily_session s where s.d = v_date)
       or exists (select 1 from public.daily_result r where r.d = v_date) then
      raise exception 'A Daily attempt has already started';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    if v_changed and old.admin_revision >= 9007199254740991 then raise exception 'Daily revision limit reached'; end if;
    new.admin_revision := old.admin_revision + case when v_changed then 1 else 0 end;
  elsif tg_op = 'INSERT' then new.admin_revision := 0;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

-- Also covers direct RLS-permitted writes and submit_daily_result's fallback start.
-- Existing game RPC signatures and scoring behavior stay compatible.
create or replace function public.hq_lock_daily_attempt()
returns trigger language plpgsql volatile security definer set search_path = pg_catalog as $function$
declare v_date date;
begin
  v_date := case when tg_op = 'DELETE' then old.d else new.d end;
  if tg_op = 'UPDATE' and new.d is distinct from old.d then
    perform public.hq_lock_daily_date(least(old.d, new.d));
    perform public.hq_lock_daily_date(greatest(old.d, new.d));
  else perform public.hq_lock_daily_date(v_date);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

drop trigger if exists hq_ui11_assignment_guard on public.daily_challenge;
create trigger hq_ui11_assignment_guard before insert or update or delete on public.daily_challenge for each row execute function public.hq_guard_daily_assignment();
drop trigger if exists hq_ui11_session_lock on public.daily_session;
create trigger hq_ui11_session_lock before insert or update or delete on public.daily_session for each row execute function public.hq_lock_daily_attempt();
drop trigger if exists hq_ui11_result_lock on public.daily_result;
create trigger hq_ui11_result_lock before insert or update or delete on public.daily_result for each row execute function public.hq_lock_daily_attempt();

create or replace function public.get_daily_assignment_admin(p_date date)
returns table(d date, question_id integer, attempt_count bigint, version bigint)
language plpgsql stable security definer set search_path = pg_catalog as $function$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden: admin only'; end if;
  if p_date is null or not isfinite(p_date) then raise exception 'invalid Daily date'; end if;
  return query
  select p_date, dc.question_id,
    (select count(*) from (select s.user_id from public.daily_session s where s.d = p_date union select r.user_id from public.daily_result r where r.d = p_date) attempts),
    coalesce(dc.admin_revision, 0::bigint)
  from (select 1) one_row left join public.daily_challenge dc on dc.d = p_date;
end;
$function$;

create or replace function public.set_daily_question_admin(p_date date, p_question_id integer, p_expected_question_id integer, p_expected_version bigint, p_expected_user_id uuid, p_expected_question jsonb)
returns table(d date, question_id integer, attempt_count bigint, version bigint)
language plpgsql volatile security definer set search_path = pg_catalog as $function$
declare uid uuid := auth.uid(); previous_id integer; previous_version bigint; qc record; v_options jsonb;
begin
  if uid is null or uid is distinct from p_expected_user_id or not public.is_admin() then raise exception 'forbidden: admin only, account mismatch'; end if;
  if p_date is null or not isfinite(p_date) or p_question_id is null or p_question_id <= 0 or p_expected_version is null or p_expected_version < 0 then raise exception 'invalid Daily assignment'; end if;
  perform public.hq_lock_daily_date(p_date);
  if p_date < (clock_timestamp() at time zone 'America/Chicago')::date then raise exception 'Past Daily assignments are read only'; end if;
  select dc.question_id, dc.admin_revision into previous_id, previous_version from public.daily_challenge dc where dc.d = p_date for update;
  if previous_id is distinct from p_expected_question_id or coalesce(previous_version, 0) <> p_expected_version then raise exception 'Daily assignment changed'; end if;
  if exists (select 1 from public.daily_session s where s.d = p_date) or exists (select 1 from public.daily_result r where r.d = p_date) then raise exception 'A Daily attempt has already started'; end if;

  select q.id, q.image_url, q.correct_answer, q.options_json, q.category_id, q.difficulty_level_id into qc from public.question q where q.id = p_question_id for share;
  if not found then raise exception 'Question not found'; end if;
  if jsonb_build_object('image_url',qc.image_url,'correct_answer',qc.correct_answer,'options_json',qc.options_json,'category_id',qc.category_id,'difficulty_level_id',qc.difficulty_level_id) is distinct from p_expected_question then raise exception 'Question changed since preview'; end if;
  if qc.image_url is null or btrim(qc.image_url) = '' or qc.correct_answer is null or btrim(qc.correct_answer) = '' or qc.category_id is null or qc.category_id <= 0 or qc.difficulty_level_id is null or qc.difficulty_level_id <= 0 then raise exception 'Incomplete question'; end if;
  v_options := qc.options_json;
  if jsonb_typeof(v_options) = 'string' then
    begin v_options := (v_options #>> '{}')::jsonb; exception when invalid_text_representation then raise exception 'Invalid question options'; end;
  end if;
  if jsonb_typeof(v_options) is distinct from 'array' then raise exception 'Invalid question options'; end if;
  if jsonb_array_length(v_options) <> 4 then raise exception 'Question requires four options'; end if;
  if exists (select 1 from jsonb_array_elements(v_options) o where jsonb_typeof(o) <> 'string' or btrim(o #>> '{}') = '')
     or (select count(distinct btrim(o)) from jsonb_array_elements_text(v_options) o) <> 4
     or not exists (select 1 from jsonb_array_elements_text(v_options) o where btrim(o) = btrim(qc.correct_answer)) then raise exception 'Invalid question options'; end if;

  if previous_id is null then
    insert into public.daily_challenge(d, question_id, category_id, difficulty_level_id) values (p_date, qc.id, qc.category_id, qc.difficulty_level_id);
  else
    update public.daily_challenge dc set question_id = qc.id, category_id = qc.category_id, difficulty_level_id = qc.difficulty_level_id where dc.d = p_date;
  end if;
  return query select a.d, a.question_id, a.attempt_count, a.version from public.get_daily_assignment_admin(p_date) a;
end;
$function$;

-- Keep an assignment in history if its source question is unavailable.
-- Qualified names also remove ambiguity with PL/pgSQL output parameters.
create or replace function public.get_daily_history_admin(p_limit integer default 30, p_offset integer default 0)
returns table(d date, question_id integer, image_url text, correct_answer text, category_id integer, difficulty_level_id integer, total_answers integer, correct_answers integer, created_at timestamptz)
language plpgsql stable security definer set search_path = pg_catalog as $function$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'forbidden: admin only'; end if;
  return query
  with agg as (select r.d, count(*)::int as total_answers, count(*) filter (where r.is_correct)::int as correct_answers from public.daily_result r group by r.d)
  select dc.d, dc.question_id, coalesce(q.image_url, ''), coalesce(nullif(btrim(q.correct_answer), ''), 'Question #' || dc.question_id || ' (unavailable)'), dc.category_id, dc.difficulty_level_id, coalesce(a.total_answers, 0), coalesce(a.correct_answers, 0), dc.created_at
  from public.daily_challenge dc left join public.question q on q.id = dc.question_id left join agg a on a.d = dc.d
  order by dc.d desc limit greatest(1, least(365, coalesce(p_limit, 30))) offset greatest(0, coalesce(p_offset, 0));
end;
$function$;

-- Remove the legacy blind writer and direct client assignment/admin membership writes.
-- Definer game RPCs continue to work; the existing session/result RLS is retained.
alter table public.admin_users enable row level security;
alter table public.daily_challenge enable row level security;
-- Membership stays private. Assignments retain their existing public read access.
drop policy if exists hq_ui11_assignment_read on public.daily_challenge;
create policy hq_ui11_assignment_read on public.daily_challenge for select to anon, authenticated using (true);
revoke all on function public.hq_lock_daily_date(date), public.hq_guard_daily_assignment(), public.hq_lock_daily_attempt() from public, anon, authenticated;
revoke execute on function public.set_daily_question(date, integer) from public, anon, authenticated;
revoke all on public.admin_users from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.daily_challenge from public, anon, authenticated;
revoke all on function public.get_daily_assignment_admin(date), public.set_daily_question_admin(date, integer, integer, bigint, uuid, jsonb), public.get_daily_history_admin(integer, integer) from public, anon, authenticated;
grant execute on function public.get_daily_assignment_admin(date), public.set_daily_question_admin(date, integer, integer, bigint, uuid, jsonb), public.get_daily_history_admin(integer, integer) to authenticated, service_role;
notify pgrst, 'reload schema';
commit;
