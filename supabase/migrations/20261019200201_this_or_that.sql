-- This or That: authoritative random comparisons. The rating calculator is deployed privately.
create extension if not exists pg_net with schema extensions;
create table hq_private.tt_people(
 id bigint generated always as identity primary key,board text not null check(board in('actors','actresses')),
 name text not null check(length(btrim(name)) between 1 and 150),name_key text generated always as(lower(btrim(name))) stored,
 image_url text not null check(length(btrim(image_url))>0),source_question integer unique references public.question(id) on delete set null,
 active boolean not null default true,revision bigint not null default 1,unique(board,name_key));
insert into hq_private.tt_people(board,name,image_url,source_question)
 select distinct on(category_id,lower(btrim(correct_answer))) case category_id when 2 then 'actors' else 'actresses' end,btrim(correct_answer),image_url,id
 from public.question where category_id in(2,3) and retired_at is null and nullif(btrim(correct_answer),'') is not null and nullif(btrim(image_url),'') is not null
 order by category_id,lower(btrim(correct_answer)),id;
create table hq_private.tt_profiles(
 id uuid primary key,owner uuid references auth.users(id) on delete cascade,board text not null check(board in('actors','actresses')),
 created_at timestamptz not null default clock_timestamp(),guest_source text,series integer not null default 1,cycle integer not null default 1,
 version bigint not null default 0,last_activity timestamptz not null default clock_timestamp(),unique(owner,board));
create index tt_guest_created on hq_private.tt_profiles(created_at) where owner is null;
create table hq_private.tt_rounds(
 id uuid primary key default gen_random_uuid(),profile uuid not null references hq_private.tt_profiles(id) on delete cascade,
 series integer not null,number integer not null check(number between 1 and 10),cycle integer not null,
 a bigint not null references hq_private.tt_people(id),b bigint not null references hq_private.tt_people(id),left_id bigint not null,
 cards jsonb not null,issued_at timestamptz not null default clock_timestamp(),eligible boolean not null,
 outcome text check(outcome in('left','right','equal','unknown_left','unknown_right','unknown_both','skip','withdrawn')),
 winner bigint,settled_at timestamptz,public_status text,check(a<b),check(left_id in(a,b)),check(winner is null or winner in(a,b)),
 unique(profile,series,number),unique(profile,cycle,a,b));
create unique index tt_one_pending on hq_private.tt_rounds(profile) where outcome is null;
create index tt_round_history on hq_private.tt_rounds(profile,settled_at);
create table hq_private.tt_votes(
 id bigint generated always as identity primary key,owner uuid not null references auth.users(id) on delete cascade,
 board text not null,a bigint not null references hq_private.tt_people(id),b bigint not null references hq_private.tt_people(id),
 winner bigint not null,round_id uuid not null unique,created_at timestamptz not null default clock_timestamp(),
 check(a<b and winner in(a,b)),unique(owner,a,b));
create index tt_pair_votes on hq_private.tt_votes(a,b,owner);
create table hq_private.tt_preferences(profile uuid not null references hq_private.tt_profiles(id) on delete cascade,
 a bigint not null references hq_private.tt_people(id),b bigint not null references hq_private.tt_people(id),winner bigint,
 updated_at timestamptz not null default clock_timestamp(),check(a<b and(winner is null or winner in(a,b))),primary key(profile,a,b));
create table hq_private.tt_voter_status(owner uuid primary key references auth.users(id) on delete cascade,held boolean not null default false,reason text,updated_at timestamptz not null default clock_timestamp());
create table hq_private.tt_imports(owner uuid not null references auth.users(id) on delete cascade,operation uuid not null,payload_hash text not null,created_at timestamptz not null default clock_timestamp(),primary key(owner,operation));
create table hq_private.tt_audit(id bigint generated always as identity primary key,admin uuid not null,target uuid,operation uuid not null unique,reason text not null,held boolean not null,created_at timestamptz not null default clock_timestamp());
create table hq_private.tt_rating_state(singleton boolean primary key default true check(singleton),revision bigint not null default 1,
 published_revision bigint,published_at timestamptz,cutoff bigint not null default 0,model text,lease uuid,lease_until timestamptz,lease_revision bigint,lease_cutoff bigint,
 refresh_secret text not null default gen_random_uuid()::text||gen_random_uuid()::text);
