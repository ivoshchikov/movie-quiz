-- UI-13 privacy cutover. Apply only after the compatible frontend is published.
-- Public gameplay receives choices and a correctness boolean; answer labels remain private.
DO $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='question' loop
    execute format('drop policy %I on public.question',p.policyname);
  end loop;
end $$;
alter table public.question enable row level security;
create policy question_owner_read on public.question for select to authenticated using ((select public.is_admin()));
revoke all on public.question from public,anon,authenticated;
grant select on public.question to authenticated;
revoke all on sequence public.question_id_seq from public,anon,authenticated;
revoke all on function public.get_question(integer,integer),public.get_question(integer[],integer,integer),
  public.get_daily_question(date),public.get_daily_history(integer,integer),
  public.submit_daily_result(uuid,date,boolean,integer),public.touch_question_stats(integer,boolean) from public,anon,authenticated;
-- These RPCs remain usable internally by their security-definer gameplay callers.
grant execute on function public.get_daily_question(date) to service_role;
revoke insert,update,delete,truncate,references,trigger on public.daily_result,public.daily_session from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_daily_question(p_date date DEFAULT ((now() AT TIME ZONE 'America/Chicago'::text))::date)
 RETURNS TABLE(id integer, image_url text, options_json jsonb, correct_answer text, category_id integer, difficulty_level_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- уже закреплён?
  return query
  select q.id, q.image_url, q.options_json, NULL::text, q.category_id, q.difficulty_level_id
  from public.daily_challenge dc
  join public.question q on q.id = dc.question_id
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
    where r.question_id is null
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
  select q.id, q.image_url, q.options_json, NULL::text, q.category_id, q.difficulty_level_id
  from public.daily_challenge dc
  join public.question q on q.id = dc.question_id
  where dc.d = p_date
  limit 1;
end;
$function$
