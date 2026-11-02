-- Prepared content stays local until explicit approval. Extend the existing
-- service-only reservation/claim/finish protocol; do not rewrite game RPCs.
alter table hq_private.question_imports add column package_id text,
  add column temp_id text, add column content_metadata jsonb,
  add constraint question_import_bundle_pair check (
    (package_id is null and temp_id is null) or
    (package_id is not null and temp_id is not null and package_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$' and temp_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$'));
create unique index question_import_bundle_identity on hq_private.question_imports(owner,package_id,temp_id) where package_id is not null;

-- Credits belong to immutable image paths, including old session snapshots.
-- They are not exposed as a public name-to-image answer lookup.
create table hq_private.question_media (
  image_path text primary key,
  content_metadata jsonb not null check (jsonb_typeof(content_metadata)='object' and octet_length(content_metadata::text)<=64000),
  import_id uuid not null references hq_private.question_imports(id),
  created_at timestamptz not null default clock_timestamp()
);
alter table hq_private.question_media enable row level security;
revoke all on hq_private.question_media from public,anon,authenticated,service_role;

create function public.admin_content_import_reserve(p_owner uuid,p_id uuid,p_fingerprint text,p_hash text,
 p_source_hash text,p_category integer,p_difficulty integer,p_options jsonb,p_correct_index integer,p_allow_duplicate boolean,
 p_package_id text,p_temp_id text,p_content_metadata jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb; previous hq_private.question_imports;
begin
 perform hq_private.require_owner(p_owner);
 if (p_package_id is null)<>(p_temp_id is null) or (p_package_id is not null and
    (p_package_id!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$' or p_temp_id!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$')) then raise exception 'Invalid bundle identity';end if;
 if p_content_metadata is not null and (
    jsonb_typeof(p_content_metadata) is distinct from 'object' or octet_length(p_content_metadata::text)>64000 or
    jsonb_typeof(p_content_metadata->'image') is distinct from 'object' or
    p_content_metadata#>>'{image,sha256}' is distinct from p_hash or
    nullif(btrim(p_content_metadata#>>'{image,photographer}'),'') is null or
    nullif(btrim(p_content_metadata#>>'{image,license}'),'') is null or
    nullif(btrim(p_content_metadata#>>'{image,attribution_text}'),'') is null or
    coalesce(p_content_metadata#>>'{image,source_page_url}','')!~'^https?://' or
    coalesce(p_content_metadata#>>'{image,license_url}','')!~'^https?://' or
    nullif(btrim(p_content_metadata#>>'{image,processing,changes}'),'') is null
 ) then raise exception 'Invalid image attribution';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1313));
 select * into previous from hq_private.question_imports where id=p_id for update;
 if found and (previous.package_id is distinct from p_package_id or previous.temp_id is distinct from p_temp_id
    or previous.content_metadata is distinct from p_content_metadata) then raise exception 'Import data changed';end if;
 if p_package_id is not null and exists(select 1 from hq_private.question_imports where owner=p_owner and package_id=p_package_id and temp_id=p_temp_id and id<>p_id) then raise exception 'Bundle item already linked to another operation';end if;
 result:=public.admin_import_reserve(p_owner,p_id,p_fingerprint,p_hash,p_source_hash,p_category,p_difficulty,p_options,p_correct_index,p_allow_duplicate);
 if result->>'status'<>'duplicate' then
   update hq_private.question_imports set package_id=p_package_id,temp_id=p_temp_id,content_metadata=p_content_metadata where id=p_id;
 end if;
 return result;
end $$;
revoke all on function public.admin_content_import_reserve(uuid,uuid,text,text,text,integer,integer,jsonb,integer,boolean,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_content_import_reserve(uuid,uuid,text,text,text,integer,integer,jsonb,integer,boolean,text,text,jsonb) to service_role;

create function hq_private.capture_question_media() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if tg_op='UPDATE' and new.image_url is not distinct from old.image_url then return new;end if;
 insert into hq_private.question_media(image_path,content_metadata,import_id)
   select j.image_path,j.content_metadata,j.id from hq_private.question_imports j
   where j.image_path=new.image_url and j.content_metadata is not null and j.status in('reserved','uploaded')
   on conflict(image_path) do nothing;
 return new;
end $$;
revoke all on function hq_private.capture_question_media() from public,anon,authenticated,service_role;
create trigger capture_question_media after insert or update of image_url on public.question
for each row execute function hq_private.capture_question_media();

create or replace function public.admin_question_detail(p_id integer) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare v jsonb;
begin
 perform hq_private.require_owner(auth.uid());
 select to_jsonb(q)||jsonb_build_object('needs_review',not hq_private.valid_question(q.options_json,q.correct_answer), 'content_metadata',m.content_metadata)
 into v from public.question q left join hq_private.question_media m on m.image_path=q.image_url where q.id=p_id and q.retired_at is null;
 return v;
end $$;

create function public.admin_bundle_status(p_package_id text,p_temp_ids text[]) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 perform hq_private.require_owner(auth.uid());
 if p_package_id is null or p_package_id!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$' or p_temp_ids is null or cardinality(p_temp_ids)>50 or
    exists(select 1 from unnest(p_temp_ids) s where s is null or s!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$') then raise exception 'Invalid bundle request';end if;
 return coalesce((select jsonb_object_agg(temp_id,jsonb_build_object('status',status,'question_id',question_id,'image_path',image_path,'fingerprint',fingerprint))
   from hq_private.question_imports where owner=auth.uid() and package_id=p_package_id and temp_id=any(p_temp_ids)),'{}'::jsonb);
end $$;

create function hq_private.content_identity_key(value text) returns text language sql immutable set search_path=pg_catalog as $$
 select regexp_replace(normalize(lower(value),NFKD),'[^[:alnum:]]','','g')
$$;
revoke all on function hq_private.content_identity_key(text) from public,anon,authenticated,service_role;
create function public.admin_bundle_warnings(p_records jsonb) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare record jsonb; result jsonb:='{}'; warnings jsonb; matches integer[];
begin
 perform hq_private.require_owner(auth.uid());
 if jsonb_typeof(p_records) is distinct from 'array' or jsonb_array_length(p_records)>50 or octet_length(p_records::text)>128000 then raise exception 'Invalid bundle review';end if;
 for record in select value from jsonb_array_elements(p_records) loop
  if jsonb_typeof(record->'names') is distinct from 'array' or jsonb_array_length(record->'names')>101 or coalesce(record->>'category_id','')!~'^[1-4]$' then raise exception 'Invalid identity review';end if;
  warnings:='[]';
  select array_agg(id) into matches from (select q.id from public.question q
    left join hq_private.question_media m on m.image_path=q.image_url
    where q.retired_at is null and q.category_id=(record->>'category_id')::integer and
    ((nullif(record->>'wikidata_id','') is not null and m.content_metadata#>>'{identity,wikidata_id}'=record->>'wikidata_id') or
      exists(select 1 from jsonb_array_elements_text(record->'names') s where hq_private.content_identity_key(s)=hq_private.content_identity_key(q.correct_answer))) limit 10) x;
  if matches is not null then warnings:=warnings||jsonb_build_array('Possible person/work already in bank: #'||array_to_string(matches,', #')||'. Review; different frames may be intentional.');end if;
  select array_agg(question_id) into matches from (select i.question_id from hq_private.question_images i join public.question q on q.id=i.question_id where q.retired_at is null and i.file_hash=record->>'sha256' limit 10) x;
  if matches is not null then warnings:=warnings||jsonb_build_array('Identical image already in bank: #'||array_to_string(matches,', #')||'. Adding it again requires an explicit duplicate-image confirmation.');end if;
  result:=result||jsonb_build_object(record->>'temp_id',warnings);
 end loop;
 return result;
end $$;
revoke all on function public.admin_bundle_status(text,text[]),public.admin_bundle_warnings(jsonb) from public,anon,authenticated;
grant execute on function public.admin_bundle_status(text,text[]),public.admin_bundle_warnings(jsonb) to authenticated;

-- Source titles/URLs can contain the answer. Release full credits only for issued
-- images from an owned FINISHED run or an answered Daily. This is read-only and
-- never finishes, starts or answers a game. Guest UUIDs use existing capability rules.
create function public.question_image_credits(p_mode text,p_session uuid default null,p_date date default null,p_person bigint default null,p_image_path text default null)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
 if p_mode='normal' then
  if not exists(select 1 from hq_private.game_sessions where id=p_session and owner is not distinct from auth.uid() and finished_at is not null) then raise exception 'Credits unavailable until this quiz is finished' using errcode='42501';end if;
  select jsonb_agg(jsonb_build_object('image_url',r.image_url,'metadata',jsonb_build_object('image',m.content_metadata->'image')) order by r.number) into result
    from hq_private.game_rounds r join hq_private.question_media m on m.image_path=r.image_url where r.session_id=p_session and r.issued_at is not null;
 elsif p_mode='time-attack' then
  if not exists(select 1 from hq_private.time_attack_sessions where id=p_session and owner is not distinct from auth.uid() and finished_at is not null) then raise exception 'Credits unavailable until this run is finished' using errcode='42501';end if;
  select jsonb_agg(jsonb_build_object('image_url',r.image_url,'metadata',jsonb_build_object('image',m.content_metadata->'image')) order by r.number) into result
    from hq_private.time_attack_rounds r join hq_private.question_media m on m.image_path=r.image_url where r.session_id=p_session and r.issued_at is not null;
 elsif p_mode='daily' then
  if auth.uid() is null or not exists(select 1 from public.daily_result where user_id=auth.uid() and d=p_date) then raise exception 'Credits unavailable until your Daily answer is saved' using errcode='42501';end if;
  select jsonb_agg(jsonb_build_object('image_url',q.image_url,'metadata',jsonb_build_object('image',m.content_metadata->'image'))) into result
    from hq_private.daily_questions q join hq_private.question_media m on m.image_path=q.image_url where q.d=p_date;
 elsif p_mode='comparison' then
  -- These portraits and names are already public in the preference mode.
  select jsonb_agg(jsonb_build_object('image_url',p.image_url,'metadata',jsonb_build_object('image',m.content_metadata->'image'))) into result
    from hq_private.tt_people p join hq_private.question_media m on m.image_path=coalesce(p_image_path,p.image_url)
    where p.id=p_person and p.active and (m.image_path=p.image_url or exists(select 1 from hq_private.question_images i where i.image_path=m.image_path and i.question_id=p.source_question));
 else raise exception 'Invalid credits request';end if;
 return coalesce(result,'[]'::jsonb);
end $$;
revoke all on function public.question_image_credits(text,uuid,date,bigint,text) from public,anon,authenticated;
grant execute on function public.question_image_credits(text,uuid,date,bigint,text) to anon,authenticated;
