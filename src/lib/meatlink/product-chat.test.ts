import { expect, it } from "vitest";
import { productChatContext } from "./product-chat";
it("references the selected product by name and canonical link", () => {
  expect(productChatContext("19 Flank Allana", "19-flank-allana")).toBe("19 Flank Allana\nhttps://meatlink.id/produk/19-flank-allana");
});
it("keeps the product link within the chat context limit", () => {
  const context = productChatContext("x".repeat(400), "ribeye");
  expect(context.length).toBeLessThanOrEqual(300);
  expect(context.endsWith("https://meatlink.id/produk/ribeye")).toBe(true);
});