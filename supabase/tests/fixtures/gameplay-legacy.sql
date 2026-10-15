CREATE OR REPLACE FUNCTION public.get_daily_archive_public(p_limit integer DEFAULT 30, p_offset integer DEFAULT 0)
 RETURNS TABLE(d date, image_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select dc.d, q.image_url
  from public.daily_challenge dc
  join hq_private.daily_questions q on q.d = dc.d
  order by dc.d desc
  limit greatest(1, least(365, coalesce(p_limit,30)))
  offset greatest(0, coalesce(p_offset,0));
$function$;



CREATE OR REPLACE FUNCTION public.get_leaderboard(p_category_id integer, p_difficulty_id integer, p_limit integer DEFAULT 5, p_hide_nicks text[] DEFAULT ARRAY['Isildur'::text])
 RETURNS TABLE(nickname text, best_score integer, best_time integer, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with hide as (
    select lower(n) as n from unnest(p_hide_nicks) as s(n)
  )
  -- реальные результаты
  select
    coalesce(p.nickname, 'Anonymous') as nickname,
    ub.best_score,
    ub.best_time,
    ub.updated_at
  from public.user_best ub
  left join public.profiles p on p.user_id = ub.user_id
  where ub.category_id = p_category_id
    and ub.difficulty_level_id = p_difficulty_id
    and (
      p.nickname is null
      or lower(p.nickname) not in (select n from hide)
    )

  union all

  -- сид-результаты
  select
    s.nickname,
    s.best_score,
    s.best_time,
    s.updated_at
  from public.leaderboard_seed s
  where s.category_id = p_category_id
    and s.difficulty_level_id = p_difficulty_id
    and lower(s.nickname) not in (select n from hide)

  order by 2 desc, 3 asc, 4 asc
  limit p_limit;
$function$;



CREATE OR REPLACE FUNCTION public.get_my_daily_result(p_user_id uuid, p_date date DEFAULT ((now() AT TIME ZONE 'America/Chicago'::text))::date)
 RETURNS TABLE(is_answered boolean, is_correct boolean, time_spent integer, answered_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- строгая проверка: можно запрашивать только свой статус
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'forbidden: uid mismatch';
  end if;

  -- если ответ есть — вернём его
  return query
  select true, dr.is_correct, dr.time_spent, dr.answered_at
  from public.daily_result dr
  where dr.user_id = p_user_id and dr.d = p_date
  limit 1;

  if found then
    return;
  end if;

  -- если ответа нет — вернём "is_answered=false"
  return query
  select false, null::boolean, null::int, null::timestamptz
  ;
end;
$function$;



CREATE OR REPLACE FUNCTION public.upsert_user_best(p_user_id uuid, p_category_id integer, p_difficulty_id integer, p_score integer, p_time integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF p_user_id IS NULL OR p_category_id IS NULL OR p_difficulty_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_best
       (user_id, category_id, difficulty_level_id, best_score, best_time)
  VALUES
       (p_user_id, p_category_id, p_difficulty_id, p_score, p_time)
  ON CONFLICT (user_id, category_id, difficulty_level_id) DO UPDATE
  SET best_score = EXCLUDED.best_score,
      best_time  = EXCLUDED.best_time,
      updated_at = now()
  WHERE EXCLUDED.best_score > user_best.best_score
     OR (EXCLUDED.best_score = user_best.best_score
         AND EXCLUDED.best_time < user_best.best_time);
END;
$function$;



CREATE OR REPLACE FUNCTION public.us_central_today()
 RETURNS date
 LANGUAGE sql
 STABLE
AS $function$ select (now() at time zone 'America/Chicago')::date $function$;;
