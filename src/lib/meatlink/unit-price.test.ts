import { describe, expect, it } from "vitest";
import {
  UNIT_MARGIN_IDR,
  parseUnitMargins,
  unitPrice,
  unitPriceFromPublic,
} from "@/lib/meatlink/inventory";

describe("unit margins", () => {
  it("uses the configured defaults", () => {
    expect(UNIT_MARGIN_IDR).toEqual({ retail: 150000, loaf: 60000, carton: 55000, ton: 45000 });
  });

  it("accepts the ctn alias and falls back per field", () => {
    expect(parseUnitMargins({ ctn: 50000 })).toEqual({
      retail: 150000,
      loaf: 60000,
      carton: 50000,
      ton: 45000,
    });
    expect(parseUnitMargins(null)).toEqual(UNIT_MARGIN_IDR);
  });

  it("prices a standard item per unit", () => {
    const base = 100000;
    expect(unitPrice(base, 60000, "retail")).toBe(250000);
    expect(unitPrice(base, 60000, "loaf")).toBe(160000);
    expect(unitPrice(base, 60000, "carton")).toBe(155000);
    expect(unitPrice(base, 60000, "ton")).toBe(145000);
  });

  it("keeps the A5 premium on top of the unit spread", () => {
    expect(unitPrice(100000, 150000, "loaf")).toBe(250000);
    expect(unitPrice(100000, 150000, "retail")).toBe(340000);
    expect(unitPrice(100000, 150000, "ton")).toBe(235000);
  });

  it("derives unit prices from a public (loaf) price", () => {
    expect(unitPriceFromPublic(160000, "retail")).toBe(250000);
    expect(unitPriceFromPublic(160000, "carton")).toBe(155000);
    expect(unitPriceFromPublic(0, "ton")).toBe(0);
  });
});
