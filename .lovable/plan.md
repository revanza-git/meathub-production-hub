## 0. Stack reality check (READ FIRST — blocking)

Your FSD §1 mandates **Next.js 16 + ASP.NET Core .NET 10 + PostgreSQL 18 + Redis + SignalR + S3 + Quartz/Hangfire**, deployed as containers with a separate worker host.

This Lovable project runs on a **fixed stack**: TanStack Start (React 19, Vite) on Cloudflare Workers, with Lovable Cloud (Supabase Postgres + Auth + Storage + Edge Functions) as the backend. I cannot install .NET, Next.js, Redis, SignalR, Quartz, or a separate worker process here.

Per your authority rules, I must stop and ask before deviating from the FSD. Options:

- **A. Adapt FSD to Lovable stack** (recommended for MVP): TanStack Start PWA + server functions, Supabase Postgres with RLS as tenant isolation, Supabase Realtime instead of SignalR, `pg_cron` + a durable `jobs` table instead of Quartz/Hangfire, Supabase Storage instead of S3, Lovable AI Gateway for the AI consultant. All PRD business rules, state machines, algorithms, and data model are preserved verbatim.
- **B. Two apps in one repo**: buyer PWA here, partner/ops portal here too, still on Lovable stack (same as A, just organized as separate route trees `/buyer/*` and `/partner/*`).
- **C. Stop**: you take the FSD to a Next.js/.NET team elsewhere.

Everything below assumes **A + B**. Confirm or redirect.

---

## 1. Implementation plan

Scope frame (PRD §6): implement all **P0** (launch-blocking); ship **P1** behind feature flags (AI consultant, WhatsApp notifications, advanced vendor dashboard, CSV bulk import, buyer approval thresholds); exclude all **P2**.

Cross-cutting foundations built once and reused:

- **Auth & tenancy**: Supabase Auth (email + password, optional phone OTP, MFA for privileged roles per IAM-003). `organizations`, `organization_members`, `roles` tables with `has_role(user, org, role)` SECURITY DEFINER. All tenant tables carry `organization_id` and RLS policies keyed on membership. No client-side role checks.
- **State machines**: one Postgres function per command in PRD §7 / FSD §5.1 guard matrix (`submit_order`, `confirm_actual_weight`, `expire_vendor_attempt`, …). Every mutation writes an `order_state_history` row with actor, from/to, reason. UI never mutates status directly.
- **Money & weight**: `bigint` rupiah, `numeric(12,3)` kg, versioned finance-rule rows (`finance_rule_versions`) referenced by every quote/invoice line. No floats anywhere.
- **Idempotency**: unique keys on `(idempotency_key)` for payments, `(provider_txn_id)` for webhooks, `(order_item_id, attempt_no)` for attempts. Server functions accept an `Idempotency-Key` header.
- **Jobs**: single `jobs` table (`kind`, `run_at`, `payload`, `status`, `attempts`, `locked_by`, `locked_until`). A `pg_cron` tick every minute calls an edge function that leases and runs due jobs (attempt-expiry, quote-expiry, payment-expiry, hub-24h, return-window, reliability rollups, reconciliation).
- **Realtime**: Supabase Realtime channels per `order_id` and per `delivery_job_id` for status/tracking pushes. DB remains source of truth.
- **Audit**: append-only `audit_events` for every privileged action; support uses read-only views + explicit controlled actions (IAM-007, no impersonation).
- **Feature flags**: `feature_flags` table + typed helper; gates AI, WhatsApp, CSV import, approval thresholds, advanced ranking.
- **Provider adapters**: interfaces for `PaymentProvider`, `MessagingProvider`, `MapsProvider`, `LlmProvider`, each with a `fake` implementation for dev/tests and one production implementation each (see §5 unresolved decisions for which).
- **i18n & formatting**: Bahasa Indonesia default, Asia/Jakarta timezone, IDR formatting utility, all error messages in ID.

