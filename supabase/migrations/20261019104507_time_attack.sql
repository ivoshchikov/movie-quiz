-- Fixed-clock Time Attack. Normal/Daily records and question content are preserved.
create table hq_private.time_attack_sessions (
  id uuid primary key, owner uuid, category_id integer not null,
  level text not null check(level in ('easy','medium','hard')),
  duration_secs integer not null check(duration_secs in (60,90,120)),
  started_at timestamptz not null, deadline_at timestamptz not null,
  finished_at timestamptz, finish_reason text check(finish_reason in ('time-up','completed','exit')),
  score integer not null default 0, correct integer not null default 0,
  wrong integer not null default 0, skipped integer not null default 0,
  last_answer_at timestamptz, score_time_ms bigint,
  current_number integer not null default 1, bank_size integer not null default 0,
  version bigint not null default 1, guest_source text,
  previous_best jsonb, personal_best jsonb, record_outcome text check(record_outcome in ('first','new')),
  snapshots_purged boolean not null default false
);
create index time_attack_owner_started on hq_private.time_attack_sessions(owner,started_at desc);
create unique index time_attack_one_active on hq_private.time_attack_sessions(owner) where owner is not null and finished_at is null;
create index time_attack_expiry on hq_private.time_attack_sessions(deadline_at) where finished_at is null;
create index time_attack_guest_source on hq_private.time_attack_sessions(guest_source,started_at) where owner is null;
create index time_attack_prune on hq_private.time_attack_sessions(finished_at) where finished_at is not null and not snapshots_purged;
create table hq_private.time_attack_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references hq_private.time_attack_sessions(id) on delete cascade,
  number integer not null, question_id integer not null, revision integer not null,
  difficulty_id integer not null, image_url text not null, options_json jsonb not null, correct_answer text not null,
  issued_at timestamptz, settled_at timestamptz, selected text,
  outcome text check(outcome in ('correct','wrong','skipped','abandoned')),
  unique(session_id,number), unique(session_id,question_id)
);
create table hq_private.time_attack_bests (
  owner uuid not null, category_id integer not null, level text not null,
  score integer not null, score_time_ms bigint not null check(score_time_ms>=0),
  updated_at timestamptz not null, session_id uuid not null,
  primary key(owner,category_id,level)
);
create index time_attack_ranking on hq_private.time_attack_bests(category_id,level,score desc,score_time_ms,updated_at,owner);
alter table hq_private.time_attack_sessions enable row level security;
alter table hq_private.time_attack_rounds enable row level security;
alter table hq_private.time_attack_bests enable row level security;
revoke all on hq_private.time_attack_sessions,hq_private.time_attack_rounds,hq_private.time_attack_bests from public,anon,authenticated;

-- Time Attack outcomes have their own mode and explicit skips; they never enter normal accuracy/streaks.
alter table hq_private.answer_events drop constraint answer_events_mode_check;
alter table hq_private.answer_events add constraint answer_events_mode_check check(mode in ('normal','daily','time_attack'));
alter table hq_private.answer_events drop constraint answer_events_outcome_check;
alter table hq_private.answer_events add constraint answer_events_outcome_check check(outcome in ('correct','wrong','timeout','abandoned','skipped'));
alter table hq_private.question_cohort_metrics drop constraint question_cohort_metrics_mode_check;
alter table hq_private.question_cohort_metrics add constraint question_cohort_metrics_mode_check check(mode in ('normal','daily','time_attack'));
alter table hq_private.question_metrics add column skipped bigint not null default 0;
alter table hq_private.question_cohort_metrics add column skipped bigint not null default 0;

create function public.time_attack_catalog() returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
  select jsonb_build_object('categories',coalesce((select jsonb_agg(to_jsonb(c) order by id) from (
    select c.id,c.name,count(*)::integer bank_size from public.category c join public.question q on q.category_id=c.id
    join public.difficulty_level d on d.id=q.difficulty_level_id
    where c.id in (1,2) and q.retired_at is null and d.key in ('easy','normal','medium','hard')
      and hq_private.valid_question(q.options_json,q.correct_answer) group by c.id,c.name
  ) c),'[]'::jsonb),'levels',jsonb_build_array(
    jsonb_build_object('key','easy','name','Easy','duration_secs',120),
    jsonb_build_object('key','medium','name','Medium','duration_secs',90),
    jsonb_build_object('key','hard','name','Hard','duration_secs',60)));
