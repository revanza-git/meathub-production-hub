# BRD v1.2 Integration Plan

How Meat Hub BRD v1.2 maps onto what already exists, what changes, and in what order.

## 1. What the BRD changes vs the current build

| Area | Current build | BRD v1.2 | Action |
|---|---|---|---|
| Platform fee | 5% commission + 11% PPN on quote | Flat markup Rp10.000/kg (non-A5), Rp50.000/kg (A5). No extra service fee | Replace fee engine |
| Payment | VA/QRIS mock, wallet deferred | CBD default (VA **or** deposit auto-cut) + TOP via Elefin (third-party paylater) | Add deposit wallet + Elefin path |
| Vendor cash risk | Settlement T+3, 5% cut | Vendor never holds receivable vs buyer; on TOP, Elefin pays vendor full cash | Rework settlement rules |
| Order flow | Cart → checkout → vendor confirms weight → pay | PO → warehouse physical verification (2h) → buyer approves/cancels/asks swap → pick delivery → checkout (CBD) | Insert PO + approval step before payment |
| Goods receipt | Delivered → return window 2h | Buyer must check + fill form + **360° video** within 3h; lapse → auto-approve, no return | Add receipt confirmation with media |
| Returns | QC queue, refund | Valid return → courier pickup + 100% refund ≤ 1x24 working hours; vendor must accept | Add working-day SLA + full refund rule |
| Rotten goods | In QC flow | Explicitly out of system: broadcast to all vendor PICs via WhatsApp | Add escalation path, no auto-return |
| Dashboards | Buyer / Vendor / many internal | Three primary: Buyer, Seller (business), **Gudang** (operations) | Split vendor into Seller + Gudang |
| Vendor criteria | KYB | Must be meatshop/professional, **min 3 active PICs**, vetted before listing | Enforce in onboarding |
| Tiers | Product tiers | Transaction tiers auto by checkout qty: Ritel / Loaf / Karton / Tonase, no MOQ | Compute tier at checkout |
| Courier in-house | Courier role exists | Out of scope phase 1 (GPS, 3-way verification later) | Feature-flag off |
| AI | Buyer AI consultant | AI first-pass review of return video/photo — later phase | Flag as roadmap |

## 2. Integration approach

Keep the existing marketplace shell, catalog, cart, order and role infrastructure. The BRD is mostly a **commercial-rules and order-state change**, not a rebuild.

### 2.1 Pricing engine
- New `pricing_rules`: `app_fee_per_kg` by product class (`A5` vs `NON_A5`), versioned.
- Landed price = vendor price + app fee/kg × kg + delivery. Shown line-by-line on product, cart, PO and checkout (transparency pillar).
- Remove percentage commission and any hidden fee from quote generation.

### 2.2 Order state machine (new canonical flow)
```text
PO_SUBMITTED
  -> WAREHOUSE_VERIFYING        (SLA 2h from PO; timeout -> AUTO_CANCELLED)
  -> VERIFIED_AWAITING_BUYER    (photos, gramasi, slaughter date, exp date)
       buyer: APPROVE | CANCEL | REQUEST_SWAP -> back to WAREHOUSE_VERIFYING
  -> DELIVERY_METHOD_SELECTED   (in-house courier | vendor courier | self pickup)
  -> AWAITING_PAYMENT           (CBD: VA or deposit auto-cut | TOP: Elefin)
  -> PAID -> SHIPPED -> RECEIVED
  -> BUYER_CHECK (SLA 3h; form + 360° video; timeout -> AUTO_APPROVED, return locked)
  -> COMPLETED | RETURN_REQUESTED -> RETURN_APPROVED -> PICKUP -> REFUNDED (<=1x24 working h)
```
All transitions stay server-side with history rows; SLA timers run on the existing job runner (working-day aware, skips public holidays).

### 2.3 Payments
- **CBD/VA**: existing mock/VA path, unchanged conceptually.
- **CBD/Deposit**: new `deposits` wallet with append-only ledger, top-up, auto-cut at checkout approval.
- **TOP/Elefin**: adapter interface (`PaylaterProvider`) with a fake implementation for the mockup — buyer eligibility check, limit display (up to ~Rp2M/buyer, tenor ≤60 days), Elefin disburses to vendor; vendor payable is marked `funded_by=ELEFIN`. No direct buyer→vendor receivable is ever recorded.

### 2.4 Dashboards
- `/mitra` splits into **Seller** (revenue, best sellers, average market price, listing & price management) and **Gudang** (verification queue with photo/weight/date capture, return receiving).
- Buyer dashboard gains: PO status, verification approval screen, receipt-check screen with video upload, return tracking.
- Courier dashboard stays behind a disabled flag.

### 2.5 Vendor onboarding
Add: professional/meatshop declaration, min 3 PIC contacts (name, role, WhatsApp) validated before listing, vetting status gate.

## 3. Delivery phases

- **A — Rules foundation**: per-kg app fee engine, transaction tier calculation, landed-price breakdown across all price displays.
- **B — PO & warehouse verification**: new states, Gudang dashboard, 2h SLA + auto-cancel, buyer approve/cancel/swap screen.
- **C — Payments**: deposit wallet + auto-cut, Elefin TOP option at checkout with terms/consequences copy, vendor payout rules with no open receivable.
- **D — Receipt & returns**: 3h check with form + 360° video, auto-approve on lapse, valid-return pickup + 100% refund within 1x24 working hours, vendor mandatory acceptance.
- **E — Exceptions & governance**: rotten-goods WhatsApp broadcast to all PICs, dispute log, admin monitoring.
- **F — Roadmap flags (off)**: in-house courier with GPS + 3-way verification and tariff (Rp10.000/5km, +Rp1.000/km app fee), AI first-pass return review.

## 4. Technical notes

- Existing Supabase schema is reused; changes are additive: `pricing_rules`, `purchase_orders` (or new states on `orders`), `warehouse_verifications`, `receipt_checks`, `deposits`/`deposit_entries`, `paylater_applications`, `vendor_pics`, `holidays`.
- All new tables: explicit GRANTs, RLS on, tenant-scoped policies; SLA jobs on the existing `jobs` + cron tick.
- Media (verification photos, 360° videos) goes to Storage buckets with signed URLs.
- Elefin, VA provider and WhatsApp remain adapter interfaces with fakes so the mockup stays clickable end to end.

## 5. Decisions needed

1. Does the Rp10.000/kg app fee replace PPN entirely in displayed price, or is PPN still added on top?
2. Is A5 classification a product attribute set by admin, or derived from grade data?
3. On CBD/VA, when exactly does the vendor get paid — on buyer receipt confirmation, or a fixed T+n?
4. Deposit top-up: minimum amount, refundable balance, and who approves withdrawals?
5. Elefin integration for this build: fake adapter only, or do you have API/sandbox credentials?
6. Should existing wagyu/tier data be remapped to the four transaction tiers, or do both concepts coexist?
