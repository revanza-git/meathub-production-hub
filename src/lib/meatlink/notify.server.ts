/**
 * Meatlink notification module — Lovable managed email.
 *
 * Order lifecycle emails are rendered from the `order-status` React Email
 * template and handed to Lovable's managed email API (sender domain
 * notify.meatlink.id). Delivery, retries, suppression and unsubscribe are
 * handled by Lovable; there is no SMTP relay or queue in this app.
 *
 * Server-only. Never import from client code.
 */

import { sendTemplateEmail } from "@/lib/email-templates/send-email";

export type OrderEvent = "placed" | "paid" | "shipped" | "completed";

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
        body:
          [
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

  const row = order as OrderRow;
  const { subject, heading, body } = copyFor(event, row);
  const trackUrl = row.access_token
    ? `${SITE}/pesanan/${row.order_no}?t=${row.access_token}`
    : `${SITE}/pesanan/${row.order_no}`;

  const result = await sendTemplateEmail("order-status", row.email!, {
    idempotencyKey: `order-status-${row.id}-${event}`,
    templateData: {
      subject,
      heading,
      body,
      buyerName: row.buyer_name,
      orderNo: row.order_no,
      totalText: idr(Number(row.total_idr)),
      trackUrl,
      items: ((items ?? []) as ItemRow[]).map((i) => ({
        name: i.product_name,
        qty: String(Number(i.qty_kg)),
        amount: idr(Number(i.line_total_idr)),
      })),
    },
  });

  return result.sent ? { sent: true } : { sent: false, reason: result.reason };
}
