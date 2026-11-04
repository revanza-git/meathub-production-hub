import { describe, expect, it } from "vitest";
import { canReadCustomerChat, chatNotificationKey } from "./chat-access";
import { CHAT_EMAIL, chatIdentitySchema, chatMessageSchema, chatPhoneSchema } from "./chat-schema";
import { TRANSFER_ACCOUNT, chatLink } from "./config";
describe("customer chat requirements", () => {
  it("permits guest chats with name, email, and phone", () => {
    expect(
      chatIdentitySchema.safeParse({
        name: "Guest buyer",
        email: "buyer@example.com",
        phone: "0812 3456 7890",
      }).success,
    ).toBe(true);
    expect(chatIdentitySchema.safeParse({ name: "Guest buyer", email: "" }).success).toBe(false);
  });
  it("requires a reachable phone number before a chat can start", () => {
    expect(chatPhoneSchema.safeParse("081234567890").success).toBe(true);
    expect(chatPhoneSchema.safeParse("+62 812-3456-7890").success).toBe(true);
    expect(chatPhoneSchema.safeParse("").success).toBe(false);
    expect(chatPhoneSchema.safeParse("0812").success).toBe(false);
    expect(chatPhoneSchema.safeParse("bukan nomor 12").success).toBe(false);
  });
  it("sends notifications only to the requested shared mailbox", () => {
    expect(CHAT_EMAIL).toBe("cs@meatlink.id");
  });
  it("limits account conversations to their owner regardless of guest token", () => {
    expect(canReadCustomerChat("buyer-a", "buyer-a", null, null)).toBe(true);
    expect(canReadCustomerChat("buyer-a", "buyer-b", "hash", "hash")).toBe(false);
    expect(canReadCustomerChat("buyer-a", null, null, null)).toBe(false);
  });
  it("requires a matching guest token hash", () => {
    expect(canReadCustomerChat(null, null, "hash-a", "hash-a")).toBe(true);
    expect(canReadCustomerChat(null, null, "hash-a", "hash-b")).toBe(false);
    expect(canReadCustomerChat(null, null, null, null)).toBe(false);
  });
  it("deduplicates notification keys by message ID", () => {
    expect(chatNotificationKey("message-one")).toBe("chat-message-one");
    expect(chatNotificationKey("message-two")).not.toBe(chatNotificationKey("message-one"));
  });
  it("enforces message length and ignores whitespace-only content", () => {
    const id = "a8c2cfaa-2b9e-4e32-9f42-0b4556547811";
    expect(chatMessageSchema.safeParse({ messageId: id, body: " ".repeat(5) }).success).toBe(false);
    expect(chatMessageSchema.safeParse({ messageId: id, body: "x".repeat(4001) }).success).toBe(
      false,
    );
  });
  it("keeps BCA transfer details and replaces external WhatsApp links", () => {
    expect(TRANSFER_ACCOUNT).toEqual({
      bank: "BCA",
      number: "5271200847",
      holder: "Rizal Abdurrachman",
    });
    expect(chatLink("Order MLO-1")).toBe("/chat?context=Order%20MLO-1");
  });
});
