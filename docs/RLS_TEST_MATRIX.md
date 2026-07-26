# RLS Test Matrix

Walk this matrix after any policy change. Every cell must match the expected result.

Roles: **anon** (unauth) · **buyer** (member of APPROVED buyer org) · **vendor** (member of APPROVED vendor org) · **other_org** (different org) · **admin** (`platform_admin`).

Legend: ✅ allowed · ❌ denied · — n/a

| Table                | anon | buyer own | buyer other | vendor own | vendor other | admin |
| -------------------- | ---- | --------- | ----------- | ---------- | ------------ | ----- |
| profiles             | ❌   | ✅ self    | ❌          | ✅ self     | ❌            | ✅    |
| organizations        | ❌   | ✅ own     | ❌          | ✅ own      | ❌            | ✅    |
| organization_members | ❌   | ✅ own     | ❌          | ✅ own      | ❌            | ✅    |
| addresses            | ❌   | ✅ own org | ❌          | —          | —            | ✅    |
| kyb_documents        | ❌   | ✅ own org | ❌          | ✅ own org  | ❌            | ✅    |
| products             | ❌   | ✅ ACTIVE  | ✅ ACTIVE   | ✅ ACTIVE   | ✅ ACTIVE     | ✅    |
| vendor_offers        | ❌   | ✅ ACTIVE  | ✅ ACTIVE   | ✅ own      | ✅ ACTIVE     | ✅    |
| inventory_snapshots  | ❌   | ✅ read    | ✅ read     | ✅ own      | ✅ read       | ✅    |
| carts / cart_items   | ❌   | ✅ own     | ❌          | —          | —            | ✅    |
| orders               | ❌   | ✅ own     | ❌          | ✅ own line | ❌            | ✅    |
| order_items          | ❌   | ✅ own ord | ❌          | ✅ own      | ❌            | ✅    |
| fulfillments         | ❌   | ✅ own ord | ❌          | ✅ own      | ❌            | ✅    |
| hub_receipts         | ❌   | ❌         | ❌          | ✅ own      | ❌            | ✅    |
| delivery_jobs        | ❌   | ✅ own ord | ❌          | ✅ own      | ❌            | ✅    |
| invoices             | ❌   | ✅ own     | ❌          | ❌          | ❌            | ✅    |
| payments             | ❌   | ✅ own inv | ❌          | ❌          | ❌            | ✅    |
| settlements          | ❌   | ❌         | ❌          | ✅ own      | ❌            | ✅    |
| refunds              | ❌   | ✅ own ord | ❌          | ❌          | ❌            | ✅    |
| return_requests      | ❌   | ✅ own ord | ❌          | ✅ own line | ❌            | ✅    |
| qc_inspections       | ❌   | ❌         | ❌          | ❌          | ❌            | ✅    |
| sp_warnings          | ❌   | ❌         | ❌          | ✅ own      | ❌            | ✅    |
| notifications        | ❌   | ✅ self/org| ❌          | ✅ self/org | ❌            | ✅    |
| audit_events         | ❌   | ❌         | ❌          | ❌          | ❌            | ✅    |
| feature_flags        | ❌   | ✅ read    | ✅ read     | ✅ read     | ✅ read       | ✅ RW |
| idempotency_keys     | ❌   | ❌         | ❌          | ❌          | ❌            | ❌ *  |
| jobs                 | ❌   | ❌         | ❌          | ❌          | ❌            | ❌ *  |

`*` — service-role only (backend RPCs).

## SQL harness — impersonate a user

Run in the Cloud SQL editor to spot-check as a specific user:

```sql
BEGIN;
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<user_uuid>';
-- your SELECT / INSERT / UPDATE here
ROLLBACK;
```

Any `permission denied` where the matrix says ✅ (or any successful row where the matrix says ❌) is a bug.

## When to re-run

- Every migration that touches `CREATE POLICY` / `ALTER POLICY` / `GRANT`.
- Every migration adding a new table under `public`.
- Before every production release.
