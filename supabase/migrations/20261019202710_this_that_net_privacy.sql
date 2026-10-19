-- Supabase's pg_net queue is readable by database LOGIN roles. Never enqueue
-- the durable refresh secret: authorize only a short-lived, single-use signature.
create table hq_private.tt_refresh_receipts(token_hash text primary key,expires_at timestamptz not null);
alter table hq_private.tt_refresh_receipts enable row level security;
revoke all on hq_private.tt_refresh_receipts from public,anon,authenticated;
update hq_private.tt_rating_state set refresh_secret=gen_random_uuid()::text||gen_random_uuid()::text;
create or replace function public.this_that_refresh_authorized(p_secret text)returns boolean language plpgsql volatile security definer set search_path=pg_catalog as $$
declare pieces text[];issued bigint;now_secs bigint;message text;expected text;inserted integer;
begin
 if p_secret is null or length(p_secret)>160 then return false;end if;
 pieces:=string_to_array(p_secret,'.');
 if cardinality(pieces)<>3 or pieces[1]!~'^[0-9]{10}$'or pieces[2]!~'^[0-9a-f-]{36}$'or pieces[3]!~'^[0-9a-f]{64}$'then return false;end if;
 begin issued:=pieces[1]::bigint;perform pieces[2]::uuid;exception when others then return false;end;
 now_secs:=floor(extract(epoch from clock_timestamp()))::bigint;
 if issued>now_secs+5 or issued<now_secs-60 then return false;end if;
 message:=pieces[1]||'.'||pieces[2]||'.this-that-ranking';
 select encode(extensions.hmac(message,refresh_secret,'sha256'),'hex')into expected from hq_private.tt_rating_state;
 if expected is null or pieces[3]<>expected then return false;end if;
 insert into hq_private.tt_refresh_receipts(token_hash,expires_at)values(md5(p_secret),clock_timestamp()+interval '2 minutes')on conflict do nothing;
 get diagnostics inserted=row_count;return inserted=1;
end$$;
revoke all on function public.this_that_refresh_authorized(text)from public,anon,authenticated;
grant execute on function public.this_that_refresh_authorized(text)to service_role;
create or replace function hq_private.tt_maintenance()returns void language plpgsql security definer set search_path=pg_catalog as $$
declare prefix text;token text;
begin
 delete from hq_private.tt_refresh_receipts where expires_at<clock_timestamp();
 delete from hq_private.tt_rounds where id in(select r.id from hq_private.tt_rounds r join hq_private.tt_profiles p on p.id=r.profile where r.cycle<p.cycle and r.series<p.series and r.settled_at<clock_timestamp()-interval '30 days'order by r.settled_at limit 1000 for update of r skip locked);
 delete from hq_private.tt_profiles where id in(select id from hq_private.tt_profiles where owner is null and created_at<clock_timestamp()-interval '1 day'order by created_at limit 100 for update skip locked);
 if extract(minute from clock_timestamp())::integer%5=0 then
  prefix:=floor(extract(epoch from clock_timestamp()))::bigint::text||'.'||gen_random_uuid()::text;
  select prefix||'.'||encode(extensions.hmac(prefix||'.this-that-ranking',refresh_secret,'sha256'),'hex')into token from hq_private.tt_rating_state;
  perform net.http_post(url:='https://vgjfbcihppxbtrjcxoci.supabase.co/functions/v1/this-that-ranking',headers:=jsonb_build_object('Content-Type','application/json','x-rank-refresh',token),body:='{}'::jsonb,timeout_milliseconds:=60000);
 end if;
end$$;
revoke all on function hq_private.tt_maintenance()from public,anon,authenticated;
grant execute on function hq_private.tt_maintenance()to service_role;
notify pgrst,'reload schema';
