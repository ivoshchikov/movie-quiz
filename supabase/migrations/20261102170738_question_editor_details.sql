-- Existing editor: optional difficulty is one atomic, revision-checked change.
-- Replace the signature, not an overload: PostgREST must resolve old six-argument
-- clients as well as the new optional argument unambiguously.
set local lock_timeout='3s';
drop function public.admin_change_question(uuid,integer,integer,jsonb,integer,boolean);
create function public.admin_change_question(p_operation uuid,p_id integer,p_revision integer,p_options jsonb default null,p_correct_index integer default null,p_delete boolean default false,p_difficulty_id integer default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare q public.question; v_request jsonb; v_result jsonb; previous hq_private.question_changes;
begin
 perform hq_private.require_owner(auth.uid());
 if p_operation is null or p_id is null or p_id<1 or p_revision is null or p_revision<1 or p_delete is null then raise exception 'Invalid question settings';end if;
 v_request:=jsonb_build_object('id',p_id,'revision',p_revision,'options',p_options,'correct_index',p_correct_index,'delete',p_delete);
 -- Omitted difficulty preserves old operation receipts and old clients.
 if p_difficulty_id is not null then v_request:=v_request||jsonb_build_object('difficulty_id',p_difficulty_id);end if;
 perform pg_advisory_xact_lock(hashtextextended(p_operation::text,7));
 select * into previous from hq_private.question_changes where id=p_operation;
 if found then
  if previous.owner is distinct from auth.uid() or previous.request is distinct from v_request then raise exception 'Operation data changed';end if;
  return previous.result;
 end if;
 select * into q from public.question where id=p_id for update;
 if not found or q.retired_at is not null then raise exception 'Question unavailable';end if;
 if q.admin_revision<>p_revision then raise exception 'Question changed. Reload before editing.' using errcode='40001';end if;
 if not p_delete then
  if p_difficulty_id is not null and not exists(select 1 from public.difficulty_level where id=p_difficulty_id) then
   raise exception 'Invalid difficulty' using errcode='22023';
  end if;
  if p_correct_index is null or p_correct_index not between 0 and 3 or not hq_private.valid_question(p_options,p_options->>p_correct_index)
    or exists(select 1 from jsonb_array_elements_text(p_options) s where length(s)>200 or s<>btrim(s) or s~'[[:cntrl:]]') then raise exception 'Invalid answers';end if;
  update public.question set options_json=p_options,correct_answer=p_options->>p_correct_index,
    difficulty_level_id=coalesce(p_difficulty_id,q.difficulty_level_id) where id=p_id;
 else update public.question set retired_at=clock_timestamp() where id=p_id;
 end if;
 v_result:=jsonb_build_object('status','committed','question_id',p_id,'deleted',p_delete,'revision',p_revision+1);
 insert into hq_private.question_changes(id,owner,request,result,before_question) values(p_operation,auth.uid(),v_request,v_result,to_jsonb(q));
 return v_result;
end $$;
revoke all on function public.admin_change_question(uuid,integer,integer,jsonb,integer,boolean,integer) from public,anon,authenticated,service_role;
grant execute on function public.admin_change_question(uuid,integer,integer,jsonb,integer,boolean,integer) to authenticated;

-- The import already validates catalog difficulty and fingerprints it. Permit a
-- replacement image and difficulty together; category remains fixed.
create or replace function public.admin_edit_import_reserve(p_owner uuid,p_id uuid,p_fingerprint text,p_hash text,p_source_hash text,p_category integer,p_difficulty integer,p_options jsonb,p_correct_index integer,p_allow_duplicate boolean,p_question_id integer,p_revision integer) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare q public.question; j hq_private.question_imports; result jsonb;
begin
 perform hq_private.require_owner(p_owner);
 if p_question_id is null or p_revision is null then raise exception 'Invalid edit target';end if;
 -- Lock order is import then question, shared with finish/cleanup.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1313));
 select * into j from hq_private.question_imports where id=p_id for update;
 if found then
  if j.owner is distinct from p_owner or j.fingerprint<>p_fingerprint or j.edit_question_id is distinct from p_question_id or j.edit_revision is distinct from p_revision then raise exception 'Import data changed';end if;
  if j.status='committed' then return jsonb_build_object('status','committed','question_id',j.question_id,'image_path',j.image_path);end if;
 end if;
 select * into q from public.question where id=p_question_id for update;
 if not found or q.retired_at is not null then raise exception 'Question unavailable';end if;
 if q.admin_revision<>p_revision then raise exception 'Question changed. Reload before editing.' using errcode='40001';end if;
 if q.category_id is distinct from p_category then raise exception 'Invalid edit settings';end if;
 result:=public.admin_import_reserve(p_owner,p_id,p_fingerprint,p_hash,p_source_hash,p_category,p_difficulty,p_options,p_correct_index,p_allow_duplicate);
 if result->>'status'<>'duplicate' then update hq_private.question_imports set edit_question_id=p_question_id,edit_revision=p_revision where id=p_id;end if;
 return result;
