# Public beef-market data integration

Meatlink's MCP exposes `get_public_beef_market_data`, a read-only tool that combines:

- FAOSTAT QCL cattle-meat production history.
- USDA Foreign Agricultural Service PSD Beef & Veal production, import, export, and consumption forecasts.

The tool returns public external statistics only. It does not read or return Meatlink inventory,
prices, orders, RFQs, buyers, vendors, or locations. Codex can use its output as evidence for
`create_market_insight`; the resulting insight is always a draft until an administrator publishes it.

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

1. Call `get_public_beef_market_data` for the relevant countries and market year.
2. Call `list_market_insights` to avoid duplicate coverage.
3. Draft a concise note using only the returned public figures.
4. Store the cited public figures and source URLs in `data_refs`.
5. Call `create_market_insight`; an administrator reviews and publishes the draft.

If one upstream API is unavailable or unconfigured, the tool returns that source with
`status: "error"` while preserving successful data from the other source.
