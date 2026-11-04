import { OpsAlertEmail } from "./ops-alert";
import type { TemplateEntry } from "./registry";
const Email = ({ name, phone, inboxUrl }: { name?: string; phone?: string; inboxUrl?: string }) => (
  <OpsAlertEmail
    heading="Pesan pelanggan baru"
    intro={`${name || "Pelanggan"}${phone ? ` (${phone})` : ""} mengirim pesan ke Meatlink.`}
    ctaUrl={inboxUrl || "https://meatlink.id/admin/chat"}
    ctaLabel="Buka percakapan"
  />
);
export const template = {
  component: Email,
  subject: "Pesan pelanggan baru — Meatlink",
  displayName: "Chat pelanggan",
  to: "cs@meatlink.id",
  previewData: { name: "Pelanggan", phone: "08xxxxxxxxxx", inboxUrl: "https://meatlink.id/admin/chat" },
} satisfies TemplateEntry;
