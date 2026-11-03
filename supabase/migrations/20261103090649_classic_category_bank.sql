-- Classic v2: one eligible bank per category and separate records.
-- Existing sessions keep their snapshots, clocks and legacy record destination.
alter table hq_private.game_sessions
  add column rules_version smallint not null default 1 check(rules_version in (1,2));

create table public.classic_bests (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  category_id integer not null references public.category(id),
  difficulty_level_id integer not null references public.difficulty_level(id),
  best_score integer not null check(best_score >= 0),
  best_time integer not null check(best_time >= 0),
  updated_at timestamptz not null,
  verified_session_id uuid not null,
  primary key(user_id,category_id,difficulty_level_id)
);
create index classic_bests_rank on public.classic_bests
  (category_id,difficulty_level_id,best_score desc,best_time,updated_at,user_id);
alter table public.classic_bests enable row level security;
revoke all on public.classic_bests from public,anon,authenticated,service_role;
grant select on public.classic_bests to authenticated;
create policy classic_bests_own_read on public.classic_bests
  for select to authenticated using(user_id=(select auth.uid()));

-- The shared catalogue keeps the original level IDs, keys and question tags.
-- Other modes do not read these Classic timer/life columns.
update public.difficulty_level d
set time_limit_secs=rules.seconds,lives=rules.lives,mistakes_allowed=rules.lives-1
from (values ('easy',45,5),('normal',30,3),('hard',20,1)) as rules(key,seconds,lives)
where d.key=rules.key;

create or replace function hq_private.finish_game(p_session uuid,p_reason text,p_at timestamptz)
returns void language plpgsql set search_path=pg_catalog as $$
declare s hq_private.game_sessions; v_time integer; old public.user_best; best public.user_best; award text;
  old_current public.classic_bests; best_current public.classic_bests;
  previous_record jsonb; current_record jsonb;
begin
  select * into s from hq_private.game_sessions where id=p_session for update;
  if not found or s.finished_at is not null then return; end if;
  v_time:=greatest(0,floor(extract(epoch from p_at-s.started_at))::integer);
  if s.owner is not null then
    -- All gameplay writers take the same owner lock, including simultaneous finishes.
    if s.rules_version=2 then
      select * into old_current from public.classic_bests where user_id=s.owner and category_id=s.category_id and difficulty_level_id=s.difficulty_id for update;
      if old_current.user_id is null then award:='first';
      elsif s.score>old_current.best_score or (s.score=old_current.best_score and v_time<old_current.best_time) then award:='new'; end if;
      insert into public.classic_bests(user_id,category_id,difficulty_level_id,best_score,best_time,updated_at,verified_session_id)
        values(s.owner,s.category_id,s.difficulty_id,s.score,v_time,p_at,s.id)
      on conflict(user_id,category_id,difficulty_level_id) do update set
        best_score=excluded.best_score,best_time=excluded.best_time,updated_at=excluded.updated_at,verified_session_id=excluded.verified_session_id
        where excluded.best_score>classic_bests.best_score or (excluded.best_score=classic_bests.best_score and excluded.best_time<classic_bests.best_time);
      select * into best_current from public.classic_bests where user_id=s.owner and category_id=s.category_id and difficulty_level_id=s.difficulty_id;
      if old_current.user_id is not null then previous_record:=jsonb_build_object('score',old_current.best_score,'time',old_current.best_time); end if;
      current_record:=jsonb_build_object('score',best_current.best_score,'time',best_current.best_time);
    else
      select * into old from public.user_best where user_id=s.owner and category_id=s.category_id and difficulty_level_id=s.difficulty_id for update;
      if old.user_id is null then award:='first';
      elsif s.score>old.best_score or (s.score=old.best_score and v_time<old.best_time) then award:='new'; end if;
      insert into public.user_best(user_id,category_id,difficulty_level_id,best_score,best_time,updated_at,verified_session_id)
        values(s.owner,s.category_id,s.difficulty_id,s.score,v_time,p_at,s.id)
      on conflict(user_id,category_id,difficulty_level_id) do update set
        best_score=excluded.best_score,best_time=excluded.best_time,updated_at=excluded.updated_at,verified_session_id=excluded.verified_session_id
        where excluded.best_score>user_best.best_score or (excluded.best_score=user_best.best_score and excluded.best_time<user_best.best_time);
      select * into best from public.user_best where user_id=s.owner and category_id=s.category_id and difficulty_level_id=s.difficulty_id;
      if old.user_id is not null then previous_record:=jsonb_build_object('score',old.best_score,'time',old.best_time); end if;
      current_record:=jsonb_build_object('score',best.best_score,'time',best.best_time);
    end if;
  end if;
  update hq_private.game_sessions set finished_at=p_at,finish_reason=p_reason,record_outcome=award,
    previous_best=previous_record,personal_best=current_record where id=s.id;
  delete from hq_private.game_rounds where session_id=s.id and issued_at is null;