insert into hq_private.tt_rating_state(singleton) values(true);
create table hq_private.tt_rankings(person bigint primary key references hq_private.tt_people(id),board text not null,rank integer,
 score double precision not null,users integer not null,opponents integer not null,provisional boolean not null);
do $$declare r record;begin for r in select tablename from pg_tables where schemaname='hq_private' and tablename like 'tt\_%' escape '\' loop
 execute format('alter table hq_private.%I enable row level security',r.tablename);execute format('revoke all on hq_private.%I from public,anon,authenticated',r.tablename);end loop;end$$;
revoke all on all sequences in schema hq_private from public,anon,authenticated;

create function hq_private.tt_invalidate() returns trigger language plpgsql security definer set search_path=pg_catalog as $$begin
 update hq_private.tt_rating_state set revision=revision+1;return null;end$$;
create trigger tt_people_changed after insert or update or delete on hq_private.tt_people for each statement execute function hq_private.tt_invalidate();
create trigger tt_votes_removed after delete on hq_private.tt_votes for each statement execute function hq_private.tt_invalidate();
create trigger tt_trust_changed after insert or update or delete on hq_private.tt_voter_status for each statement execute function hq_private.tt_invalidate();
create trigger tt_auth_changed after update of email_confirmed_at,banned_until,deleted_at,is_anonymous on auth.users for each statement execute function hq_private.tt_invalidate();
create function hq_private.tt_source_changed() returns trigger language plpgsql security definer set search_path=pg_catalog as $$begin
 if TG_OP='INSERT' then
  if NEW.category_id in(2,3) and NEW.retired_at is null and nullif(btrim(NEW.correct_answer),'') is not null and nullif(btrim(NEW.image_url),'') is not null then
   insert into hq_private.tt_people(board,name,image_url,source_question) values(case NEW.category_id when 2 then 'actors' else 'actresses' end,btrim(NEW.correct_answer),NEW.image_url,NEW.id) on conflict do nothing;
  end if;
 elsif TG_OP='DELETE' or (OLD.image_url,OLD.correct_answer,OLD.retired_at,OLD.category_id) is distinct from (NEW.image_url,NEW.correct_answer,NEW.retired_at,NEW.category_id) then
  update hq_private.tt_people set active=false,revision=revision+1 where source_question=OLD.id and active;
 end if;if TG_OP='DELETE' then return OLD;end if;return NEW;end$$;
create trigger tt_source_insert after insert on public.question for each row execute function hq_private.tt_source_changed();
create trigger tt_source_update after update of image_url,correct_answer,retired_at,category_id on public.question for each row execute function hq_private.tt_source_changed();
create trigger tt_source_delete before delete on public.question for each row execute function hq_private.tt_source_changed();
create function hq_private.tt_live_user(p_uid uuid) returns boolean language sql stable set search_path=pg_catalog as $$
 select exists(select 1 from auth.users where id=p_uid and deleted_at is null and (banned_until is null or banned_until<=clock_timestamp()) and not coalesce(is_anonymous,false));$$;
create function hq_private.tt_verified() returns boolean language plpgsql stable set search_path=pg_catalog as $$declare sid uuid;claims jsonb;begin
 if not hq_private.tt_live_user(auth.uid()) then return false;end if;
 begin claims:=coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;sid:=(claims->>'session_id')::uuid;exception when others then return false;end;
 return exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id where u.id=auth.uid() and u.email_confirmed_at is not null and s.id=sid and(s.not_after is null or s.not_after>clock_timestamp()))
 and not exists(select 1 from hq_private.tt_voter_status where owner=auth.uid() and held);end$$;
