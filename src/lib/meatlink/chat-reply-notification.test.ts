import { beforeEach, describe, expect, it, vi } from "vitest";
const send = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email-templates/send-email", () => ({ sendTemplateEmail: send }));
import { notifyChatReply } from "./chat-reply-notification.server";

const conversation = { id: "a8c2cfaa-2b9e-4e32-9f42-0b4556547811", customer_email: "buyer@example.com", customer_name: "Pembeli" };
describe("admin reply email", () => {
  beforeEach(() => { send.mockReset(); send.mockResolvedValue({ sent: true }); });
  it("notifies the conversation customer for each newly saved admin reply", async () => {
    await notifyChatReply(true, conversation, "reply-one");
    await notifyChatReply(true, conversation, "reply-two");
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenNthCalledWith(1, "chat-reply", "buyer@example.com", {
      idempotencyKey: "chat-reply-reply-one",
      templateData: { name: "Pembeli", chatUrl: `https://meatlink.id/chat?conversation=${conversation.id}` },
    });
    expect(send.mock.calls[1][2].idempotencyKey).toBe("chat-reply-reply-two");
  });
  it("skips duplicate message writes", async () => {
    expect(await notifyChatReply(false, conversation, "reply-one")).toEqual({ status: "skipped" });
    expect(send).not.toHaveBeenCalled();
  });
  it("preserves a saved chat reply when its email fails", async () => {
    send.mockRejectedValue(new Error("delivery failed"));
    expect(await notifyChatReply(true, conversation, "reply-one")).toEqual({ status: "failed" });
  });
  it("does not retry suppressed recipients", async () => {
    send.mockResolvedValue({ sent: false, reason: "recipient_suppressed" });
    expect(await notifyChatReply(true, conversation, "reply-one")).toEqual({ status: "suppressed" });
    expect(send).toHaveBeenCalledTimes(1);
  });
});