$$;

create function hq_private.time_attack_event(p_session uuid,p_round uuid,p_outcome text,p_answer text,p_at timestamptz)
returns void language plpgsql set search_path=pg_catalog as $$
declare s hq_private.time_attack_sessions; r hq_private.time_attack_rounds; e hq_private.answer_events;
begin
  select * into s from hq_private.time_attack_sessions where id=p_session;
  select * into r from hq_private.time_attack_rounds where id=p_round and session_id=p_session;
  if not found or r.issued_at is null or r.outcome is not null then return; end if;
  update hq_private.time_attack_rounds set outcome=p_outcome,selected=p_answer,settled_at=p_at where id=r.id;
  e.id:=gen_random_uuid(); e.session_id:=s.id; e.round_id:=r.id; e.owner:=s.owner;
  e.question_id:=r.question_id; e.revision:=r.revision; e.mode:='time_attack';
  e.category_id:=s.category_id; e.difficulty_id:=r.difficulty_id; e.outcome:=p_outcome; e.selected:=p_answer;
  select ordinality::int into e.option_position from jsonb_array_elements_text(r.options_json) with ordinality where value=p_answer;
  e.response_ms:=greatest(0,floor(extract(epoch from p_at-r.issued_at)*1000)::bigint); e.occurred_at:=p_at;
  perform hq_private.record_answer(e);
end $$;

create function hq_private.finish_time_attack(p_session uuid,p_reason text,p_at timestamptz)
returns void language plpgsql set search_path=pg_catalog as $$
declare s hq_private.time_attack_sessions; old hq_private.time_attack_bests; best hq_private.time_attack_bests;
  r hq_private.time_attack_rounds; t timestamptz; ms bigint; award text;
begin
  select * into s from hq_private.time_attack_sessions where id=p_session for update;
  if not found or s.finished_at is not null then return; end if;
  t:=least(p_at,s.deadline_at);
  select * into r from hq_private.time_attack_rounds where session_id=s.id and number=s.current_number;
  if r.issued_at is not null and r.outcome is null then perform hq_private.time_attack_event(s.id,r.id,'abandoned',null,t); end if;
  ms:=greatest(0,floor(extract(epoch from coalesce(s.last_answer_at,t)-s.started_at)*1000)::bigint);
  -- No-answer exits may have zero points; negative scores must remain negative.
  if s.owner is not null and s.bank_size>0 then
    select * into old from hq_private.time_attack_bests where owner=s.owner and category_id=s.category_id and level=s.level for update;
    if old.owner is null then award:='first';
    elsif s.score>old.score or (s.score=old.score and ms<old.score_time_ms) then award:='new'; end if;
    insert into hq_private.time_attack_bests(owner,category_id,level,score,score_time_ms,updated_at,session_id)
      values(s.owner,s.category_id,s.level,s.score,ms,t,s.id)
    on conflict(owner,category_id,level) do update set score=excluded.score,score_time_ms=excluded.score_time_ms,
      updated_at=excluded.updated_at,session_id=excluded.session_id
      where excluded.score>time_attack_bests.score or (excluded.score=time_attack_bests.score and excluded.score_time_ms<time_attack_bests.score_time_ms);
    select * into best from hq_private.time_attack_bests where owner=s.owner and category_id=s.category_id and level=s.level;
  end if;
  update hq_private.time_attack_sessions set finished_at=t,finish_reason=p_reason,score_time_ms=ms,version=version+1,
    previous_best=case when old.owner is not null then jsonb_build_object('score',old.score,'score_time_ms',old.score_time_ms) end,
    personal_best=case when best.owner is not null then jsonb_build_object('score',best.score,'score_time_ms',best.score_time_ms) end,
    record_outcome=award where id=s.id;
  delete from hq_private.time_attack_rounds where session_id=s.id and issued_at is null;
end $$;

create function hq_private.lock_time_attack(p_session uuid) returns hq_private.time_attack_sessions
language plpgsql set search_path=pg_catalog as $$
declare s hq_private.time_attack_sessions; uid uuid:=auth.uid();
begin
  if uid is not null then perform pg_advisory_xact_lock(721105,hashtext(uid::text)); end if;
  select * into s from hq_private.time_attack_sessions where id=p_session for update;
  if not found or s.owner is distinct from uid then raise exception 'Time Attack unavailable' using errcode='42501'; end if;
  if s.finished_at is null and clock_timestamp()>=s.deadline_at then
    perform hq_private.finish_time_attack(s.id,'time-up',s.deadline_at);
    select * into s from hq_private.time_attack_sessions where id=p_session;
  end if;
  return s;
