# Meatlink v2 — Commerce-first rebuild

PRD v2 turns Meatlink from an RFQ/lead site into a B2B storefront: browse → product → cart → checkout → delivery → reorder. RFQ survives as "Special Sourcing". This is a large build, so it ships in phases; the site stays deployable after each one.

## What already exists and is kept

Auth + roles + RLS, `admin_inventory` (with markup), vendor products/import, buyer orders, supplier applications, market insights, MCP tools, PWA, Noir & Gold design tokens.

## Phase 0 — Catalog foundation (start here)

Database (additive, nothing destructive):

- `product_categories` (hierarchical, localized labels), `brands` (exists — extend), `products` (canonical: slug, SKU, names, category, brand, origin, condition, grade/marbling, packaging, order unit, MOQ, variable-weight flag, carton weight min/max, visibility, SEO fields), `product_localizations`, `product_media`, `product_attributes`.
- `supplier_offers` (source house/supplier, cost, price, availability, MOQ, lead time, validity, status) and `house_inventory` mapped from `admin_inventory`.
- `price_rules` + `price_history`.
- Sanitized public read functions only: `ml_public_catalog`, `ml_public_product(slug)`, `ml_public_availability` — internal cost, exact quantity and supplier identity never leave the server.
- Migration script mapping the 400+ `admin_inventory` rows into canonical products + house offers; unmapped vendor products go to an admin review queue.

Admin: `/admin/catalog` list + `/admin/catalog/$id` editor with offer mapping and publish toggle.

Correction items: real `/delivery`, `/payments`, `/faq`, `/terms`, `/privacy`, `/cookies` pages, canonical tags, locale-consistent metadata, remove the unapproved response-time promise.

Exit: a controlled catalog can be published without a cart.

## Phase 1 — Public commerce discovery

- Commerce header (logo, category menu, search, account, cart) + utility bar.
- New homepage in the PRD order: hero with working search, Shop by Category, Available Now shelf, deals, brands/origin, benefits, Special Sourcing CTA, trust proof, insights.
- `/products`, `/categories/$slug`, `/brands/$slug`, `/search`, `/products/$slug`, `/deals`.
- Product card + PDP with packaging, price basis, estimated carton total for variable weight, availability state, MOQ.
- Filters, sorting, zero-result handling; delivery-location context stored per visitor.
- Bahasa Indonesia default, English secondary.
- `/request-quote` → `/special-sourcing` with redirect preserved.

## Phase 2 — Cart and company checkout

- `carts` / `cart_items` with anonymous cart that survives sign-in; price snapshots per line.
- Company registration and verification, `company_addresses`, buyer roles (purchaser/approver/admin).
- Checkout stages, cash-before-delivery first, multi-line `orders` / `order_items` / `order_state_history`, idempotent submission, reservations.
- `/order-confirmation/$id`, order detail, transactional notifications.

## Phase 3 — Fulfillment and retention

Supplier fulfillment assignments, allocation and partial fulfillment, actual-weight finalization, deliveries + events, claims, saved lists and reorder, supplier performance, admin exception dashboard.

## Phase 4 — Commercial expansion

TOP credit controls, promotions/coupons, buyer price lists, recommendations, MCP commerce tools updated for multi-line orders.

## Technical notes

- Money as integer minor units (IDR), weights as numeric with explicit unit; order lines store immutable snapshots.
- Every new public table gets GRANTs plus RLS; public catalog reads go through security-definer functions that strip cost/supplier data.
- Server authority for price and availability: the client never computes a total that is trusted at submission.

## Decisions I need from you

1. Category tree: use the four current ones (Prime Cut / 2nd Cut / Offal / Bone) or build the full PRD taxonomy (beef, wagyu, lamb, poultry, seafood, frozen)?
2. Launch payment: cash-before-delivery only at first (TOP in Phase 4), or bring back the iPaymu VA/QRIS flow in Phase 2?
3. Public prices: keep the current markup rule (Rp60k non-A5, Rp150k A5) as the Phase 0 price rule?
4. Should I start Phase 0 now and report before moving into Phase 1?