end $$;

create or replace function hq_private.game_view(p_session uuid)
returns jsonb language sql set search_path=pg_catalog as $$
  select jsonb_build_object('id',s.id,'score',s.score,'lives',s.lives,'status',case when s.finished_at is null then 'active' else 'finished' end,
    'rules_version',s.rules_version,'category_id',s.category_id,'difficulty_id',s.difficulty_id,'bank_size',s.bank_size,'started_at',s.started_at,
    'server_now',clock_timestamp(),'finish_reason',s.finish_reason,
    'time_secs',greatest(0,floor(extract(epoch from coalesce(s.finished_at,clock_timestamp())-s.started_at))::int),
    'previous_best',s.previous_best,'personal_best',s.personal_best,'record_outcome',s.record_outcome,
    'round',(select jsonb_build_object('id',r.id,'number',r.number,'question_id',r.question_id,'image_url',r.image_url,
      'options',r.options_json,'issued_at',r.issued_at,'deadline_at',r.deadline_at,'outcome',r.outcome,'selected',r.selected)
      from hq_private.game_rounds r where r.session_id=s.id and r.number=s.current_number and r.issued_at is not null))
  from hq_private.game_sessions s where s.id=p_session;
$$;

create or replace function public.quiz_start(p_session uuid,p_category_id integer,p_difficulty_id integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.game_sessions; level public.difficulty_level; uid uuid:=auth.uid(); v_now timestamptz; old_id uuid; v_source text; v_bank_size integer;
begin
  if p_session is null then raise exception 'Invalid game'; end if;
  if uid is not null then
    perform pg_advisory_xact_lock(721105,hashtext(uid::text));
    if not exists(select 1 from public.profiles where user_id=uid and length(btrim(nickname))>0) then raise exception 'Choose a nickname first'; end if;
  else perform pg_advisory_xact_lock(721106,hashtext(p_session::text)); end if;
  select * into s from hq_private.game_sessions where id=p_session for update;
  if found then
    if s.owner is distinct from uid or s.category_id is distinct from p_category_id or s.difficulty_id is distinct from p_difficulty_id then raise exception 'Game unavailable' using errcode='42501'; end if;
    s:=hq_private.lock_game(s.id);
    return hq_private.game_view(s.id);
  end if;
  v_now:=clock_timestamp();
  perform hq_private.prune_gameplay();
  if uid is null then v_source:=hq_private.guard_guest_start(p_category_id,null); v_now:=clock_timestamp(); end if;
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
  insert into hq_private.game_sessions(id,owner,category_id,difficulty_id,time_limit_secs,initial_lives,lives,started_at,guest_source,rules_version)
    values(p_session,uid,p_category_id,p_difficulty_id,level.time_limit_secs,level.lives,level.lives,v_now,v_source,2);
  -- Exponential keys produce a weighted permutation without replacement. #175 has weight 0.1.
  insert into hq_private.game_rounds(session_id,number,question_id,revision,image_url,options_json,correct_answer)
    select p_session,row_number() over(order by -ln(greatest(random(),1e-15))/q.selection_weight,q.id)::int,
      q.id,q.admin_revision,q.image_url,
      (select jsonb_agg(value order by random()) from jsonb_array_elements(q.options_json)),q.correct_answer
    from public.question q where q.retired_at is null and q.category_id=p_category_id
      and hq_private.valid_question(q.options_json,q.correct_answer);
  get diagnostics v_bank_size = row_count;
  if uid is null then perform hq_private.check_guest_round_budget(); end if;
  update hq_private.game_sessions set bank_size=v_bank_size where id=p_session;
  if v_bank_size=0 then
    update hq_private.game_sessions set finished_at=clock_timestamp(),finish_reason='completed' where id=p_session;
  end if;
  return hq_private.game_view(p_session);
end $$;

create function public.classic_leaderboard(p_category_id integer,p_difficulty_id integer,p_limit integer default 10)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
  with ranked as materialized (
    select ub.user_id,coalesce(p.nickname,'Anonymous') nickname,ub.best_score,ub.best_time,ub.updated_at,
      row_number() over(order by ub.best_score desc,ub.best_time asc,ub.updated_at asc nulls last,ub.user_id) as rank
    from public.classic_bests ub left join public.profiles p on p.user_id=ub.user_id
    where ub.category_id=p_category_id and ub.difficulty_level_id=p_difficulty_id
  ) select jsonb_build_object('total',(select count(*) from ranked),
    'top',coalesce((select jsonb_agg(to_jsonb(r) order by rank) from ranked r where rank<=greatest(1,least(100,coalesce(p_limit,10)))),'[]'::jsonb),
    'me',(select to_jsonb(r) from ranked r where user_id=auth.uid()));
$$;
revoke all on function public.classic_leaderboard(integer,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.classic_leaderboard(integer,integer,integer) to anon,authenticated;

notify pgrst, 'reload schema';
