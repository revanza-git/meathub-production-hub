import { expect, it } from "vitest";
import { composeChatMessage } from "./chat-compose";
import { chatMessageSchema } from "./chat-schema";
it("retains the product reference on a customer question", () => {
  expect(composeChatMessage("Stock available?", "Ribeye")).toBe("Ribeye\n\nStock available?");
});
it("does not duplicate an existing product reference", () => {
  expect(composeChatMessage("Ribeye\n\nStock?", "Ribeye")).toBe("Ribeye\n\nStock?");
});
it("validates the complete message including its reference against the 4000 character limit", () => {
  expect(chatMessageSchema.safeParse({ messageId: "f8141188-1789-42b0-9297-73a0a0bb72cd", body: composeChatMessage("x".repeat(4000), "Ribeye") }).success).toBe(false);
});