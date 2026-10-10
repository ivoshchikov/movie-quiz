-- Read-only installation check; run after the migration in Supabase SQL Editor.
with checks as (
  select
    exists (select 1 from pg_attribute where attrelid = 'public.daily_challenge'::regclass and attname = 'admin_revision' and atttypid = 'bigint'::regtype and attnotnull and not attisdropped) as revision_column,
    to_regprocedure('public.get_daily_assignment_admin(date)') is not null and to_regprocedure('public.set_daily_question_admin(date,integer,integer,bigint,uuid,jsonb)') is not null as guarded_rpcs,
    (select count(*) = 3 from pg_trigger t where not t.tgisinternal and t.tgenabled in ('O','A') and (
      (t.tgrelid = 'public.daily_challenge'::regclass and t.tgname = 'hq_ui11_assignment_guard' and t.tgfoid = to_regprocedure('public.hq_guard_daily_assignment()')) or
      (t.tgrelid = 'public.daily_session'::regclass and t.tgname = 'hq_ui11_session_lock' and t.tgfoid = to_regprocedure('public.hq_lock_daily_attempt()')) or
      (t.tgrelid = 'public.daily_result'::regclass and t.tgname = 'hq_ui11_result_lock' and t.tgfoid = to_regprocedure('public.hq_lock_daily_attempt()'))
    )) as all_three_guards,
    not has_function_privilege('anon','public.set_daily_question(date,integer)','EXECUTE') and not has_function_privilege('authenticated','public.set_daily_question(date,integer)','EXECUTE') as legacy_writer_revoked,
    not has_table_privilege('anon','public.admin_users','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') and not has_table_privilege('authenticated','public.admin_users','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') as membership_writes_revoked,
    not has_table_privilege('anon','public.daily_challenge','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') and not has_table_privilege('authenticated','public.daily_challenge','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') as assignment_writes_revoked,
    coalesce(has_function_privilege('authenticated',to_regprocedure('public.get_daily_assignment_admin(date)'),'EXECUTE'),false) and coalesce(has_function_privilege('authenticated',to_regprocedure('public.set_daily_question_admin(date,integer,integer,bigint,uuid,jsonb)'),'EXECUTE'),false) and not coalesce(has_function_privilege('anon',to_regprocedure('public.get_daily_assignment_admin(date)'),'EXECUTE'),true) and not coalesce(has_function_privilege('anon',to_regprocedure('public.set_daily_question_admin(date,integer,integer,bigint,uuid,jsonb)'),'EXECUTE'),true) as guarded_rpc_privileges
)
select to_jsonb(checks) || jsonb_build_object('ready',revision_column and guarded_rpcs and all_three_guards and legacy_writer_revoked and membership_writes_revoked and assignment_writes_revoked and guarded_rpc_privileges,'daily_timezone','America/Chicago','transaction_isolation',current_setting('transaction_isolation')) as ui11_status from checks;
