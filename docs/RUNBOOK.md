# SBMEAT Meat Hub — Deployment & Ops Runbook

## 1. Environments

| Env      | URL                                                | Purpose                          |
| -------- | -------------------------------------------------- | -------------------------------- |
| Preview  | `project--<id>-dev.lovable.app`                    | Latest preview build (auto)      |
| Prod     | `project--<id>.lovable.app` (+ custom domain)      | Published deployment             |

Backend: Lovable Cloud (Supabase). Frontend: TanStack Start on Cloudflare Workers.

## 2. Release procedure

1. Merge / apply changes in the Lovable editor.
2. Run **Security scan** (Lovable → Security tab) — must be zero critical findings.
3. Run **Backend linter** (chat: "run supabase linter") — investigate any WARN or ERROR.
4. Click **Publish** → **Update**. Frontend deploys in ~1 minute.
5. Smoke-test the checklist in §5 against the production URL.

Backend migrations and edge logic deploy automatically when saved; only the
frontend requires an explicit publish.

## 3. Secrets

Configured via Lovable → Backend → Secrets. Never commit these:

- `LOVABLE_API_KEY` — auto-injected for AI Gateway.
- (future) `WHATSAPP_TOKEN`, `EMAIL_PROVIDER_KEY` — add before enabling
  those notification adapters.

Service-role key and DB password are not accessible on Lovable Cloud; all
privileged work runs through server functions on the platform.

## 4. Feature flags

Toggle at `/partner/admin/flags` (platform_admin only). MVP defaults:

| Key                          | Default | Notes                                    |
| ---------------------------- | ------- | ---------------------------------------- |
| `ai_consultant`              | off     | Buyer AI chat (Lovable AI Gemini)        |
| `vendor_csv_import`          | off     | Vendor bulk offer upload                 |
| `buyer_approval_thresholds`  | off     | Deferred (needs founder workflow)        |

## 5. Post-deploy smoke test

Run against production after every release. Screenshot each step.

1. `/` loads, `/auth` sign-in with email works, Google OAuth returns to app.
2. Approved buyer: search catalog, add to cart, checkout → order `SB-YYYYMMDD-NNNNNN` created.
3. Approved vendor: sees inbound line, can confirm → order rolls forward.
4. Hub: receives dispatched fulfillment. Courier: starts + completes delivery.
5. Finance: invoice auto-issued, record payment, generate settlements (T+3, 5%).
6. Return within 2 h → QC decision → refund posted, SP1 auto-issued when vendor-fault.
7. Notification bell shows realtime toast on each event.

## 6. Incident response

| Symptom                              | First check                                                     |
| ------------------------------------ | --------------------------------------------------------------- |
| 500 on server function               | AI Gateway / server-function logs in Cloud tab                  |
| RLS "permission denied"              | Confirm caller role + re-run backend linter                     |
| Realtime bell silent                 | Confirm Realtime enabled on `notifications` in Cloud → Database |
| Slow catalog search                  | Slow-queries tool, add index on offending predicate             |
| Auth "Unsupported provider"          | Reconfigure Google OAuth in Cloud → Auth                        |
| Stale UI after publish (mobile PWA)  | See PWA cleanup in `docs/PWA.md`                                |

## 7. Rollback

Frontend: click **Rollback** to a previous published version in the
Publish dialog.

Backend migrations are forward-only. Roll back by writing a compensating
migration; never edit historical migration files.

## 8. Data export

Cloud → Advanced → **Export data**. A full DB dump is prepared and
emailed when ready.

## 9. Ongoing hardening

- Weekly: run backend linter + Security scan; triage new findings.
- Monthly: review SP-warning history and audit-log volume trends.
- Before adding a new public route or table: update `docs/RLS_TEST_MATRIX.md`
  and add a row to the k6 script in `docs/LOAD_TESTING.md`.
