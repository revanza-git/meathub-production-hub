import { describe, expect, it } from "vitest";
import {
  containsInternalMarketData,
  evaluateMarketRelevance,
  type MarketObservation,
} from "./market-insight-relevance";

const now = new Date("2026-08-22T08:00:00.000Z");

function observation(overrides: Partial<MarketObservation> = {}): MarketObservation {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    source_name: "pihps_bi",
    source_url: "https://www.bi.go.id/hargapangan/",
    signal_type: "price",
    commodity: "Daging Sapi Kualitas 1",
    market_level: "retail",
    region: "Nasional",
    observed_on: "2026-08-21",
    price_idr_per_kg: 140000,
    value: null,
    unit: "IDR/kg",
    summary: "Daily reported retail benchmark",
    verification_status: "verified",
    ...overrides,
  };
}

describe("market insight relevance gate", () => {
  it("accepts a verified price from the last seven days", () => {
    const result = evaluateMarketRelevance([observation()], "high", now);
    expect(result.has_recent_price).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("accepts recent policy context without pretending it is a price", () => {
    const result = evaluateMarketRelevance(
      [observation({ signal_type: "policy", observed_on: "2026-08-01", price_idr_per_kg: null })],
      "medium",
      now,
    );
    expect(result.has_recent_price).toBe(false);
    expect(result.has_recent_industry_context).toBe(true);
  });

  it("rejects stale evidence", () => {
    expect(() =>
      evaluateMarketRelevance([observation({ observed_on: "2026-08-01" })], "medium", now),
    ).toThrow(/last 7 days/);
  });

  it("caps candidate-only evidence at medium confidence", () => {
    const result = evaluateMarketRelevance(
      [observation({ verification_status: "candidate" })],
      "high",
      now,
    );
    expect(result.confidence).toBe("medium");
    expect(result.all_verified).toBe(false);
  });

  it("rejects future and rejected observations", () => {
    expect(() =>
      evaluateMarketRelevance([observation({ observed_on: "2026-08-25" })], "low", now),
    ).toThrow(/Future-dated/);
    expect(() =>
      evaluateMarketRelevance([observation({ verification_status: "rejected" })], "low", now),
    ).toThrow(/Rejected/);
  });

  it("detects descriptions that expose Meatlink internal market data", () => {
    expect(containsInternalMarketData("Meatlink inventory totals 434,436 kg")).toBe(true);
    expect(containsInternalMarketData("FAOSTAT reports Australian production growth")).toBe(false);
  });
});
