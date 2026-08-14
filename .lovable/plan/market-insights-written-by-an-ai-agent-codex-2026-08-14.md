# Market Insights written by an AI agent (Codex)

Today the "Sourcing notes" on `/insights` are three hardcoded paragraphs. The goal: let Codex analyse the Indonesian beef market (using Meatlink's own stock, RFQ and order data) and publish those notes into the site, with admin control over what goes live.

## What gets built

### 1. Database

New table `market_insights`:
- `title`, `body` (the note itself)
- `category` (e.g. demand, pricing, supply, logistics)
- `region` (Jakarta, Bali, Surabaya, Nasional…)
- `period_label` (e.g. "Agustus 2026")
- `source` — `agent` or `admin` (who wrote it)
- `confidence` (low/medium/high)
- `data_refs` (JSON: which numbers the note was based on — stock kg, RFQ counts, price ranges)
- `status` — `draft` / `published` / `archived`
- `display_rank` for ordering on the public page
- standard id / timestamps / created_by

Access rules:
- Anyone (including logged-out visitors) can read **published** notes only.
- Admins can create, edit, publish, archive anything.
- The agent writes through a controlled path and its notes always land as **draft** — nothing goes public without an admin publishing it.

Optional second table `market_metrics` (a small time series: date, metric key, region, numeric value) so notes can be backed by tracked numbers instead of one-off claims. I'd include it — it's what makes analysis repeatable month over month.

### 2. Read-only analysis data for the agent

Codex cannot see raw vendor identities or buyer PII. It gets aggregated snapshots only:
- stock by product/category/origin with total kg (already exists)
- Meatlink house inventory summary: counts, avg base price, avg public price, low-stock items, by origin/brand
- RFQ demand summary: request counts by product/category, region, volume bands, time window
- order summary: counts and kg by status, payment term mix

All of these are aggregate-only — no company names, no contacts, no phone numbers.

### 3. New agent tools (MCP)

- `get_market_snapshot` — returns the aggregates above for a chosen time window and region
- `list_market_insights` — read existing notes (avoid duplicates, follow up on last month)
- `create_market_insight` — write a new note as draft, with category, region, period, confidence and the data it relied on
- `update_market_insight` — revise its own draft

Publishing is deliberately **not** an agent tool.

### 4. Admin screen

`/admin/insights`: list of notes with status filters, inline edit, publish / unpublish / archive, reorder, and a badge showing which were agent-written. Includes a preview of how the note will look on the public page.

### 5. Public page

`/insights` reads published notes from the database instead of the hardcoded array, keeping the current layout: category eyebrow, title, body, plus region and period as small metadata. If nothing is published, the current three notes stay as fallback so the page never looks empty. The "Recently sourced" carousel is untouched.

## Order of work

1. Migration for `market_insights` (+ `market_metrics`) with access rules
2. Aggregate snapshot functions
3. MCP tools + regenerate the agent manifest
4. Admin screen
5. Public `/insights` wired to published notes

## Decisions I've assumed

- Agent output is always draft-first, never auto-published.
- Notes are Indonesian-market focused; language follows whatever the agent writes (Bahasa or English both fine).
- No scheduled/cron generation for now — Codex runs on demand. Automation can come later.
