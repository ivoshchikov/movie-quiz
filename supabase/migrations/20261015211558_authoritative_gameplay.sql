-- Authoritative gameplay. Existing personal bests and legacy question totals are retained.
-- Public images remain shared; these APIs do not promise to revoke downloaded files.
alter table public.question add column selection_weight numeric not null default 1
  check (selection_weight > 0 and selection_weight <= 100);
alter table public.question add column daily_eligible boolean not null default true;
update public.question set selection_weight = 0.1, daily_eligible = false where id = 175;

create table hq_private.game_sessions (
  id uuid primary key,
  owner uuid,
  category_id integer not null,
  difficulty_id integer not null,
  time_limit_secs integer not null check(time_limit_secs > 0),
  initial_lives integer not null check(initial_lives > 0),
  lives integer not null check(lives >= 0),
  score integer not null default 0 check(score >= 0),
  started_at timestamptz not null,
  finished_at timestamptz,
  finish_reason text check(finish_reason in ('out-of-lives','completed','exit')),
  current_number integer not null default 0,
  bank_size integer not null default 0,
  previous_best jsonb,
  personal_best jsonb,
  record_outcome text check(record_outcome in ('first','new')),
  snapshots_purged boolean not null default false
);
create index game_sessions_owner_started on hq_private.game_sessions(owner,started_at desc);
create index game_sessions_active on hq_private.game_sessions(owner) where finished_at is null;
create index game_sessions_prune on hq_private.game_sessions(finished_at) where finished_at is not null and not snapshots_purged;
create table hq_private.game_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references hq_private.game_sessions(id) on delete cascade,
  number integer not null,
  question_id integer not null,
  revision integer not null,
  image_url text not null,
  options_json jsonb not null,
  correct_answer text not null,
  issued_at timestamptz,
  deadline_at timestamptz,
  settled_at timestamptz,
  selected text,
  outcome text check(outcome in ('correct','wrong','timeout','abandoned')),
  unique(session_id,number)
);
create index game_rounds_session on hq_private.game_rounds(session_id,number);
create table hq_private.answer_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  round_id uuid unique,
  owner uuid,
  daily_date date,
  question_id integer not null,
  revision integer not null,
  mode text not null check(mode in ('normal','daily')),
  category_id integer not null,
  difficulty_id integer not null,
  outcome text not null check(outcome in ('correct','wrong','timeout','abandoned')),
  selected text,
  option_position integer check(option_position between 1 and 4),
  response_ms bigint check(response_ms >= 0),
  occurred_at timestamptz not null,
  unique(owner,daily_date)
);
create index answer_events_owner_time on hq_private.answer_events(owner,occurred_at desc);
create index answer_events_question on hq_private.answer_events(question_id,revision,mode);
create table hq_private.question_metrics (
  question_id integer not null, revision integer not null, mode text not null,
  correct bigint not null default 0, wrong bigint not null default 0,
  timeouts bigint not null default 0, abandoned bigint not null default 0,
  response_ms bigint not null default 0, timed_answers bigint not null default 0,
  primary key(question_id,revision,mode)
);
create table hq_private.gameplay_settings (
  singleton boolean primary key default true check(singleton),
  tracking_since timestamptz not null default clock_timestamp()
);
insert into hq_private.gameplay_settings default values;
-- Preserve the existing normal leaderboard exclusion by identity, not by a renameable nickname.
create table hq_private.leaderboard_exclusions(user_id uuid primary key);
insert into hq_private.leaderboard_exclusions select user_id from public.profiles where lower(nickname)='isildur';

-- Revision 0 means an existing Daily snapshot predates revision tracking.
alter table hq_private.daily_questions add column revision integer not null default 0;
create or replace function hq_private.snapshot_daily_question() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare q public.question;
begin
  if tg_op='UPDATE' and new.question_id=old.question_id then return new; end if;
  select * into q from public.question where id=new.question_id for share;
  if not found or q.retired_at is not null or not q.daily_eligible then raise exception 'Question unavailable for Daily'; end if;
  insert into hq_private.daily_questions(d,question_id,image_url,options_json,correct_answer,category_id,difficulty_level_id,revision)
    values(new.d,q.id,q.image_url,q.options_json,q.correct_answer,q.category_id,q.difficulty_level_id,q.admin_revision)
  on conflict(d) do update set question_id=excluded.question_id,image_url=excluded.image_url,options_json=excluded.options_json,
    correct_answer=excluded.correct_answer,category_id=excluded.category_id,difficulty_level_id=excluded.difficulty_level_id,revision=excluded.revision;
  return new;
