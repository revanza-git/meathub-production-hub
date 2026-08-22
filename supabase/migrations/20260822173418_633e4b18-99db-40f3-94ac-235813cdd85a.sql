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
  if auth.uid() is not null and not public.ml_has_role(auth.uid(), 'admin'::public.ml_role) then
    raise exception 'not authorised';
  end if;

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

revoke all on function public.ml_ops_digest(date) from public, anon;
grant execute on function public.ml_ops_digest(date) to service_role, authenticated;