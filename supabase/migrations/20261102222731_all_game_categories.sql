-- Extend category admission only; clocks, weights, scoring, snapshots and quotas
-- retain the deployed implementation. This migration creates no game attempts.
set local lock_timeout='3s';
create or replace function public.time_attack_catalog() returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
  select jsonb_build_object('categories',coalesce((select jsonb_agg(to_jsonb(c) order by id) from (
    select c.id,c.name,count(*)::integer bank_size from public.category c join public.question q on q.category_id=c.id
    join public.difficulty_level d on d.id=q.difficulty_level_id
    where c.id in (1,2,3,4) and q.retired_at is null and d.key in ('easy','normal','medium','hard')
      and hq_private.valid_question(q.options_json,q.correct_answer) group by c.id,c.name
  ) c),'[]'::jsonb),'levels',jsonb_build_array(
    jsonb_build_object('key','easy','name','Easy','duration_secs',120),
    jsonb_build_object('key','medium','name','Medium','duration_secs',90),
    jsonb_build_object('key','hard','name','Hard','duration_secs',60)));
$$;

create or replace function public.time_attack_start(p_session uuid,p_category_id integer,p_level text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare s hq_private.time_attack_sessions; uid uuid:=auth.uid(); source text; sid uuid; n integer; secs integer; t timestamptz;
begin
  if p_session is null or p_category_id is null or p_category_id not in (1,2,3,4) or p_level is null or p_level not in ('easy','medium','hard') then raise exception 'Invalid Time Attack settings'; end if;
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

-- Add category-aware endpoints without overloading/replacing the existing actor
-- contracts. The original personal-top implementation remains authoritative.
create function public.this_that_top_for_board(p_board text,p_id uuid default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare profile_id uuid:=p_id; actual_board text;
begin
 if p_board is null or p_board not in('actors','actresses') then raise exception 'Invalid comparison category';end if;
 if profile_id is null and auth.uid() is not null then
  select id into profile_id from hq_private.tt_profiles where owner=auth.uid() and board=p_board;
 end if;
 if profile_id is null then return '[]'::jsonb;end if;
 select board into actual_board from hq_private.tt_profiles where id=profile_id;
 if actual_board is distinct from p_board then raise exception 'Comparison unavailable' using errcode='42501';end if;
 -- This checks the account/capability and active-user authorization as before.
 return public.this_that_top(profile_id);
end $$;
revoke all on function public.this_that_top_for_board(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.this_that_top_for_board(text,uuid) to anon,authenticated;

create function public.this_that_import_for_board(p_board text,p_operation uuid,p_choices jsonb,p_owner uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare profile_id uuid;h text;prior text;v jsonb;a_id bigint;b_id bigint;w bigint;
begin
 if p_board is null or p_board not in('actors','actresses') then raise exception 'Invalid comparison category';end if;
 -- Preserve old actor receipts byte-for-byte, including in-flight client imports.
 if p_board='actors' then perform public.this_that_import(p_operation,p_choices,p_owner);return;end if;
 if p_owner is null or auth.uid() is distinct from p_owner or not hq_private.tt_live_user(auth.uid()) then
  raise exception 'Log in to save favourites' using errcode='42501';end if;
 if p_operation is null or jsonb_typeof(p_choices) is distinct from 'array' or jsonb_array_length(p_choices)>500 then raise exception 'Invalid preference import';end if;
 perform pg_advisory_xact_lock(721113,hashtext(auth.uid()::text));
 h:=md5(jsonb_build_object('board',p_board,'choices',p_choices)::text);
 select payload_hash into prior from hq_private.tt_imports where owner=auth.uid() and operation=p_operation;
 if found then
  if prior<>h then raise exception 'Import already accepted with different content' using errcode='PT409';end if;return;
 end if;
 if (select count(*) from hq_private.tt_imports where owner=auth.uid() and created_at>clock_timestamp()-interval '1 minute')>=30 then
  raise exception 'Please retry the import later' using errcode='PT429';end if;
 select id into profile_id from hq_private.tt_profiles where owner=auth.uid() and board=p_board;
 if profile_id is null then profile_id:=gen_random_uuid();insert into hq_private.tt_profiles(id,owner,board) values(profile_id,auth.uid(),p_board);end if;
 for v in select value from jsonb_array_elements(p_choices) loop
  a_id:=(v->>'a')::bigint;b_id:=(v->>'b')::bigint;w:=(v->>'winner')::bigint;
  -- Withdrawn people retain private history, but every ID belongs to this board.
  if a_id is null or b_id is null or w is null or a_id>=b_id or w not in(a_id,b_id) or
    (select count(*) from hq_private.tt_people where id in(a_id,b_id) and board=p_board)<>2 then raise exception 'Invalid imported preference';end if;
  insert into hq_private.tt_preferences(profile,a,b,winner) values(profile_id,a_id,b_id,w) on conflict do nothing;
 end loop;
 insert into hq_private.tt_imports(owner,operation,payload_hash) values(auth.uid(),p_operation,h);
end $$;
revoke all on function public.this_that_import_for_board(text,uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.this_that_import_for_board(text,uuid,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
