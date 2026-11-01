-- First-party, browser-based visitor counts. Never exposes visitors to the Data API.
create table hq_private.site_traffic_settings (
  singleton boolean primary key default true check (singleton),
  started_at timestamptz not null default clock_timestamp()
);
insert into hq_private.site_traffic_settings(singleton) values (true);

create table hq_private.site_visit_days (
  d date not null,
  visitor_id uuid not null,
  last_seen timestamptz not null,
  primary key (d, visitor_id)
);
create index site_visit_online_idx on hq_private.site_visit_days(last_seen) include(visitor_id);
create index site_visit_browser_idx on hq_private.site_visit_days(visitor_id);

-- Once the owner signs in, earlier guest observations from that browser disappear too.
create table hq_private.site_visit_exclusions (
  visitor_id uuid primary key,
  excluded_at timestamptz not null default clock_timestamp()
);
alter table hq_private.site_traffic_settings enable row level security;
alter table hq_private.site_visit_days enable row level security;
alter table hq_private.site_visit_exclusions enable row level security;
revoke all on hq_private.site_traffic_settings, hq_private.site_visit_days,
  hq_private.site_visit_exclusions from public, anon, authenticated, service_role;

create function public.site_visit_heartbeat(p_visitor uuid) returns void
language plpgsql security definer set search_path = pg_catalog
set lock_timeout = '2s' set statement_timeout = '5s'
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_date date := (v_now at time zone 'America/Chicago')::date;
begin
  if p_visitor is null or p_visitor::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid visitor identifier' using errcode = '22023';
  end if;
  -- Serialize tabs and an owner sign-in against any earlier guest heartbeat.
  perform pg_advisory_xact_lock(hashtextextended(p_visitor::text, 29167));
  if auth.uid() = '112743d7-f683-4bbb-8117-068e89a00f22'::uuid then
    insert into hq_private.site_visit_exclusions(visitor_id, excluded_at) values(p_visitor, v_now)
      on conflict(visitor_id) do update set excluded_at = excluded.excluded_at;
    delete from hq_private.site_visit_days where visitor_id = p_visitor;
    return;
  end if;
  if exists(select 1 from hq_private.site_visit_exclusions where visitor_id = p_visitor) then return; end if;
  insert into hq_private.site_visit_days(d, visitor_id, last_seen) values(v_date, p_visitor, v_now)
    on conflict(d, visitor_id) do update set last_seen = excluded.last_seen
    where hq_private.site_visit_days.last_seen <= excluded.last_seen - interval '45 seconds';
end;
$$;
revoke all on function public.site_visit_heartbeat(uuid) from public, anon, authenticated, service_role;
grant execute on function public.site_visit_heartbeat(uuid) to anon, authenticated;
comment on function public.site_visit_heartbeat(uuid) is
  'Intentional anonymous telemetry ingestion: one opaque browser UUID, server time only, no readback; Isildur is excluded by verified auth.uid().';

create function public.admin_visitor_stats(p_expected_owner uuid) returns jsonb
language plpgsql security definer set search_path = pg_catalog
set statement_timeout = '5s'
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_date date := (v_now at time zone 'America/Chicago')::date;
  v_counts jsonb;
  v_online bigint;
begin
  if auth.uid() is null or auth.uid() is distinct from p_expected_owner
    or public.is_admin() is distinct from true then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'today', count(distinct visitor_id) filter(where d = v_date),
    'week', count(distinct visitor_id) filter(where d >= v_date - 6),
    'month', count(distinct visitor_id)
  ) into v_counts from hq_private.site_visit_days where d between v_date - 29 and v_date;
  select count(distinct visitor_id) into v_online from hq_private.site_visit_days
    where last_seen > v_now - interval '2 minutes' and last_seen <= v_now;
  return v_counts || jsonb_build_object(
    'online', v_online, 'date', v_date, 'timezone', 'America/Chicago',
    'since', (select started_at from hq_private.site_traffic_settings where singleton), 'updated_at', v_now
  );
end;
$$;
revoke all on function public.admin_visitor_stats(uuid) from public, anon, authenticated, service_role;
grant execute on function public.admin_visitor_stats(uuid) to authenticated;

create function hq_private.prune_site_visits() returns void
language sql set search_path = pg_catalog as $$
  delete from hq_private.site_visit_days
    where d < (clock_timestamp() at time zone 'America/Chicago')::date - 34;
  delete from hq_private.site_visit_exclusions where excluded_at < clock_timestamp() - interval '35 days';
$$;
revoke all on function hq_private.prune_site_visits() from public, anon, authenticated, service_role;
do $$ begin
  if exists(select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('hq-traffic-retention', '17 4 * * *', 'select hq_private.prune_site_visits();');
  end if;
end $$;
notify pgrst, 'reload schema';