Non-negotiable engineering rules I will enforce:

- Server-calculated totals only; client values never trusted (ORD-001).
- Every state transition through a Postgres function guarded by row-version / `SELECT … FOR UPDATE` (FSD §5.2).
- Financial records append-only; corrections are compensating entries (FSD §2).
- No cross-module direct table access; module boundaries enforced by a small architecture test.
- No promotions/discounts/credit terms anywhere in UI or schema (PRD §4.2).
- Vendors never see competitor exact prices or buyer PII/exact location (SRCH-005, privacy).

---

## 2. Route and screen map

Two top-level surfaces in one TanStack Start app. All routes SSR-safe; protected trees under `_authenticated/` with role-guard layouts.

```text
src/routes/
  __root.tsx
  index.tsx                              # public landing → CTA to /auth
  auth.tsx                               # login + register + reset
  legal/terms.tsx  legal/privacy.tsx  legal/returns.tsx

  _authenticated/
    route.tsx                            # session gate (managed)

    # ---------- BUYER PWA ----------
    buyer/
      route.tsx                          # gate: BUYER org membership
      index.tsx                          # Home: deposit, active queue, tabs, search, categories
      search.tsx                         # generic + specific results, ranking
      product/$productId.tsx             # product detail (tier badges, disclosures)
      house.tsx                          # SBMEAT house-brand list
      checkout/$orderId.tsx              # address, purchase type, submit
      orders/index.tsx                   # order history + filters
      orders/$orderNumber.tsx            # timeline, vendor waiting, final quote, pay, track, return
      orders/$orderNumber.pay.tsx        # payment (wallet or VA)
      orders/$orderNumber.track.tsx      # live courier tracking
      returns/new.$orderNumber.tsx       # return request
      wallet/index.tsx                   # deposit balance + ledger + statement export
      wallet/topup.tsx
      org/members.tsx  org/addresses.tsx  org/settings.tsx
      ai.tsx                             # AI consultant (P1, flagged)

    # ---------- PARTNER / OPS ----------
    partner/
      route.tsx                          # gate: internal or vendor role
      vendor/
        offers/index.tsx  offers/$id.tsx
        inventory.tsx                    # snapshots + adjustments
        attempts.tsx                     # inbound weight-confirmation queue
        attempts/$id.tsx                 # confirm/reject actual weight
        performance.tsx                  # reliability metrics, warnings
        imports.tsx                      # CSV (P1)
      hub/
        inbound.tsx  staging.tsx  dispatch.tsx  exceptions.tsx
      courier/
        jobs.tsx  jobs/$id.tsx           # accept, tracking publish, POD
      qc/
        queue.tsx  case/$id.tsx
      finance/
        payments.tsx  refunds.tsx  payables.tsx  reconciliation.tsx  adjustments.tsx
      support/
        orders.tsx  cases.tsx
      admin/
        orgs.tsx  users.tsx  catalog/masters.tsx  catalog/products.tsx
        offers-review.tsx  flags.tsx  config.tsx  audit.tsx

  # ---------- Server routes ----------
  api/public/webhooks/payment.ts         # signed payment webhook
  api/public/health.ts
  api/cron/tick.ts                       # pg_cron caller for job runner
  sitemap[.]xml.ts   robots.txt (public)
```

Screens 1:1 map onto the prototype's 8 buyer screens (home/search, generic results, specific results, house list, product detail, vendor waiting, final quote/pay, paid/invoice) plus every partner surface implied by PRD §5 roles.

---

## 3. Database schema (module-by-module, matches FSD §8)

All tables in `public`, all with explicit GRANTs to `authenticated` + `service_role`, RLS ON, tenant-scoped policies via `is_member_of(org)` / `has_role(user, org, role)` SECURITY DEFINER helpers. UUID v7 PKs, `timestamptz` UTC, `bigint` IDR, `numeric(12,3)` kg, `version bigint` for optimistic concurrency, `created_at/by/updated_at/by` on mutable aggregates.

