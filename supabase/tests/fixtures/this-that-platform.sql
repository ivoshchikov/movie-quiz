-- Isolated stand-ins for Supabase Auth, pg_net and pg_cron. No network requests.
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz,is_anonymous boolean default false);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,not_after timestamptz);
insert into auth.users(id,email_confirmed_at)values('00000000-0000-0000-0000-000000000002',now()),('00000000-0000-0000-0000-000000000003',now()),('112743d7-f683-4bbb-8117-068e89a00f22',now());
create schema net;create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer)returns bigint language sql as $$select 1::bigint$$;
create schema cron;create function cron.schedule(text,text,text)returns bigint language sql as $$select 1::bigint$$;