create function hq_private.tt_lock(p_id uuid) returns hq_private.tt_profiles language plpgsql set search_path=pg_catalog as $$declare p hq_private.tt_profiles;begin
 if auth.uid() is not null then
  if not hq_private.tt_live_user(auth.uid()) then raise exception 'Sign in again to continue' using errcode='42501';end if;
  perform pg_advisory_xact_lock(721113,hashtext(auth.uid()::text));end if;
 select * into p from hq_private.tt_profiles where id=p_id for update;
 if not found or p.owner is distinct from auth.uid() then raise exception 'Comparison unavailable' using errcode='42501';end if;
 return p;end$$;
create function hq_private.tt_view(p_id uuid) returns jsonb language plpgsql set search_path=pg_catalog as $$
 declare p hq_private.tt_profiles;r hq_private.tt_rounds;community jsonb;na bigint;nb bigint;
 begin select * into strict p from hq_private.tt_profiles where id=p_id;
 select * into r from hq_private.tt_rounds where profile=p_id order by series desc,number desc limit 1;
 if r.outcome is not null then
  select count(*) filter(where v.winner=r.left_id),count(*) filter(where v.winner<>r.left_id) into na,nb from hq_private.tt_votes v
   join auth.users u on u.id=v.owner left join hq_private.tt_voter_status s on s.owner=v.owner
   where v.a=r.a and v.b=r.b and v.owner is distinct from p.owner and not coalesce(s.held,false) and u.deleted_at is null
    and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=clock_timestamp());
  if na+nb>=20 then community:=jsonb_build_object('left',na,'right',nb,'total',na+nb);end if;
 end if;
 return jsonb_build_object('id',p.id,'owner',p.owner,'board',p.board,'version',p.version,'series',p.series,'cycle',p.cycle,
  'summary',jsonb_build_object('choices',(select count(*)from hq_private.tt_rounds where profile=p_id and series=p.series and winner is not null),'settled',(select count(*)from hq_private.tt_rounds where profile=p_id and series=p.series and outcome is not null)),
  'server_now',clock_timestamp(),'complete',coalesce(r.number=10 and r.outcome is not null,false),'round',case when r.id is null then null else
   jsonb_build_object('id',r.id,'number',r.number,'cards',r.cards,'outcome',r.outcome,'winner',r.winner,'public_status',r.public_status,
   'settled_at',r.settled_at,'next_at',r.settled_at+interval '1.2 seconds','community',community)end);end$$;
create function hq_private.tt_issue(p_id uuid) returns void language plpgsql set search_path=pg_catalog as $$
 declare p hq_private.tt_profiles;r hq_private.tt_rounds;x bigint;y bigint;l bigint;n integer;cycle_no integer;cards jsonb;
 begin select * into strict p from hq_private.tt_profiles where id=p_id;
 if exists(select 1 from hq_private.tt_rounds where profile=p_id and outcome is null) then return;end if;
 select * into r from hq_private.tt_rounds where profile=p_id and series=p.series order by number desc limit 1;
 n:=coalesce(r.number,0)+1;if n>10 then return;end if;
 if p.owner is null then perform pg_advisory_xact_lock(721107,1);
  if hq_private.guest_round_count()>=(select guest_round_budget from hq_private.gameplay_settings) then raise exception 'Guest comparisons are temporarily busy. Please retry shortly.' using errcode='PT429';end if;end if;
 cycle_no:=p.cycle;
 select a.id,b.id into x,y from hq_private.tt_people a join hq_private.tt_people b on a.id<b.id and a.board=b.board
 where a.board=p.board and a.active and b.active and not exists(select 1 from hq_private.tt_rounds h where h.profile=p_id and h.cycle=cycle_no and h.a=a.id and h.b=b.id)
 order by random() limit 1;
 if x is null then
  if(select count(*) from hq_private.tt_people where active and board=p.board)<2 then raise exception 'Not enough actors are available right now';end if;
  cycle_no:=cycle_no+1;
  select a.id,b.id into x,y from hq_private.tt_people a join hq_private.tt_people b on a.id<b.id and a.board=b.board where a.board=p.board and a.active and b.active order by random() limit 1;
 end if;
 l:=case when random()<0.5 then x else y end;
 select jsonb_agg(jsonb_build_object('id',id,'name',name,'image_url',image_url,'revision',revision) order by(id=l)desc) into cards from hq_private.tt_people where id in(x,y);
 insert into hq_private.tt_rounds(profile,series,number,cycle,a,b,left_id,cards,eligible) values(p.id,p.series,n,cycle_no,x,y,l,cards,p.owner is not null and hq_private.tt_verified());
 update hq_private.tt_profiles set cycle=cycle_no,version=version+1,last_activity=clock_timestamp() where id=p.id;end$$;