end $$;

alter table public.daily_session add column question_revision integer;
alter table public.daily_session add column options_json jsonb;
alter table public.daily_result add column selected_answer text;
alter table public.daily_result add column response_ms bigint;
-- Existing Daily starts continue with their original clock and assigned snapshot.
update public.daily_session s set question_revision=d.revision, options_json=d.options_json
  from hq_private.daily_questions d where d.d=s.d;

create function hq_private.record_answer(p_event hq_private.answer_events)
returns void language plpgsql set search_path=pg_catalog as $$
begin
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
end $$;

create function hq_private.settle_round(p_session uuid,p_round uuid,p_answer text,p_at timestamptz,p_abandon boolean default false)
returns void language plpgsql set search_path=pg_catalog as $$
declare s hq_private.game_sessions; r hq_private.game_rounds; e hq_private.answer_events; v_outcome text;
begin
  select * into s from hq_private.game_sessions where id=p_session;
  select * into r from hq_private.game_rounds where id=p_round and session_id=p_session;
  if not found or r.issued_at is null or r.outcome is not null then return; end if;
  if p_at >= r.deadline_at then v_outcome := 'timeout';
  elsif p_abandon then v_outcome := 'abandoned';
  elsif p_answer is null then return;
  else
    if not exists(select 1 from jsonb_array_elements_text(r.options_json) where value=p_answer) then
      raise exception 'Choose an available answer';
    end if;
    v_outcome := case when lower(btrim(p_answer))=lower(btrim(r.correct_answer)) then 'correct' else 'wrong' end;
  end if;
  update hq_private.game_rounds set selected=case when v_outcome in ('correct','wrong') then p_answer end,
    outcome=v_outcome,settled_at=case when v_outcome='timeout' then r.deadline_at else p_at end where id=r.id;
  if v_outcome <> 'abandoned' then
    update hq_private.game_sessions set score=score+(v_outcome='correct')::int,
      lives=greatest(0,lives-(v_outcome<>'correct')::int) where id=s.id;
  end if;
  e.id := gen_random_uuid(); e.session_id:=s.id; e.round_id:=r.id; e.owner:=s.owner;
  e.question_id:=r.question_id; e.revision:=r.revision; e.mode:='normal';
  e.category_id:=s.category_id; e.difficulty_id:=s.difficulty_id; e.outcome:=v_outcome;
  e.selected:=case when v_outcome in ('correct','wrong') then p_answer end;
  select ordinality::int into e.option_position from jsonb_array_elements_text(r.options_json) with ordinality where value=e.selected;
  e.response_ms:=greatest(0,floor(extract(epoch from (least(p_at,r.deadline_at)-r.issued_at))*1000)::bigint);
  e.occurred_at:=case when v_outcome='timeout' then r.deadline_at else p_at end;
  perform hq_private.record_answer(e);
end $$;

