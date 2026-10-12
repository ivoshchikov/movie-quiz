-- A pending Chicago day keeps yesterday's streak. A wrong answer or missed
-- calendar day breaks it. Preserve the existing RPC signature and privileges.
create or replace function public.get_daily_user_streak(p_user_id uuid)
returns table (
  user_id uuid,
  current_streak integer,
  longest_streak integer,
  total_correct integer,
  last_played date,
  last_correct date
)
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  with
  t as (
    select d
    from public.daily_result
    where user_id = p_user_id and is_correct = true
  ),
  runs as (
    select d, (d - (row_number() over (order by d))::integer * interval '1 day')::date as grp
    from t
  ),
  agg as (
    select min(d) as start_d, max(d) as end_d, count(*) as len
    from runs
    group by grp
  ),
  today as (select public.us_central_today() as d0),
  longest as (
    select coalesce(max(len), 0)::integer as longest_streak from agg
  ),
  current as (
    select coalesce(max(len), 0)::integer as current_streak
    from agg cross join today
    where end_d = today.d0
       or (end_d = today.d0 - 1 and not exists (
         select 1 from public.daily_result
         where user_id = p_user_id and d = today.d0
       ))
  ),
  totals as (
    select count(*) filter (where is_correct)::integer as total_correct,
           max(d) as last_played,
           max(d) filter (where is_correct) as last_correct
    from public.daily_result
    where user_id = p_user_id
  )
  select p_user_id,
         (select current_streak from current),
         (select longest_streak from longest),
         (select total_correct from totals),
         (select last_played from totals),
         (select last_correct from totals);
$function$;
