insert into public.admin_settings (key, value)
values
  ('order_expiry_hours', '48'::jsonb),
  ('ops_alert_email', '""'::jsonb),
  ('ops_low_stock_alert_enabled', 'true'::jsonb),
  ('ops_daily_digest_enabled', 'true'::jsonb)
on conflict (key) do nothing;

create table if not exists public.ops_job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  run_key text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (job, run_key)
);

grant select on public.ops_job_runs to authenticated;
grant all on public.ops_job_runs to service_role;

alter table public.ops_job_runs enable row level security;

create policy "Admins can read ops job runs"
  on public.ops_job_runs for select to authenticated
  using (public.ml_has_role(auth.uid(), 'admin'::public.ml_role));

create or replace function public.ml_expire_unpaid_orders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours numeric;
  v_ids uuid[];
  v_rows jsonb;
begin
  select coalesce((value #>> '{}')::numeric, 48) into v_hours
  from public.admin_settings where key = 'order_expiry_hours';
  if v_hours is null or v_hours <= 0 then
    return jsonb_build_object('expired', 0, 'skipped', true);
  end if;

  with stale as (
    select id, order_no
    from public.storefront_orders
    where status in ('NEW','AWAITING_PAYMENT')
      and payment_method <> 'TOP'
      and payment_proof_url is null
      and paid_at is null
      and created_at < now() - make_interval(mins => (v_hours * 60)::int)
  ), upd as (
    update public.storefront_orders o
       set status = 'CANCELLED',
           admin_note = coalesce(o.admin_note || ' | ', '') || 'Auto-cancelled: unpaid past ' || v_hours || ' hours',
           updated_at = now()
      from stale s
     where o.id = s.id
     returning o.id, o.order_no
  )
  select coalesce(array_agg(id), '{}'::uuid[]),
         coalesce(jsonb_agg(jsonb_build_object('id', id, 'order_no', order_no)), '[]'::jsonb)
    into v_ids, v_rows
    from upd;

  if array_length(v_ids, 1) is not null then
    insert into public.storefront_order_events (order_id, event, note)
    select id, 'CANCELLED', 'Dibatalkan otomatis: pembayaran tidak diterima dalam ' || v_hours || ' jam.'
    from unnest(v_ids) as id;
  end if;

  return jsonb_build_object('expired', coalesce(array_length(v_ids, 1), 0), 'orders', v_rows);
end;
$$;

revoke all on function public.ml_expire_unpaid_orders() from public, anon, authenticated;
grant execute on function public.ml_expire_unpaid_orders() to service_role;

create or replace function public.ml_ops_digest(p_day date default (current_date - 1))
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_low numeric;
  v_result jsonb;
begin
  select coalesce((value #>> '{}')::numeric, 10) into v_low
  from public.admin_settings where key = 'inventory_low_stock_kg';
  v_low := coalesce(v_low, 10);

  select jsonb_build_object(
    'day', p_day,
    'orders', (select count(*) from public.storefront_orders
                where (created_at at time zone 'Asia/Jakarta')::date = p_day),
    'revenue_idr', (select coalesce(sum(total_idr), 0) from public.storefront_orders
                     where (created_at at time zone 'Asia/Jakarta')::date = p_day
                       and status <> 'CANCELLED'),
    'paid_orders', (select count(*) from public.storefront_orders
                     where (created_at at time zone 'Asia/Jakarta')::date = p_day
                       and paid_at is not null),
    'awaiting_payment', (select count(*) from public.storefront_orders
                          where status in ('NEW','AWAITING_PAYMENT')),
    'to_ship', (select count(*) from public.storefront_orders
                 where status in ('PAID','PROCESSING')),
    'low_stock', (select coalesce(jsonb_agg(jsonb_build_object(
                        'name', name, 'qty_kg', qty_on_hand_kg) order by qty_on_hand_kg), '[]'::jsonb)
                   from public.admin_inventory
                  where is_published and qty_on_hand_kg <= v_low),
    'low_stock_threshold_kg', v_low
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.ml_ops_digest(date) from public, anon, authenticated;
grant execute on function public.ml_ops_digest(date) to service_role;
grant execute on function public.ml_ops_digest(date) to authenticated;