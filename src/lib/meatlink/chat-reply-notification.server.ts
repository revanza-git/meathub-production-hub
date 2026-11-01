import { sendTemplateEmail } from "@/lib/email-templates/send-email";

export async function notifyChatReply(
  inserted: boolean,
  conversation: { id: string; customer_email: string; customer_name: string },
  messageId: string,
) {
  if (!inserted) return { status: "skipped" as const };
  try {
    const result = await sendTemplateEmail("chat-reply", conversation.customer_email, {
      idempotencyKey: `chat-reply-${messageId}`,
      templateData: {
        name: conversation.customer_name,
        chatUrl: `https://meatlink.id/chat?conversation=${encodeURIComponent(conversation.id)}`,
      },
    });
    return { status: result.sent ? "sent" as const : "suppressed" as const };
  } catch {
    console.warn("Chat reply notification could not be sent");
    return { status: "failed" as const };
  }
}