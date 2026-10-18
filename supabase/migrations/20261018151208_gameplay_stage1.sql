-- GAME-02. Preserve historical records and raw counters; new statistics have an explicit start.
alter table hq_private.gameplay_settings
  add column cohort_since timestamptz not null default clock_timestamp(),
  add column guest_salt text not null default encode(extensions.gen_random_bytes(32),'hex'),
  add column guest_source_minute integer not null default 12 check(guest_source_minute>0),
  add column guest_source_hour integer not null default 120 check(guest_source_hour>0),
  add column guest_global_minute integer not null default 120 check(guest_global_minute>0),
  add column guest_global_hour integer not null default 1200 check(guest_global_hour>0),
  add column guest_round_budget integer not null default 25000 check(guest_round_budget>0);
alter table hq_private.game_sessions
  add column last_activity_at timestamptz not null default clock_timestamp(),
  add column guest_source text;
alter table hq_private.game_sessions drop constraint game_sessions_finish_reason_check;
alter table hq_private.game_sessions add constraint game_sessions_finish_reason_check
  check(finish_reason in ('out-of-lives','completed','exit','inactive'));
create index game_sessions_inactivity on hq_private.game_sessions(last_activity_at) where finished_at is null;
create index game_sessions_guest_source on hq_private.game_sessions(guest_source,started_at) where owner is null;

create function hq_private.guard_guest_start(p_category integer,p_difficulty integer) returns text
language plpgsql set search_path=pg_catalog as $$
declare cfg hq_private.gameplay_settings; headers jsonb; address text; source text; t timestamptz:=clock_timestamp(); n bigint;
begin
  -- The global lock/budgets cannot be bypassed with a forged or changing source header.
  perform pg_advisory_xact_lock(721107,1);
  t:=clock_timestamp();
  select * into cfg from hq_private.gameplay_settings;
  if (select count(*) from hq_private.game_sessions where owner is null and started_at>t-interval '1 minute')>=cfg.guest_global_minute
    or (select count(*) from hq_private.game_sessions where owner is null and started_at>t-interval '1 hour')>=cfg.guest_global_hour then
    raise exception 'Too many new guest games. Please wait a minute.' using errcode='PT429';
  end if;
  begin headers:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
  exception when others then headers:='{}'::jsonb; end;
  address:=left(btrim(split_part(coalesce(headers->>'x-forwarded-for',''),',',1)),128);
  begin address:=host(address::inet); exception when others then address:='unknown'; end;
  source:=encode(sha256(convert_to(cfg.guest_salt||':'||public.us_central_today()::text||':'||coalesce(address,'unknown'),'UTF8')),'hex');
  if (select count(*) from hq_private.game_sessions where owner is null and guest_source=source and started_at>t-interval '1 minute')>=cfg.guest_source_minute
    or (select count(*) from hq_private.game_sessions where owner is null and guest_source=source and started_at>t-interval '1 hour')>=cfg.guest_source_hour then
    raise exception 'Too many new games from this network. Please wait a minute.' using errcode='PT429';
  end if;
  select count(*) into n from public.question q where q.retired_at is null and q.category_id=p_category
    and q.difficulty_level_id=p_difficulty and hq_private.valid_question(q.options_json,q.correct_answer);
  if n+(select count(*) from hq_private.game_rounds r join hq_private.game_sessions s on s.id=r.session_id where s.owner is null)>cfg.guest_round_budget then
    raise exception 'Guest games are temporarily busy. Please try again shortly.' using errcode='PT429';
  end if;
  return source;
end $$;

create function hq_private.nickname_key(p_nick text) returns text
language sql immutable strict set search_path=pg_catalog as $$
  select lower(regexp_replace(btrim(normalize(p_nick,NFKC)),' +',' ','g'));
$$;
create function hq_private.valid_nickname(p_nick text) returns boolean
language plpgsql immutable set search_path=pg_catalog as $$
declare i integer; c integer; nick text:=normalize(p_nick,NFKC);
begin
  if nick is null or char_length(nick) not between 3 and 20 or nick<>btrim(nick) then return false; end if;
  for i in 1..char_length(nick) loop
    c:=ascii(substr(nick,i,1));
    -- Same Unicode 17 ranges as nicknameValidation.ts.
    if c between 0 and 31 or c between 127 and 159 or c=173 or c=847
      or c between 1536 and 1541 or c=1564 or c=1757 or c=1807
      or c between 2192 and 2193 or c=2274 or c between 4447 and 4448 or c=5760
      or c between 6068 and 6069 or c between 6155 and 6159 or c between 8203 and 8207 or c between 8232 and 8238
      or c between 8288 and 8303 or c=10240 or c=12644 or c between 65024 and 65039
      or c=65279 or c=65440 or c between 65520 and 65531 or c=69821
      or c=69837 or c between 78896 and 78911 or c between 113824 and 113827 or c between 119155 and 119162
      or c between 917504 and 921599 then return false; end if;
  end loop;
  return true;