end $$;
create function hq_private.time_attack_view(p_session uuid) returns jsonb
language sql set search_path=pg_catalog as $$
  select jsonb_build_object('id',s.id,'owner',s.owner,'category_id',s.category_id,'level',s.level,'duration_secs',s.duration_secs,
    'score',s.score,'correct',s.correct,'wrong',s.wrong,'skipped',s.skipped,'version',s.version,'bank_size',s.bank_size,
    'started_at',s.started_at,'deadline_at',s.deadline_at,'server_now',clock_timestamp(),
    'status',case when s.finished_at is null then 'active' else 'finished' end,'finish_reason',s.finish_reason,
    'elapsed_ms',greatest(0,floor(extract(epoch from coalesce(s.finished_at,least(clock_timestamp(),s.deadline_at))-s.started_at)*1000)::bigint),
    'score_time_ms',s.score_time_ms,'previous_best',s.previous_best,'personal_best',s.personal_best,'record_outcome',s.record_outcome,
    'round',(select jsonb_build_object('id',r.id,'number',r.number,'question_id',r.question_id,'image_url',r.image_url,
      'options',r.options_json,'issued_at',r.issued_at,'next_at',r.settled_at+interval '500 milliseconds','outcome',r.outcome,'selected',r.selected)
      from hq_private.time_attack_rounds r where r.session_id=s.id and r.number=s.current_number and r.issued_at is not null))
  from hq_private.time_attack_sessions s where s.id=p_session;