create function public.this_that_catalog() returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('boards',coalesce(jsonb_agg(jsonb_build_object('key',board,'name',case board when 'actors' then 'Actors' else 'Actresses' end,'people',n,'pairs',n*(n-1)/2)order by board),'[]'::jsonb))
 from(select board,count(*)n from hq_private.tt_people where active group by board having count(*)>=2)s;$$;
create function public.this_that_open(p_id uuid,p_board text default 'actors') returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
 declare p hq_private.tt_profiles;src text;t timestamptz;begin
 if p_id is null or p_board not in('actors','actresses') then raise exception 'Invalid comparison request';end if;
 if auth.uid() is not null then
  if not hq_private.tt_live_user(auth.uid()) then raise exception 'Sign in again to continue' using errcode='42501';end if;
  perform pg_advisory_xact_lock(721113,hashtext(auth.uid()::text));
  select * into p from hq_private.tt_profiles where owner=auth.uid() and board=p_board;
  if found then p:=hq_private.tt_lock(p.id);if not exists(select 1 from hq_private.tt_rounds where profile=p.id)then perform hq_private.tt_issue(p.id);end if;return hq_private.tt_view(p.id);end if;
 end if;
 select * into p from hq_private.tt_profiles where id=p_id;
 if found then p:=hq_private.tt_lock(p.id);if p.board<>p_board then raise exception 'Comparison unavailable' using errcode='42501';end if;return hq_private.tt_view(p.id);end if;
 if(select count(*) from hq_private.tt_people where board=p_board and active)<2 then raise exception 'Not enough actors are available right now';end if;
 if auth.uid() is null then src:=hq_private.guard_guest_start(case p_board when 'actors' then 2 else 3 end,null);
 else t:=clock_timestamp();if(select count(*)from hq_private.game_admissions where owner=auth.uid() and started_at>t-interval '1 minute')>=12
 or(select count(*)from hq_private.game_admissions where owner=auth.uid() and started_at>t-interval '1 hour')>=240 then raise exception 'Too many new games. Please retry later.' using errcode='PT429';end if;end if;
 insert into hq_private.tt_profiles(id,owner,board,guest_source) values(p_id,auth.uid(),p_board,src);
 p:=hq_private.tt_lock(p_id);perform hq_private.tt_issue(p_id);return hq_private.tt_view(p_id);end$$;