end $$;
create or replace function hq_private.guard_player_identity() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
  if tg_op='UPDATE' and old.nickname is not null and btrim(old.nickname)<>'' then
    if new.nickname is distinct from old.nickname or new.user_id is distinct from old.user_id then
      raise exception 'Your nickname cannot be changed' using errcode='23514';
    end if;
    return new;
  end if;
  if new.nickname is not null and new.nickname<>'' then
    new.nickname:=regexp_replace(btrim(normalize(new.nickname,NFKC)),' +',' ','g');
    if not hq_private.valid_nickname(new.nickname) then
      raise exception 'Choose 3 to 20 visible characters without control or invisible characters' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
-- Inline the pure key expression: maintaining this index must not require client
-- execution rights on functions in the private schema.
create unique index hq_profiles_nickname_normalized on public.profiles(lower(regexp_replace(btrim(normalize(nickname,NFKC)),' +',' ','g'))) where nickname is not null;
create or replace function public.is_nickname_taken(p_nick text) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
  select exists(select 1 from public.profiles where hq_private.nickname_key(nickname)=hq_private.nickname_key(p_nick));
$$;

create table hq_private.question_cohort_metrics (
  question_id integer not null, revision integer not null, mode text not null check(mode in ('normal','daily')),
  cohort text not null check(cohort in ('guest','account','first_account')),
  correct bigint not null default 0, wrong bigint not null default 0, timeouts bigint not null default 0,
  abandoned bigint not null default 0, response_ms bigint not null default 0, timed_answers bigint not null default 0,
  primary key(question_id,revision,mode,cohort)
);
create table hq_private.question_first_outcomes (
  owner uuid not null, question_id integer not null, revision integer not null, mode text not null,
  event_id uuid not null, primary key(owner,question_id,revision,mode)
);
-- Seed known prior exposure without fabricating old cohort counters.
insert into hq_private.question_first_outcomes
  select distinct on(owner,question_id,revision,mode) owner,question_id,revision,mode,id
  from hq_private.answer_events where owner is not null order by owner,question_id,revision,mode,occurred_at,id;
create function hq_private.add_cohort_event(p_event hq_private.answer_events,p_cohort text) returns void
language sql set search_path=pg_catalog as $$
  insert into hq_private.question_cohort_metrics(question_id,revision,mode,cohort,correct,wrong,timeouts,abandoned,response_ms,timed_answers)
  values(p_event.question_id,p_event.revision,p_event.mode,p_cohort,(p_event.outcome='correct')::int,
    (p_event.outcome='wrong')::int,(p_event.outcome='timeout')::int,(p_event.outcome='abandoned')::int,
    case when p_event.outcome in ('correct','wrong') then coalesce(p_event.response_ms,0) else 0 end,
    (p_event.outcome in ('correct','wrong'))::int)
  on conflict(question_id,revision,mode,cohort) do update set correct=question_cohort_metrics.correct+excluded.correct,
    wrong=question_cohort_metrics.wrong+excluded.wrong,timeouts=question_cohort_metrics.timeouts+excluded.timeouts,
    abandoned=question_cohort_metrics.abandoned+excluded.abandoned,response_ms=question_cohort_metrics.response_ms+excluded.response_ms,
    timed_answers=question_cohort_metrics.timed_answers+excluded.timed_answers;
$$;