$$;
create function public.time_attack_status(p_session uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.time_attack_sessions;
begin s:=hq_private.lock_time_attack(p_session); return hq_private.time_attack_view(s.id); end $$;
create function public.time_attack_active() returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare sid uuid;
begin
  if auth.uid() is null then raise exception 'Log in to continue Time Attack' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(721105,hashtext(auth.uid()::text));
  select id into sid from hq_private.time_attack_sessions where owner=auth.uid() and finished_at is null;
  if sid is null then return null; end if;
  return public.time_attack_status(sid);
end $$;

create function public.time_attack_start(p_session uuid,p_category_id integer,p_level text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.time_attack_sessions; uid uuid:=auth.uid(); source text; sid uuid; n integer; secs integer; t timestamptz;
begin
  if p_session is null or p_category_id is null or p_category_id not in (1,2) or p_level is null or p_level not in ('easy','medium','hard') then raise exception 'Invalid Time Attack settings'; end if;
  if uid is null then perform pg_advisory_xact_lock(721106,hashtext(p_session::text));
  else
    perform pg_advisory_xact_lock(721105,hashtext(uid::text));
    if not exists(select 1 from public.profiles where user_id=uid and length(btrim(nickname))>0) then raise exception 'Choose a nickname first'; end if;
  end if;
  select * into s from hq_private.time_attack_sessions where id=p_session for update;
  if found then
    if s.owner is distinct from uid or s.category_id<>p_category_id or s.level<>p_level then raise exception 'Time Attack unavailable' using errcode='42501'; end if;
    return public.time_attack_status(s.id);
  end if;
  perform hq_private.prune_gameplay();
  if uid is null then source:=hq_private.guard_guest_start(p_category_id,null); end if;
  t:=clock_timestamp();
  if uid is not null and ((select count(*) from (
    select started_at from hq_private.game_sessions where owner=uid union all select started_at from hq_private.time_attack_sessions where owner=uid
  ) g where started_at>t-interval '1 minute')>=12 or (select count(*) from (
    select started_at from hq_private.game_sessions where owner=uid union all select started_at from hq_private.time_attack_sessions where owner=uid
  ) g where started_at>t-interval '1 hour')>=240) then raise exception 'Too many new games. Please wait a minute' using errcode='PT429'; end if;
  for sid in select id from hq_private.time_attack_sessions where owner=uid and finished_at is null for update loop
    perform public.time_attack_finish(sid);
  end loop;
  for sid in select id from hq_private.game_sessions where owner=uid and finished_at is null for update loop
    perform public.quiz_finish(sid);
  end loop;
  secs:=case p_level when 'easy' then 120 when 'medium' then 90 else 60 end;
  insert into hq_private.time_attack_sessions(id,owner,category_id,level,duration_secs,started_at,deadline_at,guest_source)
    values(p_session,uid,p_category_id,p_level,secs,t,t+make_interval(secs=>secs),source);
  -- Weighted order inside each stratum, then randomized 2 Easy / 2 Medium / 1 Hard blocks.
  -- Exhausted strata disappear; every remaining valid question can still be played once.
  with ranked as materialized (
    select q.*,case when d.key='hard' then 1 else 2 end quota,
      row_number() over(partition by case when d.key='medium' then 'normal' else d.key end order by -ln(greatest(random(),1e-15))/q.selection_weight,q.id) rn
    from public.question q join public.difficulty_level d on d.id=q.difficulty_level_id
    where q.category_id=p_category_id and q.retired_at is null and d.key in ('easy','normal','medium','hard')
      and hq_private.valid_question(q.options_json,q.correct_answer)
  ) insert into hq_private.time_attack_rounds(session_id,number,question_id,revision,difficulty_id,image_url,options_json,correct_answer)
    select p_session,row_number() over(order by (rn-1)/quota,random(),id)::integer,id,admin_revision,difficulty_level_id,image_url,
      (select jsonb_agg(value order by random()) from jsonb_array_elements(options_json)),correct_answer from ranked;
  get diagnostics n=row_count;
  if uid is null then perform hq_private.check_guest_round_budget(); end if;
  -- Start only after admission and snapshot construction. Loading/network time after issue counts.
  t:=clock_timestamp();
  update hq_private.time_attack_sessions set bank_size=n,started_at=t,deadline_at=t+make_interval(secs=>secs) where id=p_session;
  if n=0 then perform hq_private.finish_time_attack(p_session,'completed',t);
  else update hq_private.time_attack_rounds set issued_at=t where session_id=p_session and number=1; end if;
  return hq_private.time_attack_view(p_session);
end $$;
create function public.time_attack_next(p_session uuid,p_round uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.time_attack_sessions; r hq_private.time_attack_rounds; t timestamptz;
begin
  s:=hq_private.lock_time_attack(p_session);
  if s.finished_at is not null then return hq_private.time_attack_view(s.id); end if;
  select * into r from hq_private.time_attack_rounds where session_id=s.id and number=s.current_number;
  t:=clock_timestamp();
  if t>=s.deadline_at then perform hq_private.finish_time_attack(s.id,'time-up',s.deadline_at); return hq_private.time_attack_view(s.id); end if;
  if r.id is distinct from p_round or r.outcome is null or t<r.settled_at+interval '500 milliseconds' then return hq_private.time_attack_view(s.id); end if;
  update hq_private.time_attack_sessions set current_number=current_number+1,version=version+1 where id=s.id;
  update hq_private.time_attack_rounds set issued_at=t where session_id=s.id and number=s.current_number+1;
  return hq_private.time_attack_view(s.id);
end $$;
create function public.time_attack_action(p_session uuid,p_round uuid,p_action text,p_answer text default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.time_attack_sessions; r hq_private.time_attack_rounds; t timestamptz; outcome text;
begin
  s:=hq_private.lock_time_attack(p_session);
  if p_action is null or p_action not in ('answer','skip') or (p_action='skip' and p_answer is not null) then raise exception 'Invalid action'; end if;
  select * into r from hq_private.time_attack_rounds where id=p_round and session_id=s.id and issued_at is not null;
  if not found then raise exception 'Question unavailable'; end if;
  if r.outcome in ('correct','wrong','skipped') then
    if (r.outcome='skipped' and p_action<>'skip') or (r.outcome<>'skipped' and (p_action<>'answer' or r.selected is distinct from p_answer)) then raise exception 'Action already accepted'; end if;
    return hq_private.time_attack_view(s.id);
  end if;
  if s.finished_at is not null then return hq_private.time_attack_view(s.id); end if;
  if r.number<>s.current_number then raise exception 'Question unavailable'; end if;
  if p_action='answer' and (p_answer is null or not exists(select 1 from jsonb_array_elements_text(r.options_json) where value=p_answer)) then raise exception 'Choose an available answer'; end if;
  t:=clock_timestamp();
  -- Recheck the clock after validation; the deadline is exclusive.
  if t>=s.deadline_at then perform hq_private.finish_time_attack(s.id,'time-up',s.deadline_at); return hq_private.time_attack_view(s.id); end if;
  outcome:=case when p_action='skip' then 'skipped' when lower(btrim(p_answer))=lower(btrim(r.correct_answer)) then 'correct' else 'wrong' end;
  perform hq_private.time_attack_event(s.id,r.id,outcome,p_answer,t);
  update hq_private.time_attack_sessions set score=score+case outcome when 'correct' then 2 when 'wrong' then -1 else 0 end,
    correct=correct+(outcome='correct')::int,wrong=wrong+(outcome='wrong')::int,skipped=skipped+(outcome='skipped')::int,
    last_answer_at=case when outcome<>'skipped' then t else last_answer_at end,
    deadline_at=greatest(t,deadline_at-case when outcome='skipped' then interval '3 seconds' else interval '0 seconds' end),version=version+1 where id=s.id;
  select * into s from hq_private.time_attack_sessions where id=s.id;
  if t>=s.deadline_at then perform hq_private.finish_time_attack(s.id,'time-up',t);
  elsif r.number=s.bank_size then perform hq_private.finish_time_attack(s.id,'completed',t); end if;
  return hq_private.time_attack_view(s.id);
end $$;
create function public.time_attack_finish(p_session uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.time_attack_sessions;
begin
  s:=hq_private.lock_time_attack(p_session);
  if s.finished_at is null then perform hq_private.finish_time_attack(s.id,'exit',clock_timestamp()); end if;
  return hq_private.time_attack_view(s.id);
end $$;

create function public.time_attack_leaderboard(p_category_id integer,p_level text,p_limit integer default 10) returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
  with ranked as materialized (
    select row_number() over(order by b.score desc,b.score_time_ms,b.updated_at,b.owner) rank,
      b.owner user_id,p.nickname,b.score,b.score_time_ms,b.updated_at
    from hq_private.time_attack_bests b join public.profiles p on p.user_id=b.owner
    where b.category_id=p_category_id and b.level=p_level and length(btrim(p.nickname))>0
  ) select jsonb_build_object('total',(select count(*) from ranked),
    'top',coalesce((select jsonb_agg(to_jsonb(r) order by rank) from ranked r where rank<=greatest(1,least(coalesce(p_limit,10),100))),'[]'::jsonb),
    'me',(select to_jsonb(r) from ranked r where user_id=auth.uid()));
$$;
create function public.my_time_attack_bests() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
  if auth.uid() is null then raise exception 'Log in to view records' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('category_id',category_id,'level',level,'score',score,
    'score_time_ms',score_time_ms,'updated_at',updated_at) order by category_id,level) from hq_private.time_attack_bests where owner=auth.uid()),'[]'::jsonb);
end $$;

-- Both game formats share the same admission lock, sliding quotas and snapshot budget.
create view hq_private.game_admissions with (security_invoker=true) as
  select owner,started_at,guest_source from hq_private.game_sessions
  union all select owner,started_at,guest_source from hq_private.time_attack_sessions;
revoke all on hq_private.game_admissions from public,anon,authenticated;
create function hq_private.guest_round_count() returns bigint
language sql stable set search_path=pg_catalog as $$
  select (select count(*) from hq_private.game_rounds r join hq_private.game_sessions s on s.id=r.session_id where s.owner is null)
    +(select count(*) from hq_private.time_attack_rounds r join hq_private.time_attack_sessions s on s.id=r.session_id where s.owner is null);
$$;
create function hq_private.check_guest_round_budget() returns void
language plpgsql set search_path=pg_catalog as $$
begin
  if hq_private.guest_round_count()>(select guest_round_budget from hq_private.gameplay_settings) then
    raise exception 'Guest games are temporarily busy. Please try again shortly.' using errcode='PT429';
  end if;
end $$;
create or replace function hq_private.add_cohort_event(p_event hq_private.answer_events,p_cohort text) returns void
language sql set search_path=pg_catalog as $$
  insert into hq_private.question_cohort_metrics(question_id,revision,mode,cohort,correct,wrong,timeouts,abandoned,response_ms,timed_answers,skipped)
  values(p_event.question_id,p_event.revision,p_event.mode,p_cohort,(p_event.outcome='correct')::int,
    (p_event.outcome='wrong')::int,(p_event.outcome='timeout')::int,(p_event.outcome='abandoned')::int,
    case when p_event.outcome in ('correct','wrong') then coalesce(p_event.response_ms,0) else 0 end,
    (p_event.outcome in ('correct','wrong'))::int,(p_event.outcome='skipped')::int)
  on conflict(question_id,revision,mode,cohort) do update set correct=question_cohort_metrics.correct+excluded.correct,
    wrong=question_cohort_metrics.wrong+excluded.wrong,timeouts=question_cohort_metrics.timeouts+excluded.timeouts,
    abandoned=question_cohort_metrics.abandoned+excluded.abandoned,response_ms=question_cohort_metrics.response_ms+excluded.response_ms,
    timed_answers=question_cohort_metrics.timed_answers+excluded.timed_answers,skipped=question_cohort_metrics.skipped+excluded.skipped;
$$;

create or replace function hq_private.record_answer(p_event hq_private.answer_events)
returns void language plpgsql set search_path=pg_catalog as $$
declare added integer;
begin
  perform pg_advisory_xact_lock(721110,hashtext(p_event.question_id::text||':'||p_event.revision::text||':'||p_event.mode));
  insert into hq_private.answer_events select (p_event).* on conflict do nothing;
  if not found then return; end if;
  insert into hq_private.question_metrics(question_id,revision,mode,correct,wrong,timeouts,abandoned,response_ms,timed_answers,skipped)
    values(p_event.question_id,p_event.revision,p_event.mode,(p_event.outcome='correct')::int,
      (p_event.outcome='wrong')::int,(p_event.outcome='timeout')::int,(p_event.outcome='abandoned')::int,
      case when p_event.outcome in ('correct','wrong') then coalesce(p_event.response_ms,0) else 0 end,
      (p_event.outcome in ('correct','wrong'))::int,(p_event.outcome='skipped')::int)
  on conflict(question_id,revision,mode) do update set
    correct=question_metrics.correct+excluded.correct, wrong=question_metrics.wrong+excluded.wrong,
    timeouts=question_metrics.timeouts+excluded.timeouts, abandoned=question_metrics.abandoned+excluded.abandoned,
    response_ms=question_metrics.response_ms+excluded.response_ms,timed_answers=question_metrics.timed_answers+excluded.timed_answers,skipped=question_metrics.skipped+excluded.skipped;
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

create or replace function hq_private.guard_guest_start(p_category integer,p_difficulty integer) returns text
language plpgsql set search_path=pg_catalog as $$
declare cfg hq_private.gameplay_settings; headers jsonb; address text; source text; previous_source text; day date; t timestamptz:=clock_timestamp(); n bigint;
begin
  -- The global lock/budgets cannot be bypassed with a forged or changing source header.
  perform pg_advisory_xact_lock(721107,1);
  t:=clock_timestamp();
  select * into cfg from hq_private.gameplay_settings;
  if (select count(*) from hq_private.game_admissions where owner is null and started_at>t-interval '1 minute')>=cfg.guest_global_minute
    or (select count(*) from hq_private.game_admissions where owner is null and started_at>t-interval '1 hour')>=cfg.guest_global_hour then
    raise exception 'Too many new guest games. Please wait a minute.' using errcode='PT429';
  end if;
  begin headers:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
  exception when others then headers:='{}'::jsonb; end;
  address:=left(btrim(split_part(coalesce(headers->>'x-forwarded-for',''),',',1)),128);
  begin address:=host(address::inet); exception when others then address:='unknown'; end;
  day:=(t at time zone 'America/Chicago')::date;
  source:=encode(sha256(convert_to(cfg.guest_salt||':'||day::text||':'||coalesce(address,'unknown'),'UTF8')),'hex');
  previous_source:=encode(sha256(convert_to(cfg.guest_salt||':'||(day-1)::text||':'||coalesce(address,'unknown'),'UTF8')),'hex');
  -- Rotation at midnight must not reset either sliding window.
  if (select count(*) from hq_private.game_admissions where owner is null and guest_source in(source,previous_source) and started_at>t-interval '1 minute')>=cfg.guest_source_minute
    or (select count(*) from hq_private.game_admissions where owner is null and guest_source in(source,previous_source) and started_at>t-interval '1 hour')>=cfg.guest_source_hour then
    raise exception 'Too many new games from this network. Please wait a minute.' using errcode='PT429';
  end if;
  select count(*) into n from public.question q where q.retired_at is null and q.category_id=p_category
    and (p_difficulty is null or q.difficulty_level_id=p_difficulty) and hq_private.valid_question(q.options_json,q.correct_answer);
  if n+hq_private.guest_round_count()>cfg.guest_round_budget then
    raise exception 'Guest games are temporarily busy. Please try again shortly.' using errcode='PT429';
  end if;
  return source;
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
  if uid is null then v_source:=hq_private.guard_guest_start(p_category_id,p_difficulty_id); v_now:=clock_timestamp(); end if;
  if uid is not null and ((select count(*) from hq_private.game_admissions where owner=uid and started_at>v_now-interval '1 minute')>=12
    or (select count(*) from hq_private.game_admissions where owner=uid and started_at>v_now-interval '1 hour')>=240) then
    raise exception 'Too many new games. Please wait a minute';
  end if;
  select * into level from public.difficulty_level where id=p_difficulty_id;
  if not found or level.time_limit_secs<=0 or level.lives<=0 or not exists(select 1 from public.category where id=p_category_id) then raise exception 'Invalid quiz settings'; end if;
  -- A player cannot keep several ranked runs open to inspect questions in parallel.
  for old_id in select id from hq_private.game_sessions where owner=uid and finished_at is null for update loop
    perform public.quiz_finish(old_id);
  end loop;
  for old_id in select id from hq_private.time_attack_sessions where owner=uid and finished_at is null for update loop
    perform public.time_attack_finish(old_id);
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
  if uid is null then perform hq_private.check_guest_round_budget(); end if;
  update hq_private.game_sessions set bank_size=level.mistakes_allowed where id=p_session;
  if level.mistakes_allowed=0 then
    update hq_private.game_sessions set finished_at=clock_timestamp(),finish_reason='completed' where id=p_session;
  end if;
  return hq_private.game_view(p_session);
end $$;

create or replace function hq_private.prune_gameplay()
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
  select array_agg(id) into ids from (select id from hq_private.time_attack_sessions
    where owner is null and started_at<clock_timestamp()-interval '1 day' order by started_at limit 100 for update skip locked) old_ta_guests;
  delete from hq_private.time_attack_sessions where id=any(ids);
  select array_agg(id) into ids from (select id from hq_private.time_attack_sessions
    where finished_at<clock_timestamp()-interval '30 days' and not snapshots_purged order by finished_at limit 20 for update skip locked) old_ta_games;
  delete from hq_private.time_attack_rounds where session_id=any(ids);
  update hq_private.time_attack_sessions set snapshots_purged=true where id=any(ids);
end $$;

create or replace function hq_private.maintain_gameplay() returns void
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
  for candidate in select id,owner from hq_private.time_attack_sessions where finished_at is null and deadline_at<=t order by deadline_at limit 100 loop
    if candidate.owner is not null and not pg_try_advisory_xact_lock(721105,hashtext(candidate.owner::text)) then continue; end if;
    if exists(select 1 from hq_private.time_attack_sessions where id=candidate.id for update skip locked) then
      perform hq_private.finish_time_attack(candidate.id,'time-up',(select deadline_at from hq_private.time_attack_sessions where id=candidate.id));
    end if;
  end loop;
  perform hq_private.prune_gameplay();
end $$;


revoke all on all functions in schema hq_private from public,anon,authenticated;
revoke all on function public.time_attack_catalog(),public.time_attack_start(uuid,integer,text),
  public.time_attack_status(uuid),public.time_attack_active(),public.time_attack_next(uuid,uuid),
  public.time_attack_action(uuid,uuid,text,text),public.time_attack_finish(uuid),
  public.time_attack_leaderboard(integer,text,integer),public.my_time_attack_bests() from public,anon,authenticated;
grant execute on function public.time_attack_catalog(),public.time_attack_start(uuid,integer,text),
  public.time_attack_status(uuid),public.time_attack_next(uuid,uuid),public.time_attack_action(uuid,uuid,text,text),
  public.time_attack_finish(uuid),public.time_attack_leaderboard(integer,text,integer) to anon,authenticated;
grant execute on function public.time_attack_active(),public.my_time_attack_bests() to authenticated;
grant execute on function hq_private.maintain_gameplay() to service_role;
notify pgrst,'reload schema';