create function public.this_that_status(p_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$begin perform hq_private.tt_lock(p_id);return hq_private.tt_view(p_id);end$$;
create function public.this_that_active(p_board text default 'actors') returns jsonb language plpgsql security definer set search_path=pg_catalog as $$declare id uuid;begin
 if auth.uid() is null or not hq_private.tt_live_user(auth.uid()) then raise exception 'Log in to view comparisons' using errcode='42501';end if;
 select p.id into id from hq_private.tt_profiles p where owner=auth.uid() and board=p_board;
 if id is null then return null;end if;perform hq_private.tt_lock(id);return hq_private.tt_view(id);end$$;
create function public.this_that_choose(p_id uuid,p_round uuid,p_choice text) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
 declare p hq_private.tt_profiles;r hq_private.tt_rounds;w bigint;s text;t timestamptz;v_id bigint;
 begin p:=hq_private.tt_lock(p_id);select * into r from hq_private.tt_rounds where id=p_round and profile=p_id for update;
 if not found then raise exception 'Comparison unavailable' using errcode='42501';end if;
 if p_choice is null or p_choice not in('left','right','equal','unknown_left','unknown_right','unknown_both','skip') then raise exception 'Invalid choice';end if;
 if r.outcome is not null then if r.outcome<>p_choice and r.outcome<>'withdrawn' then raise exception 'A different choice was already accepted' using errcode='PT409';end if;return hq_private.tt_view(p_id);end if;
 if p_choice is null or p_choice not in('left','right','equal','unknown_left','unknown_right','unknown_both','skip') then raise exception 'Invalid choice';end if;
 t:=clock_timestamp();
 if(select count(*) from hq_private.tt_rounds h where h.profile=p_id and h.settled_at>t-interval '1 minute')>=60
 or(select count(*)from hq_private.tt_rounds h where h.profile=p_id and h.settled_at>t-interval '1 hour')>=1000 then raise exception 'Please wait before making more choices' using errcode='PT429';end if;
 if(select count(*)from hq_private.tt_people where id in(r.a,r.b)and active)<>2 then p_choice:='withdrawn';end if;
 w:=case p_choice when 'left' then r.left_id when 'right' then case when r.left_id=r.a then r.b else r.a end else null end;
 s:=case when p.owner is null then 'guest' when not r.eligible or not hq_private.tt_verified() then 'personal' else 'recorded' end;
 if w is not null and s='recorded' then
  insert into hq_private.tt_votes(owner,board,a,b,winner,round_id,created_at) values(p.owner,p.board,r.a,r.b,w,r.id,t) on conflict(owner,a,b) do nothing returning id into v_id;
  if v_id is null then s:='personal_repeat';end if;
 end if;
 if w is not null or p_choice='equal' then insert into hq_private.tt_preferences(profile,a,b,winner,updated_at) values(p_id,r.a,r.b,w,t)
  on conflict(profile,a,b) do update set winner=excluded.winner,updated_at=excluded.updated_at;end if;
 update hq_private.tt_rounds set outcome=p_choice,winner=w,settled_at=t,public_status=case when w is null then 'neutral' else s end where id=r.id;
 update hq_private.tt_profiles set version=version+1,last_activity=t where id=p_id;return hq_private.tt_view(p_id);end$$;
create function public.this_that_next(p_id uuid,p_previous uuid,p_more boolean default false) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
 declare p hq_private.tt_profiles;r hq_private.tt_rounds;begin p:=hq_private.tt_lock(p_id);
 select * into r from hq_private.tt_rounds where profile=p_id order by series desc,number desc limit 1;
 if r.id is distinct from p_previous or r.outcome is null then return hq_private.tt_view(p_id);end if;
 if clock_timestamp()<r.settled_at+interval '1.2 seconds' then raise exception 'Feedback is still visible' using errcode='PT425';end if;
 if r.number=10 then if not p_more then return hq_private.tt_view(p_id);end if;update hq_private.tt_profiles set series=series+1 where id=p_id;
 elsif p_more then raise exception 'Finish this series first';end if;
 perform hq_private.tt_issue(p_id);return hq_private.tt_view(p_id);end$$;
create function public.this_that_top(p_id uuid default null) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
 declare profile_id uuid;result jsonb;begin profile_id:=p_id;
 if profile_id is null and auth.uid()is not null then select p.id into profile_id from hq_private.tt_profiles p where owner=auth.uid()and board='actors';end if;
 if profile_id is null then return '[]'::jsonb;end if;perform hq_private.tt_lock(profile_id);
 with outcomes as(select a id,(winner=a)::integer w from hq_private.tt_preferences where profile=profile_id and winner is not null
 union all select b,(winner=b)::integer from hq_private.tt_preferences where profile=profile_id and winner is not null),
 totals as(select id,count(*)n,sum(w)wins from outcomes group by id),ranked as(select t.id,dense_rank()over(order by(wins+1.0)/(n+2)desc)rank from totals t where wins>0)
 select coalesce(jsonb_agg(z order by rank,id),'[]'::jsonb)into result from(select p.id,p.name,p.image_url,r.rank,true provisional from ranked r join hq_private.tt_people p on p.id=r.id where p.active order by r.rank,p.id limit 10)z;
 return result;end$$;
create function public.this_that_import(p_operation uuid,p_choices jsonb,p_owner uuid) returns void language plpgsql security definer set search_path=pg_catalog as $$
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
  if a_id is null or b_id is null or w is null or a_id>=b_id or w not in(a_id,b_id)or(select count(*)from hq_private.tt_people where id in(a_id,b_id)and board='actors'and active)<>2 then raise exception 'Invalid imported preference';end if;
  insert into hq_private.tt_preferences(profile,a,b,winner)values(profile_id,a_id,b_id,w)on conflict do nothing;
 end loop;
 insert into hq_private.tt_imports(owner,operation,payload_hash)values(auth.uid(),p_operation,h);end$$;

create function public.admin_this_that_voter(p_owner uuid,p_held boolean,p_reason text,p_operation uuid)returns void language plpgsql security definer set search_path=pg_catalog as $$declare prior hq_private.tt_audit;begin
 if not public.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if p_owner is null or p_held is null or p_reason is null or length(btrim(p_reason))not between 10 and 500 or p_operation is null then raise exception 'A reason is required';end if;
 perform pg_advisory_xact_lock(721113,hashtext(p_owner::text));select * into prior from hq_private.tt_audit where operation=p_operation;
 if found then if prior.target is distinct from p_owner or prior.held is distinct from p_held or prior.reason<>p_reason then raise exception 'Operation already accepted with different content';end if;return;end if;
 insert into hq_private.tt_voter_status(owner,held,reason)values(p_owner,p_held,p_reason)on conflict(owner)do update set held=excluded.held,reason=excluded.reason,updated_at=clock_timestamp();
 insert into hq_private.tt_audit(admin,target,operation,reason,held)values(auth.uid(),p_owner,p_operation,p_reason,p_held);end$$;
create function public.admin_this_that_person(p_id bigint,p_name text,p_image text,p_active boolean,p_revision bigint)returns void language plpgsql security definer set search_path=pg_catalog as $$begin
 if not public.is_admin()then raise exception 'Administrator required' using errcode='42501';end if;
 update hq_private.tt_people set name=btrim(p_name),image_url=p_image,active=p_active,revision=revision+1 where id=p_id and revision=p_revision;
 if not found then raise exception 'This participant changed. Reload before saving' using errcode='PT409';end if;end$$;

-- Public pages read published places only. No formula, raw scores, identities or ballots are returned.
create function public.this_that_leaderboard(p_board text default 'actors',p_search text default '',p_limit integer default 20)returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 with state as(select * from hq_private.tt_rating_state),visible as(select p.id,p.name,p.image_url,
  case when s.published_revision=s.revision then r.rank end rank,coalesce(r.provisional,true)provisional
  from hq_private.tt_people p cross join state s left join hq_private.tt_rankings r on r.person=p.id where p.active and p.board=p_board),
 rows as(select * from visible where(case when nullif(btrim(p_search),'')is null then rank is not null else name ilike '%'||left(btrim(p_search),80)||'%' end)
 order by rank nulls last,id limit greatest(1,least(coalesce(p_limit,20),100)))
 select jsonb_build_object('updated_at',(select published_at from state),'total',(select count(*)from visible where rank is not null),'candidates',(select count(*)from visible),'rows',coalesce((select jsonb_agg(rows order by rank nulls last,id)from rows),'[]'::jsonb));$$;
create function public.this_that_refresh_authorized(p_secret text)returns boolean language sql stable security definer set search_path=pg_catalog as $$select p_secret is not null and p_secret=refresh_secret from hq_private.tt_rating_state;$$;
create function public.this_that_rating_claim()returns jsonb language plpgsql security definer set search_path=pg_catalog as $$declare s hq_private.tt_rating_state;token uuid;t timestamptz:=clock_timestamp();maximum bigint;begin
 select * into s from hq_private.tt_rating_state for update;
 if s.lease_until>t or(s.published_at>t-interval '5 minutes'and s.published_revision=s.revision)then return null;end if;
 token:=gen_random_uuid();select coalesce(max(id),0)into maximum from hq_private.tt_votes;
 update hq_private.tt_rating_state set lease=token,lease_until=t+interval '2 minutes',lease_revision=revision,lease_cutoff=maximum;
 return jsonb_build_object('lease',token,'people',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'board',board)order by id),'[]'::jsonb)from hq_private.tt_people where active));end$$;
