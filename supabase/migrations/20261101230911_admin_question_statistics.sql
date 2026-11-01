-- Permanent, non-identifying exposure counts; gameplay/outcome rules are unchanged.
set local lock_timeout = '3s';
lock table hq_private.game_rounds, hq_private.time_attack_rounds,
  public.daily_session, hq_private.question_metrics in share row exclusive mode;

create table hq_private.question_shown_counts (
  question_id integer not null,
  revision integer not null,
  mode text not null check(mode in ('normal','daily','time_attack')),
  shown bigint not null default 0 check(shown >= 0),
  primary key(question_id,revision,mode)
);
alter table hq_private.question_shown_counts enable row level security;
revoke all on hq_private.question_shown_counts from public,anon,authenticated,service_role;

-- Outcomes persist after old guest sessions/snapshots are pruned. Only pending
-- issued rounds are added, so settled snapshots never duplicate those outcomes.
insert into hq_private.question_shown_counts(question_id,revision,mode,shown)
select question_id,revision,mode,sum(n)::bigint from (
  select question_id,revision,mode,correct+wrong+timeouts+abandoned+skipped as n
    from hq_private.question_metrics
  union all select question_id,revision,'normal',count(*) from hq_private.game_rounds
    where issued_at is not null and outcome is null group by question_id,revision
  union all select question_id,revision,'time_attack',count(*) from hq_private.time_attack_rounds
    where issued_at is not null and outcome is null group by question_id,revision
  union all select q.question_id,coalesce(s.question_revision,q.revision),'daily',count(*)
    from public.daily_session s join hq_private.daily_questions q using(d)
    where s.started_at >= (select tracking_since from hq_private.gameplay_settings where singleton)
      and (s.started_at at time zone 'America/Chicago')::date=s.d and s.started_at<=clock_timestamp()
      and not exists(select 1 from public.daily_result r where r.user_id=s.user_id and r.d=s.d)
    group by q.question_id,coalesce(s.question_revision,q.revision)
) history group by question_id,revision,mode;

create function hq_private.count_issued_question() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  if new.issued_at is null then return new; end if;
  if tg_op='UPDATE' then if old.issued_at is not null then return new; end if; end if;
  insert into hq_private.question_shown_counts(question_id,revision,mode,shown)
    values(new.question_id,new.revision,case when tg_table_name='game_rounds' then 'normal' else 'time_attack' end,1)
    on conflict(question_id,revision,mode) do update set shown=question_shown_counts.shown+1;
  return new;
end $$;
revoke all on function hq_private.count_issued_question() from public,anon,authenticated,service_role;
create trigger hq_count_issued_question after insert or update of issued_at on hq_private.game_rounds
  for each row when (new.issued_at is not null) execute function hq_private.count_issued_question();
create trigger hq_count_issued_question after insert or update of issued_at on hq_private.time_attack_rounds
  for each row when (new.issued_at is not null) execute function hq_private.count_issued_question();

create function hq_private.count_daily_question_start() returns trigger
language plpgsql set search_path=pg_catalog as $$
declare q hq_private.daily_questions;
begin
  if new.started_at is null or (new.started_at at time zone 'America/Chicago')::date<>new.d
    or new.started_at>clock_timestamp() then return new; end if;
  if tg_op='UPDATE' then
    if (old.started_at at time zone 'America/Chicago')::date=old.d and old.started_at<=new.started_at then return new; end if;
  end if;
  select * into q from hq_private.daily_questions where d=new.d;
  if not found then return new; end if;
  insert into hq_private.question_shown_counts(question_id,revision,mode,shown)
    values(q.question_id,coalesce(new.question_revision,q.revision),'daily',1)
    on conflict(question_id,revision,mode) do update set shown=question_shown_counts.shown+1;
  return new;
end $$;
revoke all on function hq_private.count_daily_question_start() from public,anon,authenticated,service_role;
create trigger hq_count_daily_question_start after insert or update of started_at on public.daily_session
  for each row execute function hq_private.count_daily_question_start();

