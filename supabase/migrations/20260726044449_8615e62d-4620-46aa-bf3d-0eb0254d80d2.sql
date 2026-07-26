
-- Lock down system tables with RLS enabled but no policies (deny-all except service_role)
-- service_role bypasses RLS by default; no policy = no user access.
-- Add explicit denial-safe policies for clarity.
CREATE POLICY "idempotency_keys_no_client_access" ON public.idempotency_keys
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "jobs_no_client_access" ON public.jobs
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- Tighten notifications UPDATE with_check (was `true`) so a user can't relabel a row to someone else
DROP POLICY IF EXISTS notifications_mark_read ON public.notifications;
CREATE POLICY notifications_mark_read ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    recipient_user_id = auth.uid()
    OR (recipient_org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = notifications.recipient_org_id AND m.user_id = auth.uid()
    ))
  )
  WITH CHECK (
    recipient_user_id = auth.uid()
    OR (recipient_org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = notifications.recipient_org_id AND m.user_id = auth.uid()
    ))
  );

-- Revoke EXECUTE on internal-only SECURITY DEFINER helpers/triggers.
-- These are called from other DB functions / triggers only, never from the client.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'handle_new_user()',
    'notify(uuid, uuid, text, text, text, text, uuid, text, text)',
    'next_order_no()',
    'next_invoice_no()',
    'next_settlement_no()',
    'audit_catalog_change()',
    '_create_fulfillment_on_confirm()',
    'trg_notify_order()',
    'trg_notify_order_item()',
    'trg_notify_delivery()',
    'trg_notify_invoice()',
    'trg_notify_settlement()',
    'trg_notify_sp()',
    'trg_notify_return()',
    'trg_notify_refund()'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
