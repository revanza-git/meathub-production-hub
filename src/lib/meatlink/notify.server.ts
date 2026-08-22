/**
 * Meatlink notification module — Titan (GoDaddy) SMTP via an HTTP relay.
 *
 * The app server runs on a serverless edge runtime that cannot open raw SMTP
 * sockets, so mail is handed to an HTTP relay that performs the SMTP session
 * with the Titan credentials. The relay URL is required for email to actually
 * send; if it is missing, the module logs and skips gracefully.
 *
 * Configure with secrets:
 *
 *   SMTP_RELAY_URL    HTTPS endpoint of the relay (required for real sending)
 *   SMTP_RELAY_TOKEN  Bearer token for the relay (optional)
 *   SMTP_HOST         default smtp.titan.email
 *   SMTP_PORT         default 465
 *   SMTP_USER         Titan mailbox, e.g. cs@meatlink.id
 *   SMTP_PASS         Titan mailbox password
 *   MAIL_FROM         e.g. "Meatlink <cs@meatlink.id>" (defaults to SMTP_USER)
 *   MAIL_ADMIN_TO     optional internal copy address
 *
 * Server-only. Never import from client code.
 */

export type OrderEvent = "placed" | "paid" | "shipped" | "completed";

type MailInput = { to: string; subject: string; html: string; text: string };

function relayConfig() {
  const url = process.env["SMTP_RELAY_URL"];
  if (!url) return null;
  const user = process.env["SMTP_USER"] ?? "";
  const pass = process.env["SMTP_PASS"] ?? "";
  return {
    url,
    token: process.env["SMTP_RELAY_TOKEN"] ?? "",
    host: process.env["SMTP_HOST"] ?? "smtp.titan.email",
    port: Number(process.env["SMTP_PORT"] ?? 465),
    user,
    pass,
    from: process.env["MAIL_FROM"] ?? user,
    adminTo: process.env["MAIL_ADMIN_TO"] ?? "",
  };
}

export async function sendMail(input: MailInput): Promise<{ sent: boolean; reason?: string }> {
  const cfg = relayConfig();
  if (!cfg) {
    console.warn("[notify] SMTP relay not configured; skipping email.", input.to);
    return { sent: false, reason: "smtp_not_configured" };
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.token) headers["Authorization"] = `Bearer ${cfg.token}`;

  const res = await fetch(cfg.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: cfg.from || undefined,
      to: input.to,
      bcc: cfg.adminTo || undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
      // Credentials are optional: the relay normally holds the Titan login
      // itself. They are only forwarded when set on this app.
      smtp:
        cfg.user && cfg.pass
          ? {
              host: cfg.host,
              port: cfg.port,
              secure: cfg.port === 465,
              auth: { user: cfg.user, pass: cfg.pass },
            }
          : undefined,
    }),
  });


  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[notify] relay error", res.status, body.slice(0, 300));
    return { sent: false, reason: `relay_${res.status}` };
  }
  return { sent: true };
}

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const SITE = "https://meatlink.id";

type OrderRow = {
  id: string;
  order_no: string;
  access_token: string | null;
  buyer_name: string;
  email: string | null;
  total_idr: number | string;
  payment_method: string | null;
  courier_name: string | null;
  tracking_no: string | null;
  eta_date: string | null;
};

type ItemRow = { product_name: string; qty_kg: number | string; line_total_idr: number | string };