create function public.admin_question_statistics(
  p_expected_owner uuid, p_search text default '', p_category_id integer default null,
  p_difficulty_id integer default null, p_mode text default 'all',
  p_versions text default 'all', p_sort text default 'shown_desc', p_page integer default 1
) returns jsonb language plpgsql stable security definer set search_path=pg_catalog
set statement_timeout='5s' as $$
declare pattern text; result jsonb;
begin
  if auth.uid() is null or auth.uid() is distinct from p_expected_owner then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  perform hq_private.require_owner(auth.uid());
  if length(coalesce(p_search,''))>200 or p_page is null or p_page<1 or p_page>100000
    or p_mode is null or p_mode not in('all','normal','daily','time_attack')
    or p_versions is null or p_versions not in('all','current')
    or p_sort is null or p_sort not in('shown_desc','shown_asc','correct_desc','accuracy_desc','accuracy_asc','id_desc','id_asc')
    or p_category_id<0 or p_difficulty_id<1 then raise exception 'Invalid statistics filters' using errcode='22023'; end if;
  pattern := '%' || replace(replace(replace(lower(btrim(coalesce(p_search,''))),chr(92),chr(92)||chr(92)),'%',chr(92)||'%'),'_',chr(92)||'_') || '%';
  with observations as (
    select question_id,revision,mode,shown,0::bigint as correct from hq_private.question_shown_counts
    union all select question_id,revision,mode,0,correct from hq_private.question_metrics
  ), counts as (
    select m.question_id,sum(m.shown)::bigint as shown,sum(m.correct)::bigint as correct
      from observations m join public.question q on q.id=m.question_id
      where (p_mode='all' or m.mode=p_mode) and (p_versions='all' or m.revision=q.admin_revision)
      group by m.question_id
  ), filtered as materialized (
    select q.id,q.image_url,q.correct_answer,q.category_id,q.difficulty_level_id,q.admin_revision,
      coalesce(c.shown,0) as shown,coalesce(c.correct,0) as correct,
      round(c.correct*100.0/nullif(c.shown,0),1) as accuracy
    from public.question q left join counts c on c.question_id=q.id
    where q.retired_at is null
      and (p_category_id is null or q.category_id=p_category_id or (p_category_id=0 and q.category_id is null))
      and (p_difficulty_id is null or q.difficulty_level_id=p_difficulty_id)
      and (btrim(coalesce(p_search,''))='' or lower(q.correct_answer) like pattern
        or lower(q.options_json::text) like pattern or lower(q.image_url) like pattern
        or q.id::text=replace(btrim(p_search),'#',''))
  ), totals as (
    select count(*)::integer as total,coalesce(sum(shown),0) as shown,coalesce(sum(correct),0) as correct from filtered
  ), paging as (
    select least(p_page,greatest(1,ceil(total/25.0)::integer)) as page from totals
  ), page_rows as (
    select f.* from filtered f order by
      case when p_sort='shown_desc' then shown end desc,
      case when p_sort='shown_asc' then shown end asc,
      case when p_sort='correct_desc' then correct end desc,
      case when p_sort='accuracy_desc' then accuracy end desc nulls last,
      case when p_sort='accuracy_asc' then accuracy end asc nulls last,
      case when p_sort='id_asc' then id end asc,id desc
      limit 25 offset ((select page from paging)-1)*25
  ) select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(to_jsonb(r)) from page_rows r),'[]'::jsonb),
    'total',t.total,'page',p.page,'page_size',25,
    'shown',t.shown,'correct',t.correct,'since',(select tracking_since from hq_private.gameplay_settings where singleton),
    'updated_at',clock_timestamp()
  ) into result from totals t cross join paging p;
  return result;
end $$;
revoke all on function public.admin_question_statistics(uuid,text,integer,integer,text,text,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.admin_question_statistics(uuid,text,integer,integer,text,text,text,integer) to authenticated;
notify pgrst,'reload schema';