create or replace function hq_private.record_answer(p_event hq_private.answer_events)
returns void language plpgsql set search_path=pg_catalog as $$
declare added integer;
begin
  perform pg_advisory_xact_lock(721110,hashtext(p_event.question_id::text||':'||p_event.revision::text||':'||p_event.mode));
  insert into hq_private.answer_events select (p_event).* on conflict do nothing;
  if not found then return; end if;
  insert into hq_private.question_metrics(question_id,revision,mode,correct,wrong,timeouts,abandoned,response_ms,timed_answers)
    values(p_event.question_id,p_event.revision,p_event.mode,(p_event.outcome='correct')::int,
      (p_event.outcome='wrong')::int,(p_event.outcome='timeout')::int,(p_event.outcome='abandoned')::int,
      case when p_event.outcome in ('correct','wrong') then coalesce(p_event.response_ms,0) else 0 end,
      (p_event.outcome in ('correct','wrong'))::int)
  on conflict(question_id,revision,mode) do update set
    correct=question_metrics.correct+excluded.correct, wrong=question_metrics.wrong+excluded.wrong,
    timeouts=question_metrics.timeouts+excluded.timeouts, abandoned=question_metrics.abandoned+excluded.abandoned,
    response_ms=question_metrics.response_ms+excluded.response_ms,timed_answers=question_metrics.timed_answers+excluded.timed_answers;
  if p_event.outcome in ('correct','wrong') then
    perform 1 from public.question where id=p_event.question_id for key share;
    if found then perform public.touch_question_stats(p_event.question_id,p_event.outcome='correct'); end if;
  end if;
  perform hq_private.add_cohort_event(p_event,case when p_event.owner is null then 'guest' else 'account' end);
  if p_event.owner is not null then
    insert into hq_private.question_first_outcomes values(p_event.owner,p_event.question_id,p_event.revision,p_event.mode,p_event.id) on conflict do nothing;
    get diagnostics added=row_count;
    if added=1 then perform hq_private.add_cohort_event(p_event,'first_account'); end if;
  end if;
end $$;

create function hq_private.expire_game(p_session uuid,p_at timestamptz) returns void
language plpgsql set search_path=pg_catalog as $$
declare s hq_private.game_sessions; r hq_private.game_rounds; cutoff timestamptz;
begin
  select * into s from hq_private.game_sessions where id=p_session for update;
  if not found or s.finished_at is not null then return; end if;
  cutoff:=s.last_activity_at+interval '15 minutes';
  if p_at<cutoff then return; end if;
  select * into r from hq_private.game_rounds where session_id=s.id and number=s.current_number;
  if r.id is not null then perform hq_private.settle_round(s.id,r.id,null,cutoff,true); end if;
  select * into s from hq_private.game_sessions where id=s.id;
  if s.lives=0 then perform hq_private.finish_game(s.id,'out-of-lives',r.deadline_at);
  else perform hq_private.finish_game(s.id,'inactive',cutoff); end if;
end $$;
create or replace function hq_private.lock_game(p_session uuid) returns hq_private.game_sessions
language plpgsql set search_path=pg_catalog as $$
declare s hq_private.game_sessions; uid uuid:=auth.uid(); t timestamptz;
begin
  if uid is not null then perform pg_advisory_xact_lock(721105,hashtext(uid::text)); end if;
  select * into s from hq_private.game_sessions where id=p_session for update;
  if not found or s.owner is distinct from uid then raise exception 'Game unavailable' using errcode='42501'; end if;
  t:=clock_timestamp(); perform hq_private.expire_game(p_session,t);
  update hq_private.game_sessions set last_activity_at=t where id=p_session and finished_at is null;
  select * into s from hq_private.game_sessions where id=p_session;
  return s;