create function hq_private.finish_game(p_session uuid,p_reason text,p_at timestamptz)
returns void language plpgsql set search_path=pg_catalog as $$
declare s hq_private.game_sessions; v_time integer; old public.user_best; best public.user_best; award text;
begin
  select * into s from hq_private.game_sessions where id=p_session for update;
  if not found or s.finished_at is not null then return; end if;
  v_time:=greatest(0,floor(extract(epoch from p_at-s.started_at))::integer);
  if s.owner is not null then
    -- All gameplay writers take the same owner lock, including simultaneous finishes.
    select * into old from public.user_best where user_id=s.owner and category_id=s.category_id and difficulty_level_id=s.difficulty_id for update;
    if old.user_id is null then award:='first';
    elsif s.score>old.best_score or (s.score=old.best_score and v_time<old.best_time) then award:='new'; end if;
    insert into public.user_best(user_id,category_id,difficulty_level_id,best_score,best_time,updated_at)
      values(s.owner,s.category_id,s.difficulty_id,s.score,v_time,p_at)
    on conflict(user_id,category_id,difficulty_level_id) do update set
      best_score=excluded.best_score,best_time=excluded.best_time,updated_at=excluded.updated_at
      where excluded.best_score>user_best.best_score or (excluded.best_score=user_best.best_score and excluded.best_time<user_best.best_time);
    select * into best from public.user_best where user_id=s.owner and category_id=s.category_id and difficulty_level_id=s.difficulty_id;
  end if;
  update hq_private.game_sessions set finished_at=p_at,finish_reason=p_reason,record_outcome=award,
    previous_best=case when old.user_id is not null then jsonb_build_object('score',old.best_score,'time',old.best_time) end,
    personal_best=case when best.user_id is not null then jsonb_build_object('score',best.best_score,'time',best.best_time) end where id=s.id;
  delete from hq_private.game_rounds where session_id=s.id and issued_at is null;
end $$;

create function hq_private.game_view(p_session uuid)
returns jsonb language sql set search_path=pg_catalog as $$
  select jsonb_build_object('id',s.id,'score',s.score,'lives',s.lives,'status',case when s.finished_at is null then 'active' else 'finished' end,
    'category_id',s.category_id,'difficulty_id',s.difficulty_id,'bank_size',s.bank_size,'started_at',s.started_at,
    'server_now',clock_timestamp(),'finish_reason',s.finish_reason,
    'time_secs',greatest(0,floor(extract(epoch from coalesce(s.finished_at,clock_timestamp())-s.started_at))::int),
    'previous_best',s.previous_best,'personal_best',s.personal_best,'record_outcome',s.record_outcome,
    'round',(select jsonb_build_object('id',r.id,'number',r.number,'question_id',r.question_id,'image_url',r.image_url,
      'options',r.options_json,'issued_at',r.issued_at,'deadline_at',r.deadline_at,'outcome',r.outcome,'selected',r.selected)
      from hq_private.game_rounds r where r.session_id=s.id and r.number=s.current_number and r.issued_at is not null))
  from hq_private.game_sessions s where s.id=p_session;
$$;

create function hq_private.lock_game(p_session uuid)
returns hq_private.game_sessions language plpgsql set search_path=pg_catalog as $$
declare s hq_private.game_sessions; uid uuid:=auth.uid();
begin
  if uid is not null then perform pg_advisory_xact_lock(721105,hashtext(uid::text)); end if;
  select * into s from hq_private.game_sessions where id=p_session for update;
  if not found or s.owner is distinct from uid then raise exception 'Game unavailable' using errcode='42501'; end if;
  return s;
end $$;

-- Bounded maintenance on new starts; no cron dependency and no loss of player totals/history.
create function hq_private.prune_gameplay()
returns void language plpgsql set search_path=pg_catalog as $$
declare ids uuid[];
begin
  select array_agg(id) into ids from (select id from hq_private.game_sessions
    where owner is null and started_at<clock_timestamp()-interval '1 day'
    order by started_at limit 100 for update skip locked) old_guests;
  delete from hq_private.game_sessions where id=any(ids);
  delete from hq_private.answer_events where id in (select id from hq_private.answer_events
    where owner is null and occurred_at<clock_timestamp()-interval '1 day' limit 1000);
  select array_agg(id) into ids from (select id from hq_private.game_sessions
    where finished_at<clock_timestamp()-interval '30 days' and not snapshots_purged
    order by finished_at limit 20 for update skip locked) old_games;
  delete from hq_private.game_rounds where session_id=any(ids);
  update hq_private.game_sessions set snapshots_purged=true where id=any(ids);
end $$;

