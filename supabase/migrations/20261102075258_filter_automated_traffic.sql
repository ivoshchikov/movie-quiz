-- Filter only telemetry writes. Public crawling, gameplay and aggregate contracts stay intact.
alter table hq_private.site_visit_exclusions
  add column reason text not null default 'owner' check(reason in ('owner', 'known_bot'));

-- Keep the UA expression synchronized with trafficBotPolicy.json; contract tests check parity.
-- PostgREST supplies lower-case HTTP header names. Raw headers are never persisted.
create function hq_private.site_traffic_request_is_bot() returns boolean
language sql stable set search_path = pg_catalog
as $$
  with request as (
    select coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'user-agent', '') as ua
  )
  select btrim(ua) = '' or ua ~* 'googlebot|google-inspectiontool|googleother|storebot-google|adsbot-google|mediapartners-google|apis-google|feedfetcher-google|bingbot|bingpreview|adidxbot|msnbot|duckduckbot|applebot|yandexbot|yandeximages|baiduspider|bytespider|petalbot|sogou[ /]|seznambot|qwantify|mojeekbot|ahrefsbot|ahrefssiteaudit|semrushbot|siteauditbot|mj12bot|dotbot|rogerbot|screaming frog|seokicks|blexbot|dataforseobot|ccbot|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|anthropic-ai|perplexitybot|perplexity-user|amazonbot|meta-externalagent|meta-externalfetcher|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp/|pinterestbot|headlesschrome|phantomjs|selenium|playwright|puppeteer|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|statuscake|scrapy|curl/|wget/|python-requests/|python-urllib/|aiohttp/|httpx/|go-http-client/' from request;
$$;
revoke all on function hq_private.site_traffic_request_is_bot() from public, anon, authenticated, service_role;

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
  -- Owner cleanup must still run under an automated browser or a missing UA.
  if auth.uid() is distinct from '112743d7-f683-4bbb-8117-068e89a00f22'::uuid
    and hq_private.site_traffic_request_is_bot() then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_visitor::text, 29167));
  if auth.uid() = '112743d7-f683-4bbb-8117-068e89a00f22'::uuid then
    insert into hq_private.site_visit_exclusions(visitor_id, excluded_at, reason) values(p_visitor, v_now, 'owner')
      on conflict(visitor_id) do update set excluded_at = excluded.excluded_at, reason = excluded.reason;
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
  'Anonymous telemetry ingestion with known-automation UA filtering; opaque UUID and server time only. Verified owner cleanup always applies. Remaining visits are not certified human.';

create or replace function public.site_record_page_view(p_visitor uuid, p_view uuid) returns void
language plpgsql security definer set search_path = pg_catalog
set lock_timeout = '2s' set statement_timeout = '5s'
as $$
begin
  if p_view is null or p_view::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid page view identifier' using errcode = '22023';
  end if;
  perform public.site_visit_heartbeat(p_visitor);
  -- The nested heartbeat returns void: explicitly guard page views as well.
  if auth.uid() = '112743d7-f683-4bbb-8117-068e89a00f22'::uuid
    or hq_private.site_traffic_request_is_bot()
    or exists(select 1 from hq_private.site_visit_exclusions where visitor_id = p_visitor) then return; end if;
  insert into hq_private.site_page_views(view_id, visitor_id, viewed_at)
    values(p_view, p_visitor, clock_timestamp()) on conflict(view_id) do nothing;
  if exists(select 1 from hq_private.site_page_views where view_id = p_view and visitor_id <> p_visitor) then
    raise exception 'Invalid page view identifier' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public.site_record_page_view(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.site_record_page_view(uuid,uuid) to anon, authenticated;
comment on function public.site_record_page_view(uuid,uuid) is
  'Idempotent anonymous page-view ingestion with known-automation UA filtering; opaque UUIDs and server time only, no readback. Remaining traffic is not certified human.';