**Identity & org**: `users`, `sessions`, `mfa_methods`, `organizations`, `organization_members`, `roles`, `addresses`, `agreements` (Terms/Privacy/Return/Risk versioned acceptance).

**Catalog**: `species`, `cuts`, `brands`, `origins`, `grades`, `packaging_types`, `units`, `products`, `product_media`, `product_evidence`, `product_disclosures`, `vendor_offers`, `offer_price_versions`, `service_zones`.

**Inventory**: `inventory_snapshots`, `inventory_adjustments`, `stock_holds` (SOFT/CONFIRMED/HARD).

**Search**: `search_logs`, `ranking_versions`, `ranking_snapshots` (referenced from attempts).

**Commerce**: `orders`, `order_items`, `order_state_history`, `order_vendor_attempts`, `weight_confirmations`, `quotes`, `quote_lines`, `substitution_events`.

**Finance**: `wallets`, `wallet_entries` (append-only ledger), `payment_intents`, `payments`, `refunds`, `invoices`, `invoice_lines`, `vendor_payables`, `settlements`, `finance_rule_versions`, `tax_rules`.

**Fulfillment**: `hub_receipts`, `hub_staging`, `delivery_jobs`, `delivery_tracking_events`, `proofs_of_delivery`, `queue_numbers`.

**Returns / QC**: `return_cases`, `return_items`, `qc_inspections`, `qc_evidence`.

**Vendor governance**: `vendor_reliability_daily`, `vendor_warnings` (SP1–SP5), `vendor_assignments`.

**Notifications**: `notification_templates`, `notifications`, `notification_deliveries`, `notification_preferences`.

**AI**: `ai_conversations`, `ai_messages`, `ai_tool_calls`.

**Platform**: `jobs`, `audit_events`, `feature_flags`, `config_versions`, `idempotency_keys`.

Key invariants encoded as DB constraints/triggers: unique active hold per `(order_item_id, attempt_id)`; unique `(order_item_id, attempt_no)`; unique `provider_txn_id`; wallet ledger balance check (`sum(entries) = wallet.balance`); no overlapping active `offer_price_versions`; order status transitions only via `commerce_transition()` function.

---

## 4. Development phases

Each phase ends with: migrations applied + RLS tests + module happy-path e2e + audit assertions. No phase ships without its guardrails.

**Phase 0 — Foundations (no user-visible features).** Enable Lovable Cloud. Roles/tenancy helpers, RLS test harness, jobs runner + pg_cron tick, audit_events, feature_flags, provider-adapter interfaces with fakes, IDR/kg utils, i18n scaffold, design tokens (Archivo/Archivo Expanded, maroon/gold/ink palette from prototype), shell layouts for buyer and partner, `/auth`, terms acceptance.

**Phase 1 — Identity & onboarding (IAM-001..008, BUY-001).** Signup, email verify, MFA for privileged roles, organization Draft→Submitted→Under Review→Approved flow, admin review screen, addresses with service-zone resolution.

**Phase 2 — Catalog & inventory (CAT-001..011, partial 012).** Masters admin, product + tier evidence + disclosures, vendor offers with purchase types (Loaf/Carton/Ritel), price versions, inventory snapshots + adjustments, publish states, house-brand differentiation.

**Phase 3 — Search & product detail (SRCH-001..009, BUY-003).** Buyer home, generic vs specific results, deterministic ranking v1 (landed price → reliability → distance → offer id), substitution preview, product detail with tier/disclosure/QC standard, house list.

**Phase 4 — Order + vendor attempt + final quote (ORD-001..end of §8.5).** Checkout, soft hold in one txn, attempt routing, vendor confirmation screen with 2h server deadline, expiry job + fallback chain, final quote generation with versioned finance rule, buyer cancel-until-payment.