end $$;
create function public.quiz_status(p_session uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.game_sessions;
begin s:=hq_private.lock_game(p_session); return hq_private.game_view(s.id); end $$;
create function hq_private.maintain_gameplay() returns void
language plpgsql security definer set search_path=pg_catalog as $$
declare candidate record; t timestamptz:=clock_timestamp();
begin
  for candidate in select id,owner from hq_private.game_sessions where finished_at is null
    and last_activity_at<t-interval '15 minutes' order by last_activity_at limit 100 loop
    if candidate.owner is not null and not pg_try_advisory_xact_lock(721105,hashtext(candidate.owner::text)) then continue; end if;
    if exists(select 1 from hq_private.game_sessions where id=candidate.id for update skip locked) then
      perform hq_private.expire_game(candidate.id,t);
    end if;
  end loop;
  perform hq_private.prune_gameplay();
end $$;

create table hq_private.daily_cancellations (
  d date primary key, reason text not null check(char_length(btrim(reason)) between 10 and 500),
  cancelled_by uuid not null, cancelled_at timestamptz not null default clock_timestamp(),
  operation uuid not null unique
);
create function hq_private.active_daily_date(p_date date) returns date
language plpgsql stable set search_path=pg_catalog as $$
declare result date:=p_date;
begin
  while exists(select 1 from hq_private.daily_cancellations where d=result) loop result:=result-1; end loop;
  return result;
end $$;
create function hq_private.daily_streak_runs() returns table(user_id uuid,start_d date,end_d date,streak integer)
language sql stable set search_path=pg_catalog as $$
  with correct as (
    select r.user_id,r.d,r.d-(select count(*)::int from hq_private.daily_cancellations c where c.d<=r.d)
      -row_number() over(partition by r.user_id order by r.d)::int grp
    from public.daily_result r where r.is_correct and r.d<=public.us_central_today()
      and not exists(select 1 from hq_private.daily_cancellations c where c.d=r.d)
  ) select user_id,min(d),max(d),count(*)::int from correct group by user_id,grp;
$$;

create or replace function public.daily_status() returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid(); t timestamptz:=clock_timestamp(); day date; started timestamptz; result jsonb; why text;
begin
  day:=(t at time zone 'America/Chicago')::date;
  select reason into why from hq_private.daily_cancellations where d=day;
  if uid is not null and why is null then
    select started_at into started from public.daily_session where user_id=uid and d=day;
    select to_jsonb(r)-'selected_answer' into result from public.daily_result r where user_id=uid and d=day;
  end if;
  return jsonb_build_object('date',day,'server_now',t,'closes_at',((day+1)::timestamp at time zone 'America/Chicago'),
    'started_at',started,'result',result,'cancelled',why is not null,'cancellation_reason',why);
end $$;

create or replace function public.daily_leaderboard(p_active_only boolean default false,p_limit integer default 5)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
  with best as (
    select distinct on(user_id) * from hq_private.daily_streak_runs()
      where not p_active_only or end_d=hq_private.active_daily_date(public.us_central_today())
      order by user_id,streak desc,end_d desc,start_d
  ), ranked as materialized (
    select b.*,coalesce(p.nickname,'Anonymous') nickname,
      row_number() over(order by b.streak desc,b.end_d desc,b.user_id) rank
      from best b left join public.profiles p on p.user_id=b.user_id
  ) select jsonb_build_object('total',(select count(*) from ranked),
    'top',coalesce((select jsonb_agg(to_jsonb(r) order by rank) from ranked r where rank<=greatest(1,least(100,coalesce(p_limit,5)))),'[]'::jsonb),
    'me',(select to_jsonb(r) from ranked r where user_id=auth.uid()));
$$;
create or replace function public.get_daily_user_streak(p_user_id uuid)
returns table(user_id uuid,current_streak integer,longest_streak integer,total_correct integer,last_played date,last_correct date)
language sql stable security definer set search_path=pg_catalog as $$
  with today as (select public.us_central_today() d), runs as (
    select * from hq_private.daily_streak_runs() where user_id=p_user_id
  ), eligible as (
    select r.* from public.daily_result r where r.user_id=p_user_id and r.d<=public.us_central_today()
      and not exists(select 1 from hq_private.daily_cancellations c where c.d=r.d)
  ) select p_user_id,
    coalesce((select max(streak) from runs cross join today where end_d=hq_private.active_daily_date(today.d)
      or (not exists(select 1 from hq_private.daily_cancellations c where c.d=today.d)
        and end_d=hq_private.active_daily_date(today.d-1) and not exists(select 1 from eligible e where e.d=today.d))),0)::int,
    coalesce((select max(streak) from runs),0)::int,
    (select count(*)::int from eligible where is_correct),(select max(d) from eligible),
    (select max(d) from eligible where is_correct)
  where p_user_id=auth.uid();
$$;
create or replace function public.get_my_daily_result(p_user_id uuid,p_date date default ((now() at time zone 'America/Chicago'))::date)
returns table(is_answered boolean,is_correct boolean,time_spent integer,answered_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then raise exception 'forbidden: uid mismatch' using errcode='42501'; end if;
  return query select true,r.is_correct,r.time_spent,r.answered_at from public.daily_result r
    where r.user_id=p_user_id and r.d=p_date and not exists(select 1 from hq_private.daily_cancellations c where c.d=p_date);
  if not found then return query select false,null::boolean,null::integer,null::timestamptz; end if;
end $$;

create function public.admin_daily_cancellation(p_date date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
  perform hq_private.require_owner(auth.uid());
  if p_date is null or not isfinite(p_date) then raise exception 'Invalid Daily date'; end if;
  return jsonb_build_object('date',p_date,'cancelled',exists(select 1 from hq_private.daily_cancellations where d=p_date),
    'reason',(select reason from hq_private.daily_cancellations where d=p_date));
end $$;

create function public.admin_cancel_daily(p_date date,p_reason text,p_expected_revision bigint,p_operation uuid,p_expected_owner uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare prior hq_private.daily_cancellations; rev bigint; qid integer; qrev integer; since timestamptz;
begin
  perform hq_private.require_owner(auth.uid());
  if auth.uid() is distinct from p_expected_owner then raise exception 'Account mismatch' using errcode='42501'; end if;
  if p_date is null or not isfinite(p_date) or p_operation is null or p_reason is null or p_expected_revision is null or p_expected_revision<0 or char_length(btrim(p_reason)) not between 10 and 500 then
    raise exception 'Choose a Daily date and a reason of 10 to 500 characters';
  end if;
  perform public.hq_lock_daily_date(p_date);
  if p_date>public.us_central_today() then raise exception 'Future Daily dates cannot be cancelled'; end if;
  select * into prior from hq_private.daily_cancellations where operation=p_operation or d=p_date;
  if found then
    if prior.operation=p_operation and prior.d=p_date and prior.reason=btrim(p_reason) and prior.cancelled_by=auth.uid() then
      return public.admin_daily_cancellation(p_date);
    end if;
    raise exception 'This Daily is already cancelled. Reload its status.';
  end if;
  select admin_revision into rev from public.daily_challenge where d=p_date for update;
  if not found or rev is distinct from p_expected_revision then raise exception 'Daily assignment changed. Reload before cancelling.' using errcode='40001'; end if;
  insert into hq_private.daily_cancellations(d,reason,cancelled_by,operation) values(p_date,btrim(p_reason),auth.uid(),p_operation);
  -- Accepted results remain intact. Trusted new Daily aggregates exclude the neutral day.
  select question_id,revision into qid,qrev from hq_private.daily_questions where d=p_date;
  perform pg_advisory_xact_lock(721110,hashtext(qid::text||':'||qrev::text||':daily'));
  select cohort_since into since from hq_private.gameplay_settings;
  delete from hq_private.question_cohort_metrics where question_id=qid and revision=qrev and mode='daily';
  insert into hq_private.question_cohort_metrics(question_id,revision,mode,cohort,correct,wrong,timeouts,abandoned,response_ms,timed_answers)
    select e.question_id,e.revision,e.mode,c.cohort,count(*) filter(where outcome='correct'),count(*) filter(where outcome='wrong'),
      count(*) filter(where outcome='timeout'),count(*) filter(where outcome='abandoned'),
      coalesce(sum(response_ms) filter(where outcome in ('correct','wrong')),0),count(*) filter(where outcome in ('correct','wrong'))
    from hq_private.answer_events e cross join lateral (
      select 'account'::text cohort union all select 'first_account' where exists(
        select 1 from hq_private.question_first_outcomes f where f.event_id=e.id)
    ) c where e.mode='daily' and e.question_id=qid and e.revision=qrev and e.occurred_at>=since
      and not exists(select 1 from hq_private.daily_cancellations x where x.d=e.daily_date)
    group by e.question_id,e.revision,e.mode,c.cohort;
  return public.admin_daily_cancellation(p_date);
end $$;
create function hq_private.guard_cancelled_assignment() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare day date:=case when tg_op='DELETE' then old.d else new.d end;
begin
  perform public.hq_lock_daily_date(day);
  if exists(select 1 from hq_private.daily_cancellations where d=day) then raise exception 'Cancelled Daily dates are read only'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger hq_cancelled_assignment before insert or update or delete on public.daily_challenge
  for each row execute function hq_private.guard_cancelled_assignment();

create function public.admin_question_metrics(p_question_id integer) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
  perform hq_private.require_owner(auth.uid());
  if not exists(select 1 from public.question where id=p_question_id) then raise exception 'Question unavailable'; end if;
  return jsonb_build_object('since',(select cohort_since from hq_private.gameplay_settings),
    'legacy',(select to_jsonb(q)-'question_id' from public.question_stats q where question_id=p_question_id),
    'cohorts',coalesce((select jsonb_agg(to_jsonb(m) order by revision,mode,cohort) from hq_private.question_cohort_metrics m where question_id=p_question_id),'[]'::jsonb));
end $$;


create or replace function public.quiz_start(p_session uuid,p_category_id integer,p_difficulty_id integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.game_sessions; level public.difficulty_level; uid uuid:=auth.uid(); v_now timestamptz; old_id uuid; v_source text;
begin
  if p_session is null then raise exception 'Invalid game'; end if;
  if uid is not null then
    perform pg_advisory_xact_lock(721105,hashtext(uid::text));
    if not exists(select 1 from public.profiles where user_id=uid and length(btrim(nickname))>0) then raise exception 'Choose a nickname first'; end if;
  else perform pg_advisory_xact_lock(721106,hashtext(p_session::text)); end if;
  select * into s from hq_private.game_sessions where id=p_session for update;
  if found then
    if s.owner is distinct from uid or s.category_id<>p_category_id or s.difficulty_id<>p_difficulty_id then raise exception 'Game unavailable' using errcode='42501'; end if;
    s:=hq_private.lock_game(s.id);
    return hq_private.game_view(s.id);
  end if;
  v_now:=clock_timestamp();
  perform hq_private.prune_gameplay();
  if uid is null then v_source:=hq_private.guard_guest_start(p_category_id,p_difficulty_id); end if;
  if uid is not null and ((select count(*) from hq_private.game_sessions where owner=uid and started_at>v_now-interval '1 minute')>=12
    or (select count(*) from hq_private.game_sessions where owner=uid and started_at>v_now-interval '1 hour')>=240) then
    raise exception 'Too many new games. Please wait a minute';
  end if;
  select * into level from public.difficulty_level where id=p_difficulty_id;
  if not found or level.time_limit_secs<=0 or level.lives<=0 or not exists(select 1 from public.category where id=p_category_id) then raise exception 'Invalid quiz settings'; end if;
  -- A player cannot keep several ranked runs open to inspect questions in parallel.
  for old_id in select id from hq_private.game_sessions where owner=uid and finished_at is null for update loop
    perform public.quiz_finish(old_id);
  end loop;
  insert into hq_private.game_sessions(id,owner,category_id,difficulty_id,time_limit_secs,initial_lives,lives,started_at,guest_source)
    values(p_session,uid,p_category_id,p_difficulty_id,level.time_limit_secs,level.lives,level.lives,v_now,v_source);
  -- Exponential keys produce a weighted permutation without replacement. #175 has weight 0.1.
  insert into hq_private.game_rounds(session_id,number,question_id,revision,image_url,options_json,correct_answer)
    select p_session,row_number() over(order by -ln(greatest(random(),1e-15))/q.selection_weight,q.id)::int,
      q.id,q.admin_revision,q.image_url,
      (select jsonb_agg(value order by random()) from jsonb_array_elements(q.options_json)),q.correct_answer
    from public.question q where q.retired_at is null and q.category_id=p_category_id and q.difficulty_level_id=p_difficulty_id
      and hq_private.valid_question(q.options_json,q.correct_answer);
  get diagnostics level.mistakes_allowed = row_count;
  update hq_private.game_sessions set bank_size=level.mistakes_allowed where id=p_session;
  if level.mistakes_allowed=0 then
    update hq_private.game_sessions set finished_at=clock_timestamp(),finish_reason='completed' where id=p_session;
  end if;
  return hq_private.game_view(p_session);
end $$;

create or replace function public.quiz_answer(p_session uuid,p_round uuid,p_answer text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.game_sessions; r hq_private.game_rounds; t timestamptz;
begin
  s:=hq_private.lock_game(p_session);
  if s.finished_at is not null then
    select * into r from hq_private.game_rounds where id=p_round and session_id=s.id;
    if found and r.outcome in ('correct','wrong') and r.selected is distinct from p_answer then raise exception 'Answer already accepted'; end if;
    return hq_private.game_view(s.id);
  end if;
  select * into r from hq_private.game_rounds where id=p_round and session_id=s.id and issued_at is not null;
  if not found then raise exception 'Question unavailable'; end if;
  if r.outcome is not null then
    if r.outcome='abandoned' then raise exception 'Game finished'; end if;
    if r.selected is distinct from p_answer and r.outcome in ('correct','wrong') then raise exception 'Answer already accepted'; end if;
    return hq_private.game_view(s.id);
  end if;
  if s.finished_at is not null or r.number<>s.current_number then raise exception 'Game finished'; end if;
  t:=clock_timestamp(); perform hq_private.settle_round(s.id,r.id,p_answer,t);
  select * into s from hq_private.game_sessions where id=s.id;
  select * into r from hq_private.game_rounds where id=r.id;
  if s.lives=0 then perform hq_private.finish_game(s.id,'out-of-lives',r.settled_at);
  elsif r.outcome is not null and r.number=s.bank_size then perform hq_private.finish_game(s.id,'completed',r.settled_at); end if;
  return hq_private.game_view(s.id);
end $$;

create or replace function public.get_daily_question(p_date date default ((now() at time zone 'America/Chicago'))::date)
returns table(id integer,image_url text,options_json jsonb,correct_answer text,category_id integer,difficulty_level_id integer)
language plpgsql security definer set search_path=pg_catalog as $$
begin
  perform public.hq_lock_daily_date(p_date);
  if not exists(select 1 from public.daily_challenge where d=p_date) then
    insert into public.daily_challenge(d,question_id,category_id,difficulty_level_id)
      select p_date,q.id,q.category_id,q.difficulty_level_id from public.question q
      where q.retired_at is null and q.daily_eligible and q.category_id is not null
        and hq_private.valid_question(q.options_json,q.correct_answer)
        and not exists(select 1 from public.daily_challenge dc where dc.question_id=q.id and dc.d>=p_date-30 and dc.d<p_date)
      order by random() limit 1 on conflict(d) do nothing;
  end if;
  return query select q.question_id,q.image_url,q.options_json,null::text,q.category_id,q.difficulty_level_id
    from hq_private.daily_questions q where q.d=p_date;
end $$;

create or replace function public.daily_begin(p_date date)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid(); t timestamptz; s public.daily_session; q hq_private.daily_questions; result jsonb;
begin
  if uid is null then raise exception 'Log in to play Daily' using errcode='42501'; end if;
  perform public.hq_lock_daily_date(p_date);
  t:=clock_timestamp();
  if p_date is distinct from (t at time zone 'America/Chicago')::date then raise exception 'Daily expired' using errcode='22023'; end if;
  if exists(select 1 from hq_private.daily_cancellations where d=p_date) then return public.daily_status(); end if;
  if not exists(select 1 from public.profiles where user_id=uid and length(btrim(nickname))>0) then raise exception 'Choose a nickname first'; end if;
  select to_jsonb(r)-'selected_answer' into result from public.daily_result r where user_id=uid and d=p_date;
  if result is not null then return public.daily_status(); end if;
  perform public.get_daily_question(p_date);
  select * into q from hq_private.daily_questions where d=p_date;
  if not found or not hq_private.valid_question(q.options_json,q.correct_answer) then raise exception 'Daily unavailable'; end if;
  -- Locking the date makes the assigned question and first start atomic with admin edits.
  insert into public.daily_session(user_id,d,started_at,question_revision,options_json)
    select uid,p_date,t,q.revision,
      (select jsonb_agg(value order by random()) from jsonb_array_elements(q.options_json))
    on conflict(user_id,d) do update set started_at=excluded.started_at,
      question_revision=excluded.question_revision,options_json=excluded.options_json
      where (daily_session.started_at at time zone 'America/Chicago')::date<>p_date or daily_session.started_at>t;
  select * into s from public.daily_session where user_id=uid and d=p_date;
  t:=clock_timestamp();
  if p_date<>(t at time zone 'America/Chicago')::date then raise exception 'Daily expired' using errcode='22023'; end if;
  return public.daily_status() || jsonb_build_object('started_at',s.started_at,'question',jsonb_build_object(
    'id',q.question_id,'image_url',q.image_url,'options',coalesce(s.options_json,q.options_json),
    'category_id',q.category_id,'difficulty_level_id',q.difficulty_level_id));
end $$;

create or replace function public.submit_daily_answer(p_user_id uuid,p_date date,p_answer text,p_time integer)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid(); t timestamptz; s public.daily_session; q hq_private.daily_questions; e hq_private.answer_events;
begin
  if uid is null or uid is distinct from p_user_id then raise exception 'Account mismatch' using errcode='42501'; end if;
  perform public.hq_lock_daily_date(p_date);
  t:=clock_timestamp();
  -- Even retries for an already saved answer cannot submit yesterday. Read the saved receipt instead.
  if p_date is distinct from (t at time zone 'America/Chicago')::date then raise exception 'Daily expired' using errcode='22023'; end if;
  if exists(select 1 from hq_private.daily_cancellations where d=p_date) then raise exception 'Daily cancelled' using errcode='PT409'; end if;
  if exists(select 1 from public.daily_result where user_id=uid and d=p_date) then return; end if;
  select * into s from public.daily_session where user_id=uid and d=p_date for update;
  if not found or s.started_at>t or (s.started_at at time zone 'America/Chicago')::date<>p_date then raise exception 'Start Daily first'; end if;
  select * into q from hq_private.daily_questions where d=p_date;
  if not found or not hq_private.valid_question(q.options_json,q.correct_answer) then raise exception 'Daily unavailable'; end if;
  if not exists(select 1 from jsonb_array_elements_text(q.options_json) where value=p_answer) then raise exception 'Choose an available answer'; end if;
  e.id:=gen_random_uuid(); e.owner:=uid; e.daily_date:=p_date; e.mode:='daily';
  e.question_id:=q.question_id; e.revision:=coalesce(s.question_revision,q.revision); e.category_id:=q.category_id; e.difficulty_id:=q.difficulty_level_id;
  e.selected:=p_answer; e.outcome:=case when lower(btrim(p_answer))=lower(btrim(q.correct_answer)) then 'correct' else 'wrong' end;
  select ordinality::int into e.option_position from jsonb_array_elements_text(coalesce(s.options_json,q.options_json)) with ordinality where value=p_answer;
  e.response_ms:=greatest(0,floor(extract(epoch from t-s.started_at)*1000)::bigint); e.occurred_at:=t;
  insert into public.daily_result(user_id,d,is_correct,time_spent,answered_at,selected_answer,response_ms)
    values(uid,p_date,e.outcome='correct',greatest(1,floor(e.response_ms/1000.0)::int),t,p_answer,e.response_ms);
  perform hq_private.record_answer(e);
end $$;

create or replace function public.my_game_stats()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'Log in to view statistics' using errcode='42501'; end if;
  with e as materialized(select * from hq_private.answer_events where owner=uid),
  normal as (select * from e where mode='normal'),
  streaks as (
    select outcome,sum((outcome<>'correct')::int) over(order by occurred_at,id) grp from normal
  ), runs as(select count(*) n from streaks where outcome='correct' group by grp),
  breakdown as (
    select category_id,difficulty_id,count(*) filter(where outcome='correct') correct,
      count(*) filter(where outcome='wrong') wrong,count(*) filter(where outcome='timeout') timeouts,
      count(*) filter(where outcome='abandoned') abandoned,
      round(avg(response_ms) filter(where outcome in ('correct','wrong'))) average_ms
      from normal group by category_id,difficulty_id
  ), trend as (
    select (occurred_at at time zone 'America/Chicago')::date d,count(*) filter(where outcome='correct') correct,
      count(*) filter(where outcome='wrong') wrong,count(*) filter(where outcome='timeout') timeouts
      from normal where occurred_at>=clock_timestamp()-interval '30 days' group by 1
  ), calendar as (
    select days.d::date d,case when c.d is not null then 'cancelled' when r.user_id is not null then case when r.is_correct then 'correct' else 'wrong' end
      when s.user_id is not null then case when days.d::date<public.us_central_today() then 'missed' else 'started' end else 'not-played' end outcome,
      case when c.d is null then r.time_spent end time_spent
    from generate_series(public.us_central_today()-29,public.us_central_today(),interval '1 day') days(d)
      left join public.daily_result r on r.user_id=uid and r.d=days.d::date
      left join public.daily_session s on s.user_id=uid and s.d=days.d::date
      left join hq_private.daily_cancellations c on c.d=days.d::date
  ) select jsonb_build_object('tracking_since',(select tracking_since from hq_private.gameplay_settings),
    'normal',jsonb_build_object('games',(select count(*) from hq_private.game_sessions where owner=uid and bank_size>0 and finished_at is not null),
      'correct',count(*) filter(where outcome='correct'),'wrong',count(*) filter(where outcome='wrong'),
      'timeouts',count(*) filter(where outcome='timeout'),'abandoned',count(*) filter(where outcome='abandoned'),
      'unique_questions',count(distinct question_id),'average_ms',round(avg(response_ms) filter(where outcome in ('correct','wrong'))),
      'best_streak',coalesce((select max(n) from runs),0)),
    'breakdown',coalesce((select jsonb_agg(to_jsonb(b) order by category_id,difficulty_id) from breakdown b),'[]'::jsonb),
    'trend',coalesce((select jsonb_agg(to_jsonb(t) order by d) from trend t),'[]'::jsonb),
    'daily_calendar',coalesce((select jsonb_agg(to_jsonb(c) order by d) from calendar c),'[]'::jsonb)) into result from normal;
  return result;
end $$;

-- Retire unused Daily aliases; active screens use daily_leaderboard (bounded top + own rank).
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('get_daily_fastest','get_daily_best_time_records','get_daily_streak_leaderboard','get_daily_total_correct_leaderboard') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  end loop;
end $$;
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='hq_private' loop
    execute format('alter table hq_private.%I enable row level security',t.tablename);
    execute format('revoke all on hq_private.%I from public,anon,authenticated',t.tablename);
  end loop;
end $$;
revoke all on all functions in schema hq_private from public,anon,authenticated;
revoke all on function public.quiz_status(uuid),public.admin_daily_cancellation(date),
  public.admin_cancel_daily(date,text,bigint,uuid,uuid),public.admin_question_metrics(integer) from public,anon,authenticated;
grant execute on function public.quiz_status(uuid) to anon,authenticated;
grant execute on function public.admin_daily_cancellation(date),public.admin_cancel_daily(date,text,bigint,uuid,uuid),
  public.admin_question_metrics(integer) to authenticated;
grant execute on function hq_private.maintain_gameplay() to service_role;
-- Hosted Supabase provides pg_cron. Minimal isolated PostgreSQL/PGlite fixtures may not.
do $$ begin
  if exists(select 1 from pg_available_extensions where name='pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('hq-gameplay-maintenance','* * * * *','select hq_private.maintain_gameplay();');
  end if;
end $$;
notify pgrst,'reload schema';
