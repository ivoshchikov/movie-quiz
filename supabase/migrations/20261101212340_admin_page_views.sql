-- Independent page-view observations. No URLs, game sessions or GA4 backfill.
alter table hq_private.site_traffic_settings
  add column page_views_started_at timestamptz not null default clock_timestamp();

create table hq_private.site_page_views (
  view_id uuid primary key,
  visitor_id uuid not null,
  viewed_at timestamptz not null
);
create index site_page_views_time_idx on hq_private.site_page_views(viewed_at);
create index site_page_views_browser_idx on hq_private.site_page_views(visitor_id);
alter table hq_private.site_page_views enable row level security;
revoke all on hq_private.site_page_views from public, anon, authenticated, service_role;

create or replace function public.site_visit_heartbeat(p_visitor uuid) returns void
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
    delete from hq_private.site_page_views where visitor_id = p_visitor;
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

create function public.site_record_page_view(p_visitor uuid, p_view uuid) returns void
language plpgsql security definer set search_path = pg_catalog
set lock_timeout = '2s' set statement_timeout = '5s'
as $$
begin
  if p_view is null or p_view::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid page view identifier' using errcode = '22023';
  end if;
  -- Shares the visitor lock, validation, exclusion and presence semantics.
  perform public.site_visit_heartbeat(p_visitor);
  if auth.uid() = '112743d7-f683-4bbb-8117-068e89a00f22'::uuid
    or exists(select 1 from hq_private.site_visit_exclusions where visitor_id = p_visitor) then return; end if;
  insert into hq_private.site_page_views(view_id, visitor_id, viewed_at)
    values(p_view, p_visitor, clock_timestamp()) on conflict(view_id) do nothing;
  -- A retry must not update the original time or transfer a token between browsers.
  if exists(select 1 from hq_private.site_page_views where view_id = p_view and visitor_id <> p_visitor) then
    raise exception 'Invalid page view identifier' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public.site_record_page_view(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.site_record_page_view(uuid, uuid) to anon, authenticated;
comment on function public.site_record_page_view(uuid, uuid) is
  'Intentional anonymous page-view ingestion: opaque browser and idempotency UUIDs, server time only, no readback; verified Isildur visits are excluded.';

create function public.admin_page_view_stats(p_expected_owner uuid) returns jsonb
language plpgsql security definer set search_path = pg_catalog
set statement_timeout = '5s'
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_counts jsonb;
begin
  if auth.uid() is null or auth.uid() is distinct from p_expected_owner
    or public.is_admin() is distinct from true then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'hours24', count(*) filter(where viewed_at > v_now - interval '24 hours'),
    'days7', count(*) filter(where viewed_at > v_now - interval '168 hours'),
    'days30', count(*)
  ) into v_counts from hq_private.site_page_views
    where viewed_at > v_now - interval '720 hours' and viewed_at <= v_now;
  return v_counts || jsonb_build_object(
    'since', (select page_views_started_at from hq_private.site_traffic_settings where singleton),
    'updated_at', v_now
  );
end;
$$;
revoke all on function public.admin_page_view_stats(uuid) from public, anon, authenticated, service_role;
grant execute on function public.admin_page_view_stats(uuid) to authenticated;

create or replace function hq_private.prune_site_visits() returns void
language sql set search_path = pg_catalog as $$
  delete from hq_private.site_visit_days
    where d < (clock_timestamp() at time zone 'America/Chicago')::date - 34;
  delete from hq_private.site_visit_exclusions where excluded_at < clock_timestamp() - interval '35 days';
  delete from hq_private.site_page_views where viewed_at < clock_timestamp() - interval '840 hours';
$$;
revoke all on function hq_private.prune_site_visits() from public, anon, authenticated, service_role;
-- Existing hq-traffic-retention cron keeps its schedule and now prunes both streams.
notify pgrst, 'reload schema';