create function public.this_that_rating_page(p_lease uuid,p_after bigint default 0)returns jsonb language plpgsql security definer set search_path=pg_catalog as $$declare s hq_private.tt_rating_state;begin
 select * into s from hq_private.tt_rating_state;
 if s.lease is distinct from p_lease or s.lease_until<=clock_timestamp()or s.lease_revision<>s.revision then raise exception 'Refresh lease expired';end if;
 return(select coalesce(jsonb_agg(z order by id),'[]'::jsonb)from(select v.id,v.owner,v.a,v.b,v.winner from hq_private.tt_votes v
  join auth.users u on u.id=v.owner join hq_private.tt_people a on a.id=v.a and a.active join hq_private.tt_people b on b.id=v.b and b.active
  left join hq_private.tt_voter_status t on t.owner=v.owner
  where v.id>greatest(0,p_after)and v.id<=s.lease_cutoff and not coalesce(t.held,false)and u.deleted_at is null and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
  and(u.banned_until is null or u.banned_until<=clock_timestamp())order by v.id limit 5000)z);end$$;
create function public.this_that_rating_commit(p_lease uuid,p_rows jsonb,p_model text)returns void language plpgsql security definer set search_path=pg_catalog as $$declare s hq_private.tt_rating_state;n integer;begin
 select * into s from hq_private.tt_rating_state for update;
 if s.lease is distinct from p_lease or s.lease_until<=clock_timestamp()or s.lease_revision<>s.revision then raise exception 'Refresh lease expired';end if;
 select count(*)into n from hq_private.tt_people where active;
 if jsonb_typeof(p_rows) is distinct from 'array'or jsonb_array_length(p_rows)<>n or p_model is null or length(p_model)not between 1 and 100 then raise exception 'Invalid snapshot';end if;
 if exists(select 1 from jsonb_to_recordset(p_rows)as x(id bigint,board text,rank integer,score double precision,users integer,opponents integer,provisional boolean)
  left join hq_private.tt_people p on p.id=x.id and p.active and p.board=x.board where p.id is null or x.users<0 or x.opponents<0 or x.users is null or x.opponents is null or x.provisional is null
  or x.score is null or x.score not between -1000 and 1000 or(x.rank is not null and(x.rank<1 or x.rank>n)))
  or(select count(distinct x->>'id')from jsonb_array_elements(p_rows)x)<>n then raise exception 'Invalid snapshot rows';end if;
 if exists(select 1 from jsonb_to_recordset(p_rows)as x(board text,rank integer)where rank is not null group by board having count(*)<>count(distinct rank)or min(rank)<>1 or max(rank)<>count(*)) then raise exception 'Invalid ranking places';end if;
 delete from hq_private.tt_rankings;
 insert into hq_private.tt_rankings(person,board,rank,score,users,opponents,provisional)
 select id,board,rank,score,users,opponents,provisional from jsonb_to_recordset(p_rows)as x(id bigint,board text,rank integer,score double precision,users integer,opponents integer,provisional boolean);
 update hq_private.tt_rating_state set published_at=clock_timestamp(),published_revision=revision,cutoff=lease_cutoff,model=p_model,lease=null,lease_until=null;end$$;
