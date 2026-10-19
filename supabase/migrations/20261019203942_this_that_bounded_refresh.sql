-- Explicit scopes also support the production pg-safeupdate guard.
create or replace function hq_private.tt_invalidate() returns trigger language plpgsql security definer set search_path=pg_catalog as $$begin
 update hq_private.tt_rating_state set revision=revision+1 where singleton;return null;end$$;

create or replace function public.this_that_rating_claim()returns jsonb language plpgsql security definer set search_path=pg_catalog as $$declare s hq_private.tt_rating_state;token uuid;t timestamptz:=clock_timestamp();maximum bigint;begin
 select * into s from hq_private.tt_rating_state for update;
 if s.lease_until>t or(s.published_at>t-interval '5 minutes'and s.published_revision=s.revision)then return null;end if;
 token:=gen_random_uuid();select coalesce(max(id),0)into maximum from hq_private.tt_votes;
 update hq_private.tt_rating_state set lease=token,lease_until=t+interval '2 minutes',lease_revision=revision,lease_cutoff=maximum where singleton;
 return jsonb_build_object('lease',token,'people',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'board',board)order by id),'[]'::jsonb)from hq_private.tt_people where active));end$$;

create or replace function public.this_that_rating_commit(p_lease uuid,p_rows jsonb,p_model text)returns void language plpgsql security definer set search_path=pg_catalog as $$declare s hq_private.tt_rating_state;n integer;begin
 select * into s from hq_private.tt_rating_state for update;
 if s.lease is distinct from p_lease or s.lease_until<=clock_timestamp()or s.lease_revision<>s.revision then raise exception 'Refresh lease expired';end if;
 select count(*)into n from hq_private.tt_people where active;
 if jsonb_typeof(p_rows) is distinct from 'array'or jsonb_array_length(p_rows)<>n or p_model is null or length(p_model)not between 1 and 100 then raise exception 'Invalid snapshot';end if;
 if exists(select 1 from jsonb_to_recordset(p_rows)as x(id bigint,board text,rank integer,score double precision,users integer,opponents integer,provisional boolean)
  left join hq_private.tt_people p on p.id=x.id and p.active and p.board=x.board where p.id is null or x.users<0 or x.opponents<0 or x.users is null or x.opponents is null or x.provisional is null
  or x.score is null or x.score not between -1000 and 1000 or(x.rank is not null and(x.rank<1 or x.rank>n)))
  or(select count(distinct x->>'id')from jsonb_array_elements(p_rows)x)<>n then raise exception 'Invalid snapshot rows';end if;
 if exists(select 1 from jsonb_to_recordset(p_rows)as x(board text,rank integer)where rank is not null group by board having count(*)<>count(distinct rank)or min(rank)<>1 or max(rank)<>count(*)) then raise exception 'Invalid ranking places';end if;
 delete from hq_private.tt_rankings where person in(select id from hq_private.tt_people);
 insert into hq_private.tt_rankings(person,board,rank,score,users,opponents,provisional)
 select id,board,rank,score,users,opponents,provisional from jsonb_to_recordset(p_rows)as x(id bigint,board text,rank integer,score double precision,users integer,opponents integer,provisional boolean);
 update hq_private.tt_rating_state set published_at=clock_timestamp(),published_revision=revision,cutoff=lease_cutoff,model=p_model,lease=null,lease_until=null where singleton and lease=p_lease;end$$;
notify pgrst,'reload schema';