end $$;

create or replace function public.admin_import_finish(p_owner uuid,p_id uuid,p_lease uuid,p_fingerprint text,p_hash text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare j hq_private.question_imports; v_id integer; q public.question;
begin
  perform hq_private.require_owner(p_owner);
  select * into j from hq_private.question_imports where id=p_id and owner=p_owner for update;
  if not found or j.fingerprint<>p_fingerprint or j.file_hash<>p_hash then raise exception 'Import unavailable'; end if;
  if j.status='committed' then return jsonb_build_object('status','committed','question_id',j.question_id,'image_path',j.image_path); end if;
  if j.lease_token is distinct from p_lease or j.lease_until<clock_timestamp() or j.status='expired' then raise exception 'Import lease expired'; end if;
  if not exists(select 1 from storage.objects where bucket_id='movies' and name=j.image_path
    and user_metadata->>'hq_import_id'=p_id::text and user_metadata->>'sha256'=p_hash) then raise exception 'Image upload unconfirmed'; end if;
  if j.edit_question_id is not null then
    select * into q from public.question where id=j.edit_question_id for update;
    if not found or q.retired_at is not null then raise exception 'Question unavailable';end if;
    if q.admin_revision<>j.edit_revision then raise exception 'Question changed. Reload before editing.' using errcode='40001';end if;
    update public.question set image_url=j.image_path,options_json=j.options_json,correct_answer=j.options_json->>j.correct_index,
      difficulty_level_id=j.difficulty_level_id where id=q.id returning id into v_id;
    insert into hq_private.question_changes(id,owner,request,result,before_question) values(j.id,p_owner,jsonb_build_object('image_import',j.id),jsonb_build_object('status','committed','question_id',v_id),to_jsonb(q));
  else
  insert into public.question(image_url,correct_answer,options_json,category_id,difficulty_level_id)
    values(j.image_path,j.options_json->>j.correct_index,j.options_json,j.category_id,j.difficulty_level_id) returning id into v_id;
  end if;
  insert into hq_private.question_images(image_path,file_hash,source_hash,question_id) values(j.image_path,j.file_hash,j.source_hash,v_id);
  update hq_private.question_imports set status='committed',question_id=v_id,updated_at=clock_timestamp(),lease_token=null,lease_until=null where id=p_id;
  return jsonb_build_object('status','committed','question_id',v_id,'image_path',j.image_path);
end $$;

-- Actual stored bytes, including legacy/manual uploads. Missing, malformed or
-- nonlocal metadata is unknown; never substitute original bundle/source size.
create or replace function public.admin_question_detail(p_id integer) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare v jsonb;
begin
 perform hq_private.require_owner(auth.uid());
 select to_jsonb(q)||jsonb_build_object(
   'needs_review',not hq_private.valid_question(q.options_json,q.correct_answer),
   'content_metadata',m.content_metadata,
   'image_bytes',case when o.metadata->>'size' ~ '^[0-9]{1,15}$'
     then (o.metadata->>'size')::bigint else null end)
 into v from public.question q
 left join hq_private.question_media m on m.image_path=q.image_url
 left join storage.objects o on o.bucket_id='movies' and o.name=q.image_url
 where q.id=p_id and q.retired_at is null;
 return v;
end $$;

-- Add compact activity without breaking older clients of the detailed endpoint.
-- Exactly the same raw all-version/all-guessing-mode counters as the statistics
-- page: correct / server-issued shows; overlapping cohorts and legacy attempts
-- are not a denominator. Admin reads do not create shows.
create or replace function public.admin_question_metrics(p_question_id integer) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare shown bigint; correct bigint;
begin
 perform hq_private.require_owner(auth.uid());
 if not exists(select 1 from public.question where id=p_question_id) then raise exception 'Question unavailable';end if;
 select coalesce(sum(s.shown),0) into shown from hq_private.question_shown_counts s
   where s.question_id=p_question_id and s.mode in('normal','daily','time_attack');
 select coalesce(sum(m.correct),0) into correct from hq_private.question_metrics m
   where m.question_id=p_question_id and m.mode in('normal','daily','time_attack');
 return jsonb_build_object(
   'activity',jsonb_build_object('shown',shown,'correct',correct,'accuracy',round(correct*100.0/nullif(shown,0),1)),
   'since',(select cohort_since from hq_private.gameplay_settings),
   'legacy',(select to_jsonb(q)-'question_id' from public.question_stats q where question_id=p_question_id),
   'cohorts',coalesce((select jsonb_agg(to_jsonb(m) order by revision,mode,cohort)
      from hq_private.question_cohort_metrics m where question_id=p_question_id),'[]'::jsonb));
end $$;
-- Explicit grants also apply in fresh isolated installations.
revoke all on function public.admin_question_detail(integer),public.admin_question_metrics(integer) from public,anon,authenticated,service_role;
grant execute on function public.admin_question_detail(integer),public.admin_question_metrics(integer) to authenticated;
notify pgrst,'reload schema';
