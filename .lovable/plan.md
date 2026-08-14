# Admin Inventory — Meatlink house stock

A new admin-only area to manage Meatlink's own inventory (separate from vendor catalogues), seeded with the four price lists you uploaded.

## 1. What the data looks like

All four PDFs share the same shape, so one table covers them:

| Field | Example | Notes |
|---|---|---|
| Origin | Australia / Japan / USA / Canada / Lokal Premium | file-level for AUS, JPN, Lokal; per-row for USA/Canada |
| Brand | AACO - DARLING DOWNS, KIWAMI, SAU | blank in the Lokal list (defaults to AAM) |
| Name | CHK FLAP TAIL WGY MB7 | product description |
| Condition | FRZ / CHL | absent in USA/Canada list → left empty |
| Average weight | 8KG, 250GR, 1.5KG | kept as text, plus a parsed kg number for sorting |
| Sale price | 1000000 | IDR per kg; `0` means price on request |
| Qty on hand | 1241.41 | kg, decimals allowed |

Row counts: Australia 276, Japan 78, Lokal Premium (AAM) 28, USA/Canada 24 — about **406 rows** seeded.

## 2. New table

`admin_inventory` in the database:
`origin`, `brand`, `name`, `condition`, `avg_weight_text`, `avg_weight_kg`, `sale_price_idr`, `qty_on_hand_kg`, `is_active`, `notes`, timestamps.

Access rules:
- Only admin accounts can read, create, edit, or delete rows.
- Buyers and vendors get nothing from this table for now (we can expose an anonymised view later if you want it on the buyer stock page).
- Every row is seeded in the migration itself from the four PDFs.

## 3. Screens

New nav item **Inventory** shows only for admin accounts.

```text
/admin/inventory        list + search + filters (origin, brand, condition) + summary tiles
                        inline edit price/qty, add item, delete item
/admin/inventory/import Excel/CSV upload: download template, upload, preview, confirm
```

**List page** — table of all items with total SKU count, total kg, and total stock value; text search on name/brand; dropdown filters; "Add item" opens a form panel; each row has edit and delete.

**Import page** — a "Download template" button producing an `.xlsx` with the exact columns (`origin, brand, name, condition, avg_weight, sale_price_idr, qty_on_hand_kg`), a file picker accepting `.xlsx` and `.csv`, a parsed preview table with per-row errors, and a choice between **Replace all** and **Upsert by origin+brand+name+condition** before confirming.

## 4. Technical notes

- Parsing `.xlsx` in the browser via the `xlsx` package (also used to generate the template); CSV reuses the existing parser style.
- Import writes in batches through the existing Supabase client, so it works under admin RLS without new server functions.
- Prices display as Rp with thousands separators; `0` renders as "On request".
- Design stays on the existing Noir & Gold system and matches the current admin pages.

## 5. Decisions I need from you

1. **Buyer visibility** — keep this admin-only for now, or also feed the buyer "Available stock" page with these items (without brand/origin)? Default: admin-only.
2. **Price meaning** — treat "Sale Price" as price per kg. Confirm.
3. **Relation to vendor stock** — leave `vendor_products` untouched as a separate list. Default: yes, separate.