function copyFor(event: OrderEvent, order: OrderRow) {
  switch (event) {
    case "placed":
      return {
        subject: `Pesanan ${order.order_no} diterima — Meatlink`,
        heading: "Pesanan Anda sudah kami terima",
        body: "Terima kasih. Pesanan Anda sedang menunggu pembayaran / konfirmasi tim kami.",
      };
    case "paid":
      return {
        subject: `Pembayaran pesanan ${order.order_no} dikonfirmasi — Meatlink`,
        heading: "Pembayaran dikonfirmasi",
        body: "Pembayaran Anda sudah kami terima. Pesanan segera kami proses.",
      };
    case "shipped":
      return {
        subject: `Pesanan ${order.order_no} dikirim — Meatlink`,
        heading: "Pesanan sedang dalam pengiriman",
        body: [
          order.courier_name ? `Kurir: ${order.courier_name}.` : "",
          order.tracking_no ? `No. resi: ${order.tracking_no}.` : "",
          order.eta_date ? `Estimasi tiba: ${order.eta_date}.` : "",
        ]
          .filter(Boolean)
          .join(" ") || "Pesanan Anda sudah diserahkan ke kurir.",
      };
    case "completed":
      return {
        subject: `Pesanan ${order.order_no} selesai — Meatlink`,
        heading: "Pesanan selesai",
        body: "Terima kasih telah berbelanja di Meatlink. Kami tunggu pesanan berikutnya.",
      };
  }
}

function renderEmail(event: OrderEvent, order: OrderRow, items: ItemRow[]) {
  const { subject, heading, body } = copyFor(event, order);
  const link = order.access_token
    ? `${SITE}/pesanan/${order.order_no}?t=${order.access_token}`
    : `${SITE}/pesanan/${order.order_no}`;

  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${i.product_name} — ${Number(
          i.qty_kg,
        )} kg</td><td align="right" style="padding:6px 0;border-bottom:1px solid #eee">${idr(
          Number(i.line_total_idr),
        )}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="id"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <div style="max-width:560px;margin:0 auto;padding:28px 24px">
    <p style="margin:0 0 20px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8a1c26"><strong>Meatlink</strong></p>
    <h1 style="margin:0 0 8px;font-size:22px">${heading}</h1>
    <p style="margin:0 0 4px;color:#444">Halo ${order.buyer_name},</p>
    <p style="margin:0 0 20px;color:#444">${body}</p>
    <p style="margin:0 0 6px;font-size:13px;color:#666">No. pesanan</p>
    <p style="margin:0 0 20px;font-size:16px"><strong>${order.order_no}</strong></p>
    <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;margin-bottom:12px">${rows}
      <tr><td style="padding:10px 0"><strong>Total</strong></td><td align="right" style="padding:10px 0"><strong>${idr(
        Number(order.total_idr),
      )}</strong></td></tr>
    </table>
    <p style="margin:24px 0"><a href="${link}" style="background:#8a1c26;color:#ffffff;text-decoration:none;padding:12px 22px;display:inline-block;font-size:13px;letter-spacing:.1em;text-transform:uppercase">Lacak pesanan</a></p>
    <p style="margin:24px 0 0;font-size:12px;color:#888">Email otomatis dari Meatlink.id</p>
  </div></body></html>`;

  const text = `${heading}\n\nHalo ${order.buyer_name},\n${body}\n\nNo. pesanan: ${order.order_no}\nTotal: ${idr(
    Number(order.total_idr),
  )}\nLacak: ${link}\n\nMeatlink.id`;

  return { subject, html, text };
}

/** Looks up the order and emails the buyer about the given lifecycle event. */
export async function sendOrderEmail(orderNo: string, event: OrderEvent) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("storefront_orders")
    .select(
      "id, order_no, access_token, buyer_name, email, total_idr, payment_method, courier_name, tracking_no, eta_date",
    )
    .eq("order_no", orderNo)
    .maybeSingle();

  if (!order) return { sent: false, reason: "order_not_found" };
  if (!order.email) return { sent: false, reason: "no_email" };

  const { data: items } = await supabaseAdmin
    .from("storefront_order_items")
    .select("product_name, qty_kg, line_total_idr")
    .eq("order_id", order.id);

  const mail = renderEmail(event, order as OrderRow, (items ?? []) as ItemRow[]);
  return sendMail({ to: order.email, ...mail });
}
