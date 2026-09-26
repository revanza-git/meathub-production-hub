import { describe, expect, it } from "vitest";
import { paymentReference, paymentReferenceDetails, qrisImageUrl, type MidtransTransaction } from "./midtrans.server";

describe("Midtrans payment environments", () => {
  it("keeps legacy sandbox attempts separate from production attempts", () => {
    expect(paymentReferenceDetails("Midtrans MLO-123-abc")).toEqual({ environment: "sandbox", orderId: "MLO-123-abc" });
    expect(paymentReferenceDetails(paymentReference("production", "MLO-123-xyz"))).toEqual({ environment: "production", orderId: "MLO-123-xyz" });
    expect(paymentReferenceDetails("iPaymu 123")).toBeNull();
  });
  it("uses only trusted Midtrans QR image actions, including the v2 fallback", () => {
    const transaction = { order_id: "test", transaction_id: "test", transaction_status: "pending", gross_amount: "1000" } as MidtransTransaction;
    expect(qrisImageUrl({ ...transaction, actions: [{ name: "generate-qr-code-v2", url: "https://api.midtrans.com/v4/qris/test/qr-code" }] })).toBe("https://api.midtrans.com/v4/qris/test/qr-code");
    expect(qrisImageUrl({ ...transaction, actions: [{ name: "generate-qr-code", url: "https://not-midtrans.example/qr" }] })).toBeNull();
    expect(qrisImageUrl(transaction)).toBeNull();
  });
});