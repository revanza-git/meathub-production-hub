import { describe, expect, it } from "vitest";
import { paymentReference, paymentReferenceDetails } from "./midtrans.server";

describe("Midtrans payment environments", () => {
  it("keeps legacy sandbox attempts separate from production attempts", () => {
    expect(paymentReferenceDetails("Midtrans MLO-123-abc")).toEqual({ environment: "sandbox", orderId: "MLO-123-abc" });
    expect(paymentReferenceDetails(paymentReference("production", "MLO-123-xyz"))).toEqual({ environment: "production", orderId: "MLO-123-xyz" });
    expect(paymentReferenceDetails("iPaymu 123")).toBeNull();
  });
});