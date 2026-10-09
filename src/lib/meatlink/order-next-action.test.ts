import { describe, expect, it } from "vitest";
import { orderNextAction } from "./order-next-action";

describe("next order action", () => {
  it("routes an unpaid BCA order to payment", () => {
    expect(orderNextAction({ status: "AWAITING_PAYMENT", payment_method: "BANK_TRANSFER" })).toBe("pay");
  });
  it("routes uploaded proof to verification, not settlement", () => {
    expect(orderNextAction({ status: "AWAITING_PAYMENT", payment_method: "BANK_TRANSFER", payment_proof_url: "receipt.jpg" })).toBe("verify");
  });
  it("routes terms requests to discussion rather than payment", () => {
    expect(orderNextAction({ status: "NEW", payment_method: "TERMS_REQUEST" })).toBe("terms");
  });
  it("keeps previous live payment attempts out of manual payment", () => {
    expect(orderNextAction({ status: "AWAITING_PAYMENT", payment_method: "BANK_TRANSFER", payment_ref: "Midtrans Live previous" })).toBe("previous_payment");
  });
  it("routes shipped orders to receipt confirmation", () => {
    expect(orderNextAction({ status: "SHIPPED", payment_method: "BANK_TRANSFER", paid_at: "2026-10-09" })).toBe("receive");
  });
  it("does not offer payment on a cancelled order", () => {
    expect(orderNextAction({ status: "CANCELLED", payment_method: "BANK_TRANSFER" })).toBe("details");
  });
});