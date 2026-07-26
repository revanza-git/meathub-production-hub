# Load Testing

Uses [k6](https://k6.io) against preview or dedicated staging — **never against production during business hours**.

## Install

```bash
brew install k6              # macOS
# or: docker run --rm -i grafana/k6 run - < docs/load/smoke.js
```

## Environment

```bash
export BASE_URL="https://project--<id>-dev.lovable.app"
export BUYER_EMAIL="loadtest+buyer@meathub.dev"
export BUYER_PASSWORD="<test-only password>"
```

## Scenarios

### Smoke — 1 VU, 30 s

```bash
k6 run docs/load/smoke.js
```

### Browse — 20 VU, 5 min · target p95 < 500 ms

```bash
k6 run --vus 20 --duration 5m docs/load/browse.js
```

### Checkout — 5 VU, 3 min · target p95 < 1200 ms

```bash
k6 run --vus 5 --duration 3m docs/load/checkout.js
```

## Baseline (record each release)

| Scenario | Date       | p50 | p95 | Errors |
| -------- | ---------- | --- | --- | ------ |
| smoke    | YYYY-MM-DD |     |     |        |
| browse   | YYYY-MM-DD |     |     |        |
| checkout | YYYY-MM-DD |     |     |        |

## Regression policy

If p95 regresses > 30 % vs. previous baseline: block release, run slow-queries tool, add indexes, re-run.
