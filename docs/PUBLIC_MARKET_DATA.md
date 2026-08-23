# Public beef-market data integration

Meatlink's MCP exposes `get_public_beef_market_data`, a read-only tool that combines:

- FAOSTAT QCL cattle-meat production history.
- USDA Foreign Agricultural Service PSD Beef & Veal production, import, export, and consumption forecasts.

The tool returns public external statistics only. It does not read or return Meatlink inventory,
prices, orders, RFQs, buyers, vendors, or locations. Codex can use its output as evidence for
`create_market_insight`; the resulting insight is always a draft until an administrator publishes it.
Every new agent draft contains equivalent Bahasa Indonesia and English titles and bodies. Bahasa
Indonesia remains the default public version; the English copy must preserve the same figures,
sources, recommendation, uncertainty, and limitations.

## Current Indonesian market context without Bapanas API access

Until Bapanas approves API access, the MCP uses a reviewable observation workflow for public pages
from PIHPS Bank Indonesia, SP2KP/Kemendag, Bapanas publications, Kementan, BPS, and Bank Indonesia.
It never calls hidden or undocumented dashboard endpoints.

1. An admin or agent reads a dated public source and calls `record_public_market_observation`.
2. The record is saved as `candidate`; the source URL must match the selected official domain.
3. An admin checks the page and calls `review_public_market_observation` to verify or reject it.
4. The agent calls `list_public_market_observations`, combines recent signals with FAOSTAT/USDA,
   and passes the supporting observation IDs to `create_market_insight`.

`create_market_insight` enforces a relevance gate: at least one price observation must be no more than
7 days old, or one industry/policy/seasonal/macro signal must be no more than 30 days old. Candidate-only
evidence cannot produce a high-confidence draft. Every draft records its audience, time horizon,
freshness decision, observation details, dates, and public source URLs in `data_refs`.

Dashboard observations are daily reported benchmarks, not real-time or Meatlink transaction prices.
The create tool rejects text that appears to disclose Meatlink internal inventory, pricing, orders,
RFQs, buyers, vendors, or locations.

## Required server secrets

Configure these only in the Lovable/Supabase server environment. Never prefix them with `VITE_` or
place them in browser code.

| Secret             | Purpose                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `FAOSTAT_USERNAME` | FAOSTAT Developer Portal username used to request a short-lived JWT |
| `FAOSTAT_PASSWORD` | FAOSTAT Developer Portal password used to request a short-lived JWT |
| `USDA_FAS_API_KEY` | USDA FAS API key sent in the `X-Api-Key` request header             |

`FAOSTAT_API_TOKEN` may be set instead of username/password for temporary testing, but FAOSTAT
tokens expire after 60 minutes and are unsuitable as the production configuration.

Registration and documentation:

- FAOSTAT Developer Portal: <https://www.fao.org/faostat/en/#developer-portal>
- USDA FAS Open Data: <https://apps.fas.usda.gov/opendatawebV2/>
- USDA API key registration: <https://api.data.gov/signup/>

## Agent workflow

1. Call `list_public_market_observations` for current Indonesian price and industry context.
2. Call `get_public_beef_market_data` for the relevant countries and market year.
3. Call `list_market_insights` to avoid duplicate coverage.
4. Draft a concise recommendation for buyers, suppliers, or both using only public evidence.
5. Write equivalent Bahasa Indonesia and English versions without changing figures or caveats.
6. Pass both language versions, the public observation IDs, audience, time horizon, and structural figures to
   `create_market_insight`; an administrator reviews and publishes the draft.

If one upstream API is unavailable or unconfigured, the tool returns that source with
`status: "error"` while preserving successful data from the other source.

## FAOSTAT CDN 403 handling

FAOSTAT sits behind a CDN/WAF that blocks anonymous server-to-server calls (headerless edge
requests) with an HTML "Request blocked" page, even when the bearer token is valid. The tool
therefore:

- sends a non-secret `User-Agent` and `Accept: application/json` on every FAOSTAT call;
- mints a fresh short-lived token immediately before each retrieval (never cached or persisted);
- refreshes the token once and retries once on a JSON `401`;
- retries only transient failures (`429/502/503/504` and the HTML CDN `403`) with at most two
  attempts, exponential backoff plus jitter, honouring `Retry-After`;
- splits retrieval into per-country batches with concurrency 2, then merges and deduplicates;
- records sanitized diagnostics only (provider, status, content type, duration, attempt, request id);
- returns a short sanitized provider error (e.g. `code: "UPSTREAM_BLOCKED"`), never the HTML page,
  while `Promise.allSettled` keeps USDA results available.