create function public.quiz_start(p_session uuid,p_category_id integer,p_difficulty_id integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.game_sessions; level public.difficulty_level; uid uuid:=auth.uid(); v_now timestamptz; old_id uuid;
begin
  if p_session is null then raise exception 'Invalid game'; end if;
  if uid is not null then
    perform pg_advisory_xact_lock(721105,hashtext(uid::text));
    if not exists(select 1 from public.profiles where user_id=uid and length(btrim(nickname))>0) then raise exception 'Choose a nickname first'; end if;
  else perform pg_advisory_xact_lock(721106,hashtext(p_session::text)); end if;
  select * into s from hq_private.game_sessions where id=p_session for update;
  if found then
    if s.owner is distinct from uid or s.category_id<>p_category_id or s.difficulty_id<>p_difficulty_id then raise exception 'Game unavailable' using errcode='42501'; end if;
    return hq_private.game_view(s.id);
  end if;
  v_now:=clock_timestamp();
  perform hq_private.prune_gameplay();
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
  insert into hq_private.game_sessions(id,owner,category_id,difficulty_id,time_limit_secs,initial_lives,lives,started_at)
    values(p_session,uid,p_category_id,p_difficulty_id,level.time_limit_secs,level.lives,level.lives,v_now);
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

create function public.quiz_next(p_session uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.game_sessions; r hq_private.game_rounds; t timestamptz;
begin
  s:=hq_private.lock_game(p_session);
  if s.finished_at is not null then return hq_private.game_view(p_session); end if;
  t:=clock_timestamp();
  select * into r from hq_private.game_rounds where session_id=s.id and number=s.current_number;
  if r.issued_at is not null and r.outcome is null then
    perform hq_private.settle_round(s.id,r.id,null,t);
    select * into s from hq_private.game_sessions where id=s.id;
    if s.lives=0 then perform hq_private.finish_game(s.id,'out-of-lives',r.deadline_at); return hq_private.game_view(s.id); end if;
    -- Return the same timed-out round first. A following next request advances it.
    return hq_private.game_view(s.id);
  end if;
  if r.settled_at is not null and t<r.settled_at+(case when r.outcome='correct' then interval '900 milliseconds' else interval '1800 milliseconds' end) then
    return hq_private.game_view(s.id);
  end if;
  if s.current_number>=s.bank_size then
    perform hq_private.finish_game(s.id,'completed',coalesce(r.settled_at,t)); return hq_private.game_view(s.id);
  end if;
  update hq_private.game_sessions set current_number=current_number+1 where id=s.id returning * into s;
  update hq_private.game_rounds set issued_at=t,deadline_at=t+make_interval(secs=>s.time_limit_secs)
    where session_id=s.id and number=s.current_number;
  return hq_private.game_view(s.id);
end $$;

create function public.quiz_answer(p_session uuid,p_round uuid,p_answer text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.game_sessions; r hq_private.game_rounds; t timestamptz;
begin
  s:=hq_private.lock_game(p_session);
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

create function public.quiz_finish(p_session uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.game_sessions; r hq_private.game_rounds; t timestamptz;
begin
  s:=hq_private.lock_game(p_session);
  if s.finished_at is not null then return hq_private.game_view(s.id); end if;
  t:=clock_timestamp();
  select * into r from hq_private.game_rounds where session_id=s.id and number=s.current_number;
  if r.id is not null then perform hq_private.settle_round(s.id,r.id,null,t,true); end if;
  select * into s from hq_private.game_sessions where id=s.id;
  if s.lives=0 then perform hq_private.finish_game(s.id,'out-of-lives',r.deadline_at);
  else perform hq_private.finish_game(s.id,'exit',t); end if;
  return hq_private.game_view(s.id);
end $$;

-- Daily uses a single server clock and Chicago calendar, including DST.
create function public.daily_status()
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid(); t timestamptz:=clock_timestamp(); day date; started timestamptz; result jsonb;
begin
  day:=(t at time zone 'America/Chicago')::date;
  if uid is not null then
    select started_at into started from public.daily_session where user_id=uid and d=day;
    select to_jsonb(r)-'selected_answer' into result from public.daily_result r where user_id=uid and d=day;
  end if;
  return jsonb_build_object('date',day,'server_now',t,'closes_at',((day+1)::timestamp at time zone 'America/Chicago'),
    'started_at',started,'result',result);
end $$;

create or replace function public.get_daily_question(p_date date default ((now() at time zone 'America/Chicago'))::date)
returns table(id integer,image_url text,options_json jsonb,correct_answer text,category_id integer,difficulty_level_id integer)
language plpgsql security definer set search_path=pg_catalog as $$
begin
  perform public.hq_lock_daily_date(p_date);
  if not exists(select 1 from public.daily_challenge where d=p_date) then
    insert into public.daily_challenge(d,question_id,category_id,difficulty_level_id)
      select p_date,q.id,q.category_id,q.difficulty_level_id from public.question q
      where q.retired_at is null and q.daily_eligible and q.category_id in (1,2)
        and hq_private.valid_question(q.options_json,q.correct_answer)
        and not exists(select 1 from public.daily_challenge dc where dc.question_id=q.id and dc.d>=p_date-30 and dc.d<p_date)
      order by random() limit 1 on conflict(d) do nothing;
  end if;
  return query select q.question_id,q.image_url,q.options_json,null::text,q.category_id,q.difficulty_level_id
    from hq_private.daily_questions q where q.d=p_date;
end $$;

create function public.daily_begin(p_date date)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid(); t timestamptz; s public.daily_session; q hq_private.daily_questions; result jsonb;
begin
  if uid is null then raise exception 'Log in to play Daily' using errcode='42501'; end if;
  perform public.hq_lock_daily_date(p_date);
  t:=clock_timestamp();
  if p_date is distinct from (t at time zone 'America/Chicago')::date then raise exception 'Daily expired' using errcode='22023'; end if;
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
    on conflict(user_id,d) do nothing;
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

-- Legacy content endpoints remain closed even for a player with yesterday's session.
create or replace function public.get_daily_question_public(p_date date default ((now() at time zone 'America/Chicago'))::date)
returns table(id integer,image_url text,options_json jsonb,category_id integer,difficulty_level_id integer)
language plpgsql security definer set search_path=pg_catalog as $$
begin
  raise exception 'Reload to start today''s Daily securely' using errcode='42501';
end $$;
create or replace function public.get_daily_archive_public(p_limit integer default 30,p_offset integer default 0)
returns table(d date,image_url text) language sql stable security definer set search_path=pg_catalog as $$
  select null::date,null::text where false;
$$;

create function public.quiz_leaderboard(p_category_id integer,p_difficulty_id integer,p_limit integer default 10)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
  with ranked as materialized (
    select ub.user_id,coalesce(p.nickname,'Anonymous') nickname,ub.best_score,ub.best_time,ub.updated_at,
      row_number() over(order by ub.best_score desc,ub.best_time asc,ub.updated_at asc nulls last,ub.user_id) as rank
    from public.user_best ub left join public.profiles p on p.user_id=ub.user_id
    where ub.category_id=p_category_id and ub.difficulty_level_id=p_difficulty_id
      and not exists(select 1 from hq_private.leaderboard_exclusions x where x.user_id=ub.user_id)
  ) select jsonb_build_object('total',(select count(*) from ranked),
    'top',coalesce((select jsonb_agg(to_jsonb(r) order by rank) from ranked r where rank<=greatest(1,least(100,coalesce(p_limit,10)))),'[]'::jsonb),
    'me',(select to_jsonb(r) from ranked r where user_id=auth.uid()));
$$;
create or replace function public.get_leaderboard(p_category_id integer,p_difficulty_id integer,p_limit integer default 5,p_hide_nicks text[] default array['Isildur'::text])
returns table(nickname text,best_score integer,best_time integer,updated_at timestamptz)
language sql stable security definer set search_path=pg_catalog as $$
  select r.nickname,r.best_score,r.best_time,r.updated_at
    from jsonb_to_recordset(public.quiz_leaderboard(p_category_id,p_difficulty_id,p_limit)->'top')
      as r(nickname text,best_score integer,best_time integer,updated_at timestamptz);
$$;

create function public.daily_leaderboard(p_active_only boolean default false,p_limit integer default 5)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
  with dates as (
    select user_id,d,d-row_number() over(partition by user_id order by d)::int as grp
      from public.daily_result where is_correct and d<=public.us_central_today()
  ), runs as (
    select user_id,min(d) start_d,max(d) end_d,count(*)::int streak from dates group by user_id,grp
  ), best as (
    select distinct on(user_id) * from runs where not p_active_only or end_d=public.us_central_today()
      order by user_id,streak desc,end_d desc,start_d
  ), ranked as materialized (
    select b.*,coalesce(p.nickname,'Anonymous') nickname,
      row_number() over(order by b.streak desc,b.end_d desc,b.user_id) rank
      from best b left join public.profiles p on p.user_id=b.user_id
  ) select jsonb_build_object('total',(select count(*) from ranked),
    'top',coalesce((select jsonb_agg(to_jsonb(r) order by rank) from ranked r where rank<=greatest(1,least(100,coalesce(p_limit,5)))),'[]'::jsonb),
    'me',(select to_jsonb(r) from ranked r where user_id=auth.uid()));
$$;

create function public.my_game_stats()
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
    select days.d::date d,case when r.user_id is not null then case when r.is_correct then 'correct' else 'wrong' end
      when s.user_id is not null then case when days.d::date<public.us_central_today() then 'missed' else 'started' end else 'not-played' end outcome,r.time_spent
    from generate_series(public.us_central_today()-29,public.us_central_today(),interval '1 day') days(d)
      left join public.daily_result r on r.user_id=uid and r.d=days.d::date
      left join public.daily_session s on s.user_id=uid and s.d=days.d::date
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

-- Player identity cannot be rewritten to evade exclusions or impersonate an existing name.
create function hq_private.guard_player_identity()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if tg_op='UPDATE' and old.nickname is not null and btrim(old.nickname)<>'' and
    (new.nickname is distinct from old.nickname or new.user_id is distinct from old.user_id) then
    raise exception 'Your nickname cannot be changed' using errcode='23514';
  end if;
  return new;
end $$;
create unique index hq_profiles_nickname_folded on public.profiles(lower(btrim(nickname))) where nickname is not null;
create trigger hq_player_identity before update on public.profiles for each row execute function hq_private.guard_player_identity();

-- Lock every old write path, including overloads and implicit PUBLIC grants.
do $$ declare f record; t text; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('get_game_question','answer_game_question','upsert_user_best','touch_question_stats',
      'start_daily','start_daily_session','submit_daily_result','get_daily_question','get_daily_question_public','get_daily_archive_public') loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
  end loop;
  foreach t in array array['user_best','leaderboard_seed','question_stats','daily_session','daily_result'] loop
    execute format('revoke insert,update,delete,truncate,references,trigger on public.%I from public,anon,authenticated',t);
  end loop;
  for t in select tablename from pg_tables where schemaname='hq_private' loop
    execute format('alter table hq_private.%I enable row level security',t);
    execute format('revoke all on hq_private.%I from public,anon,authenticated',t);
  end loop;
end $$;
alter table public.leaderboard_seed enable row level security;
alter table public.user_best enable row level security;
alter table public.profiles enable row level security;
alter table public.daily_session enable row level security;
alter table public.daily_result enable row level security;
revoke all on public.leaderboard_seed from public,anon,authenticated;
revoke select on public.daily_session from public,anon,authenticated;
revoke select on public.daily_challenge from public,anon,authenticated;
revoke select on public.daily_result from public,anon,authenticated;
grant select(user_id,d,is_correct,time_spent,answered_at) on public.daily_result to authenticated;
revoke delete,truncate,references,trigger on public.profiles from public,anon,authenticated;
revoke all on all functions in schema hq_private from public,anon,authenticated;
revoke all on schema hq_private from public,anon,authenticated;
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('quiz_start','quiz_next','quiz_answer','quiz_finish','daily_status','daily_begin',
      'quiz_leaderboard','daily_leaderboard','my_game_stats','submit_daily_answer') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
    if f.proname in ('quiz_start','quiz_next','quiz_answer','quiz_finish','daily_status','quiz_leaderboard','daily_leaderboard') then
      execute format('grant execute on function %s to anon',f.signature);
    end if;
  end loop;
end $$;
notify pgrst,'reload schema';
