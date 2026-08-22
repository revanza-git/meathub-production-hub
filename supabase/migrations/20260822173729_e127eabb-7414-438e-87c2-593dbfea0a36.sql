create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

insert into public.admin_settings (key, value)
values ('ops_cron_endpoint', '"https://project--19bca304-e80b-423f-bf8e-51232c3bb4a2.lovable.app/api/public/ops-cron"'::jsonb)
on conflict (key) do nothing;

create or replace function public.ml_ops_cron_call(p_jobs text[])
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_secret text;
begin
  select value #>> '{}' into v_url from public.admin_settings where key = 'ops_cron_endpoint';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'OPS_CRON_SECRET';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-ops-secret', v_secret),
    body := jsonb_build_object('jobs', to_jsonb(p_jobs))
  );
end;
$$;

revoke all on function public.ml_ops_cron_call(text[]) from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname in ('meatlink-expire-unpaid', 'meatlink-daily-ops');

select cron.schedule('meatlink-expire-unpaid', '*/30 * * * *', $$select public.ml_ops_cron_call(array['expire-unpaid'])$$);
select cron.schedule('meatlink-daily-ops', '0 0 * * *', $$select public.ml_ops_cron_call(array['low-stock','daily-digest'])$$);