**Phase 5 — Payment, wallet, invoice.** Wallet ledger, top-up (VA adapter, fake in dev), payment intents, idempotent webhook at `/api/public/webhooks/payment`, ConfirmPayment → PAID + invoice issue, buyer wallet + statement export, finance reconciliation screen.

**Phase 6 — Fulfillment.** Hub inbound with temp/weight/condition, staging, dispatch within 24h, courier job accept, tracking events + Supabase Realtime, POD, queue number on buyer home, live tracking screen.

**Phase 7 — Returns, QC, refunds.** Return request within window, QC queue with evidence, approve/reject, refund posted as wallet credit via append-only entries, order/return status closure, vendor-fault flag feeding governance.

**Phase 8 — Vendor governance & reliability.** Nightly rollup of stock accuracy, response SLA, median response, return fault rate; SP1–SP5 unified warning; auto-suspend at SP5; vendor performance dashboard (no competitor prices).

**Phase 9 — Notifications & P1 features (feature-flagged).** Email notifications on key transitions; WhatsApp adapter behind flag; AI consultant (Lovable AI Gateway, read-only tools whitelist, never places/pays orders); CSV import; buyer approval thresholds.

**Phase 10 — Hardening.** Load smoke on search + attempt confirmation, chaos on job runner, RLS fuzz, audit completeness check, accessibility pass, PWA install + offline shell, runbooks.

---

## 5. Unresolved decisions (need your call before I touch them)

Stack & platform:

1. **Stack deviation from FSD §1** — accept Lovable/TanStack/Supabase adaptation (Option A above)? Yes/no.
2. **Single app vs two deployments** — buyer PWA and partner portal in one Lovable project (route-split) or two projects?

Business rules the sources leave open (PRD flags these; do not guess):

3. **Tax treatment** (PPN rate, inclusive/exclusive, per tier?) — required for `tax_rules` and every quote line.
4. **Payment provider** — Midtrans, Xendit, Doku, other? Determines VA + webhook adapter.
5. **KYB process** — self-serve doc upload + manual admin review, or third-party KYB vendor?
6. **Settlement timing to vendors** — T+n after DELIVERED with no open return, or another rule?
7. **Return window** — hours after DELIVERED before returns are refused. Prototype/PRD don't fix a number.
8. **Courier pricing** — rate card by zone/vehicle/weight (need the table) and free-shipping-per-vendor-order threshold value.
9. **Free-shipping threshold** value per FSD §6.1.
10. **Inventory staleness cutoff** (`inventory_stale_after_minutes`) for ranking eligibility.
11. **Quote expiry** and **payment expiry** durations.
12. **SP1–SP5 thresholds** — exact counts/rates that trip each level and reset window.
13. **Buyer approval threshold** default behavior when BUY-006 flag is on.

Infrastructure choices needed for adapters:

14. **Messaging** — SMTP provider for email; WhatsApp Business API vendor for P1.
15. **Maps** — Google Maps / Mapbox for address geocoding + service-zone resolution + courier tracking display.
16. **AI model** — default to Lovable AI Gateway `google/gemini-2.5-flash` unless you specify otherwise.
17. **Object storage** — Supabase Storage buckets (`product-media`, `evidence`, `qc`, `pod`, `invoices`) with signed URLs, correct?
18. **Sequential public numbers** — order number format (`SB-YYYYMMDD-XXXXXX`?), invoice number format.

Scope confirmations:

19. **Partner portal in same repo** — confirm all internal roles (hub, courier, QC, finance, support, admin) share the `/partner/*` tree.
20. **AI consultant** — ship in MVP behind flag (my default) or defer entirely?

I will not write code until you approve Section 0 (stack) and answer items 3–12 at minimum — those are business rules the PRD explicitly says need founder sign-off, and they change the schema and state machines. Items 14–20 can be answered as we reach the relevant phase.