create function public.this_that_rating_release(p_lease uuid)returns void language sql security definer set search_path=pg_catalog as $$update hq_private.tt_rating_state set lease=null,lease_until=clock_timestamp()+interval '30 seconds'where lease=p_lease;$$;

create or replace view hq_private.game_admissions with(security_invoker=true)as
 select owner,started_at,guest_source from hq_private.game_sessions union all select owner,started_at,guest_source from hq_private.time_attack_sessions
 union all select owner,created_at,guest_source from hq_private.tt_profiles;
revoke all on hq_private.game_admissions from public,anon,authenticated;
create or replace function hq_private.guest_round_count()returns bigint language sql set search_path=pg_catalog as $$
 select(select count(*)from hq_private.game_rounds r join hq_private.game_sessions s on s.id=r.session_id where s.owner is null)
 +(select count(*)from hq_private.time_attack_rounds r join hq_private.time_attack_sessions s on s.id=r.session_id where s.owner is null)
 +(select count(*)from hq_private.tt_rounds r join hq_private.tt_profiles p on p.id=r.profile where p.owner is null);$$;
create function hq_private.tt_maintenance()returns void language plpgsql security definer set search_path=pg_catalog as $$begin
 delete from hq_private.tt_rounds where id in(select r.id from hq_private.tt_rounds r join hq_private.tt_profiles p on p.id=r.profile where r.cycle<p.cycle and r.series<p.series and r.settled_at<clock_timestamp()-interval '30 days'order by r.settled_at limit 1000 for update of r skip locked);
 delete from hq_private.tt_profiles where id in(select id from hq_private.tt_profiles where owner is null and created_at<clock_timestamp()-interval '1 day'order by created_at limit 100 for update skip locked);
 if extract(minute from clock_timestamp())::integer%5=0 then
  perform net.http_post(url:='https://vgjfbcihppxbtrjcxoci.supabase.co/functions/v1/this-that-ranking',headers:=jsonb_build_object('Content-Type','application/json','x-rank-refresh',(select refresh_secret from hq_private.tt_rating_state)),body:='{}'::jsonb,timeout_milliseconds:=60000);
 end if;end$$;
