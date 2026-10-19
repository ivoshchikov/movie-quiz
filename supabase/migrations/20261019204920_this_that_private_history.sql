-- Private preferences keep stable identities when an actor is temporarily withdrawn.
-- Visibility and public eligibility remain separate from private history.
create or replace function public.this_that_import(p_operation uuid,p_choices jsonb,p_owner uuid) returns void language plpgsql security definer set search_path=pg_catalog as $$
 declare profile_id uuid;h text;prior text;v jsonb;a_id bigint;b_id bigint;w bigint;begin
 if p_owner is null or auth.uid()is distinct from p_owner or not hq_private.tt_live_user(auth.uid())then raise exception 'Log in to save favourites' using errcode='42501';end if;
 if p_operation is null or jsonb_typeof(p_choices) is distinct from 'array' or jsonb_array_length(p_choices)>500 then raise exception 'Invalid preference import';end if;
 perform pg_advisory_xact_lock(721113,hashtext(auth.uid()::text));h:=md5(p_choices::text);
 select payload_hash into prior from hq_private.tt_imports where owner=auth.uid()and operation=p_operation;
 if found then if prior<>h then raise exception 'Import already accepted with different content' using errcode='PT409';end if;return;end if;
 if(select count(*)from hq_private.tt_imports where owner=auth.uid()and created_at>clock_timestamp()-interval '1 minute')>=30 then raise exception 'Please retry the import later' using errcode='PT429';end if;
 select p.id into profile_id from hq_private.tt_profiles p where owner=auth.uid()and board='actors';
 if profile_id is null then profile_id:=gen_random_uuid();insert into hq_private.tt_profiles(id,owner,board)values(profile_id,auth.uid(),'actors');end if;
 for v in select value from jsonb_array_elements(p_choices)loop
  a_id:=(v->>'a')::bigint;b_id:=(v->>'b')::bigint;w:=(v->>'winner')::bigint;
  if a_id is null or b_id is null or w is null or a_id>=b_id or w not in(a_id,b_id)or(select count(*)from hq_private.tt_people where id in(a_id,b_id)and board='actors')<>2 then raise exception 'Invalid imported preference';end if;
  insert into hq_private.tt_preferences(profile,a,b,winner)values(profile_id,a_id,b_id,w)on conflict do nothing;
 end loop;
 insert into hq_private.tt_imports(owner,operation,payload_hash)values(auth.uid(),p_operation,h);end$$;
