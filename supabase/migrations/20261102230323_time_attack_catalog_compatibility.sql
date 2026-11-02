-- Old clients validate exactly categories 1/2. Preserve that response while new
-- clients use an explicit four-category catalog. Admission and game rules stay unchanged.
set local lock_timeout='3s';
create or replace function public.time_attack_catalog() returns jsonb
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

create function public.time_attack_category_catalog() returns jsonb
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

revoke all on function public.time_attack_category_catalog() from public,anon,authenticated,service_role;
grant execute on function public.time_attack_category_catalog() to anon,authenticated;
notify pgrst,'reload schema';
