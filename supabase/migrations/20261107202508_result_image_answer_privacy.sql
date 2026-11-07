-- Attribution titles and source URLs can identify a guessing-game answer.
-- Keep the existing signature so old clients also receive the denial.
set local lock_timeout = '3s';

create or replace function public.question_image_credits(
  p_mode text,
  p_session uuid default null,
  p_date date default null,
  p_person bigint default null,
  p_image_path text default null
)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog
as $$
declare result jsonb;
begin
  if p_mode is distinct from 'comparison' then
    raise exception 'Image credits are unavailable for guessing games' using errcode = '42501';
  end if;

  -- Preference portraits already display their names publicly. Restrict this
  -- lookup to an active person and that person's current or historical image.
  select jsonb_agg(jsonb_build_object(
    'image_url', p.image_url,
    'metadata', jsonb_build_object('image', m.content_metadata->'image')
  )) into result
  from hq_private.tt_people p
  join hq_private.question_media m on m.image_path = coalesce(p_image_path, p.image_url)
  where p.id = p_person and p.active
    and (
      m.image_path = p.image_url
      or exists (
        select 1 from hq_private.question_images i
        where i.image_path = m.image_path and i.question_id = p.source_question
      )
    );

  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.question_image_credits(text, uuid, date, bigint, text) from public;
grant execute on function public.question_image_credits(text, uuid, date, bigint, text) to anon, authenticated;
notify pgrst, 'reload schema';
