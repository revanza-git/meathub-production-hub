/**
 * Internal ops notifications — server only.
 *
 * Every operational alert (new order, new registration, low stock, digest)
 * goes to the ops recipient list. The list is stored in `admin_settings`
 * under `ops_alert_email` and may hold several comma-separated addresses.
 *
 * Never import from client code.
 */

import { sendTemplateEmail } from "@/lib/email-templates/send-email";

export const DEFAULT_OPS_RECIPIENTS = ["cs@meatlink.id", "auzile.revan@gmail.com"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseList(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/[,;\s]+/)
    .map((v) => v.trim().toLowerCase())
    .filter((v) => EMAIL_RE.test(v));
}

/** Resolves the ops recipient list (settings first, built-in defaults as fallback). */
export async function opsRecipients(): Promise<string[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_settings")
      .select("value")
      .eq("key", "ops_alert_email")
      .maybeSingle();
    const list = parseList(data?.value);
    if (list.length > 0) return Array.from(new Set([...list, ...DEFAULT_OPS_RECIPIENTS]));
  } catch {
    // fall through to defaults
  }
  return [...DEFAULT_OPS_RECIPIENTS];
}

export type OpsAlertPayload = {
  subject: string;
  heading: string;
  intro: string;
  stats?: Array<{ label: string; value: string }>;
  listTitle?: string;
  list?: Array<{ label: string; value: string }>;
  ctaUrl?: string;
  ctaLabel?: string;
};

/**
 * Sends one ops alert to every recipient. One send per recipient keeps the
 * transactional contract (one recipient per send) intact.
 */
export async function sendOpsAlert(payload: OpsAlertPayload, idempotencyKey: string) {
  const recipients = await opsRecipients();
  let sent = 0;
  for (const to of recipients) {
    try {
      const result = await sendTemplateEmail("ops-alert", to, {
        idempotencyKey: `${idempotencyKey}-${to}`,
        templateData: payload,
      });
      if (result.sent) sent += 1;
    } catch {
      // one bad recipient must not block the others
    }
  }
  return { sent, recipients: recipients.length };
}