select cron.schedule('hq-this-that-maintenance','* * * * *','select hq_private.tt_maintenance();');

do $$declare r record;begin
 for r in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where(n.nspname='hq_private'and p.proname like 'tt\_%'escape '\')or(n.nspname='public'and(p.proname like 'this_that_%'or p.proname like 'admin_this_that_%'))loop
 execute format('revoke all on function %s from public,anon,authenticated',r.sig);end loop;end$$;
grant execute on function public.this_that_catalog(),public.this_that_open(uuid,text),public.this_that_status(uuid),public.this_that_choose(uuid,uuid,text),public.this_that_next(uuid,uuid,boolean),public.this_that_top(uuid),public.this_that_leaderboard(text,text,integer)to anon,authenticated;
grant execute on function public.this_that_active(text),public.this_that_import(uuid,jsonb,uuid),public.admin_this_that_voter(uuid,boolean,text,uuid),public.admin_this_that_person(bigint,text,text,boolean,bigint)to authenticated;
grant execute on function public.this_that_refresh_authorized(text),public.this_that_rating_claim(),public.this_that_rating_page(uuid,bigint),public.this_that_rating_commit(uuid,jsonb,text),public.this_that_rating_release(uuid)to service_role;
grant execute on function hq_private.tt_maintenance()to service_role;
notify pgrst,'reload schema';
