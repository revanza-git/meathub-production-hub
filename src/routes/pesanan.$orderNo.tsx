import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { supabase } from "@/integrations/supabase/client";

import { type PayMethod } from "@/lib/meatlink/cart";
import { useBi, useLabel, useFormat, ORDER_STATUS_LABEL_I18N, PAY_METHOD_LABEL_I18N } from "@/lib/i18n";
import { WHATSAPP_NUMBER, waLink } from "@/lib/meatlink/config";
import { PaymentPanel } from "@/components/meatlink/payment-panel";
import { PaymentProofUpload } from "@/components/meatlink/payment-proof";
import { OrderTimeline, type TimelineEvent } from "@/components/meatlink/order-timeline";
import { DeliveryPanel } from "@/components/meatlink/delivery-panel";

type TrackedOrder = {
  order_no: string;
  status: string;
  payment_method: PayMethod;
  buyer_name: string;
  address: string;
  city: string | null;
  subtotal_idr: number;
  total_idr: number;
  created_at: string;
  payment_channel?: string | null;
  payment_va?: string | null;
  payment_qr_url?: string | null;
  payment_expires_at?: string | null;
  payment_environment?: "sandbox" | "production" | null;
  paid_at?: string | null;
  courier_name?: string | null;
  tracking_no?: string | null;
  eta_date?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  buyer_confirmed_at?: string | null;
  items: {
    product_name: string;
    unit_price_idr: number;
    qty_kg: number;
    line_total_idr: number;
  }[];
  timeline?: TimelineEvent[];
};

export const Route = createFileRoute("/pesanan/$orderNo")({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" ? search.t : "",
  }),
  head: ({ params }) => {
    const title = `Pesanan ${params.orderNo} — Meatlink.id`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: "Status pesanan dan instruksi pembayaran untuk pesanan Meatlink.id Anda.",
        },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: "Status pesanan Meatlink.id." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: OrderPage,
});

function OrderPage() {
  const bi = useBi();
  const fmt = useFormat();
  const label = useLabel();
  const { orderNo } = Route.useParams();
  const { t } = Route.useSearch();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ml-order", orderNo, t],
    enabled: Boolean(t),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ml_track_order", {
        _order_no: orderNo,
        _token: t,
      });
      if (error) throw error;
      return (data as unknown as TrackedOrder | null) ?? null;
    },
  });

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        {isLoading ? (
          <div className="h-64 animate-pulse bg-ink/5" />
        ) : !data ? (
          <>
            <h1 className="font-display text-3xl text-ink">{bi("Pesanan tidak ditemukan", "Order not found")}</h1>
            <p className="mt-3 text-sm text-ash">
              {bi(
                "Tautan pelacakan tidak valid atau sudah kedaluwarsa. Hubungi tim kami di",
                "This tracking link is invalid or has expired. Contact our team on",
              )}{" "}
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="underline">
                WhatsApp
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow inline-flex items-center gap-2 text-crimson">
              {data.status === "CANCELLED" ? bi("Pesanan dibatalkan", "Order cancelled") : <><CheckCircle2 className="h-4 w-4" /> {bi("Pesanan diterima", "Order received")}</>}
            </p>
            <h1 className="mt-4 font-display text-4xl text-ink">{data.order_no}</h1>
            <p className="mt-3 text-sm text-ash">
              {bi("Status", "Status")}: {data.payment_method === "TERMS_REQUEST" && data.status === "NEW" ? bi("Menunggu kesepakatan termin", "Awaiting payment terms agreement") : label(ORDER_STATUS_LABEL_I18N, data.status)} ·{" "}
              {bi("Pembayaran", "Payment")}: {label(PAY_METHOD_LABEL_I18N, data.payment_method)}
            </p>

            {(data.payment_method === "BANK_TRANSFER" || data.payment_method === "QRIS") &&
            !data.paid_at &&
            (data.status === "NEW" || data.status === "AWAITING_PAYMENT") &&
            data.payment_environment !== "sandbox" ? (
              <PaymentPanel
                orderNo={data.order_no}
                token={t}
                method={data.payment_method}
                total={data.total_idr}
                existing={{
                  channel: data.payment_channel ?? null,
                  va: data.payment_va ?? null,
                  qrUrl: data.payment_qr_url ?? null,
                  expiresAt: data.payment_expires_at ?? null,
                }}
                onPaid={() => refetch()}
              />
            ) : null}

            <div className="mt-8 border border-line p-6">
              <h2 className="eyebrow text-ash">{bi("Instruksi berikutnya", "Next steps")}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/80">
                {data.paid_at
                  ? bi(
                      "Pembayaran sudah kami terima. Tim kami memproses dan menjadwalkan pengiriman pesanan Anda.",
                      "We have received your payment. Our team is processing and scheduling delivery of your order.",
                    )
                  : data.status === "CANCELLED"
                    ? bi("Pembayaran dibatalkan atau kedaluwarsa. Jika Anda sudah membayar, hubungi tim kami agar transaksi dapat diperiksa.", "Payment was cancelled or expired. If you have paid, contact our team so we can review the transaction.")
                  : data.payment_environment === "sandbox" && (data.payment_method === "BANK_TRANSFER" || data.payment_method === "QRIS")
                    ? bi("Instruksi uji lama tidak berlaku untuk pembayaran nyata. Hubungi tim kami untuk membuat pesanan baru.", "Old test instructions cannot be used for real payment. Contact us to place a new order.")
                  : data.payment_method === "TERMS_REQUEST"
                    ? bi("Pesanan Anda tercatat sebagai pengajuan termin, bukan persetujuan kredit. Hubungi tim kami untuk membahas syarat pembayaran, harga akhir, dan pengiriman. Belum ada tagihan atau jatuh tempo.", "Your order is recorded as a payment terms request, not approved credit. Contact our team to discuss terms, final price and delivery. No invoice or due date has been issued.")
                  : data.payment_method === "BANK_TRANSFER"
                    ? bi(
                        "Transfer ke nomor Virtual Account di atas. Status pesanan otomatis diperbarui setelah pembayaran diterima.",
                        "Transfer to the Virtual Account number above. The order status updates automatically once payment is received.",
                      )
                    : data.payment_method === "QRIS"
                      ? bi(
                          "Tampilkan kode QRIS di atas sebelum membayar. Jika kode belum muncul, jangan lakukan pembayaran dan hubungi tim kami. Status pesanan diperbarui setelah pembayaran terverifikasi.",
                          "Show the QRIS code above before paying. If no code appears, do not pay and contact our team. The order status updates after payment is verified.",
                        )
                      : data.payment_method === "CBD"
                        ? bi(
                            "Pembayaran tunai dilakukan sebelum pengiriman. Tim kami menghubungi Anda untuk menjadwalkan pengiriman.",
                            "Cash payment is made before delivery. Our team will contact you to schedule delivery.",
                          )
                        : bi(
                            "Tim kami menghubungi Anda melalui WhatsApp untuk finalisasi pesanan dan pembayaran.",
                            "Our team will contact you via WhatsApp to finalize the order and payment.",
                          )}
              </p>
              {!data.paid_at && data.status !== "CANCELLED" && data.payment_environment === "sandbox" ? (
                <p className="mt-3 text-sm text-crimson">{bi("Transaksi ini dibuat dalam mode uji. Jangan transfer uang ke nomor VA atau memindai QR lama. Hubungi tim kami untuk membuat pesanan pembayaran nyata yang baru.", "This transaction was created in test mode. Do not transfer money to its old VA or scan its QR code. Contact us to create a new real-payment order.")}</p>
              ) : null}
              <a
                href={waLink(data.payment_method === "TERMS_REQUEST"
                  ? bi(`Halo Meatlink, saya ingin membahas pengajuan termin untuk pesanan ${data.order_no}. Kebutuhan: ${data.items.map((item) => `${item.product_name} ${fmt.qty(item.qty_kg)}`).join(", ")}. Nilai indikatif ${fmt.money(data.total_idr)}. Mohon info syarat pembayaran dan total akhir.`, `Hello Meatlink, I would like to discuss payment terms for order ${data.order_no}. Items: ${data.items.map((item) => `${item.product_name} ${fmt.qty(item.qty_kg)}`).join(", ")}. Indicative total ${fmt.money(data.total_idr)}. Please confirm payment terms and final total.`)
                  : bi(`Halo Meatlink, saya ingin menindaklanjuti pesanan ${data.order_no}.`, `Hello Meatlink, I would like to follow up on order ${data.order_no}.`))}
                target="_blank"
                rel="noopener noreferrer"
                className="eyebrow mt-6 inline-block bg-crimson px-6 py-3 text-bone hover:bg-crimson-deep"
              >
                {data.payment_method === "TERMS_REQUEST" && data.status !== "CANCELLED" ? bi("Bahas termin di WhatsApp", "Discuss terms on WhatsApp") : bi("Hubungi tim via WhatsApp", "Contact our team via WhatsApp")}
              </a>
            </div>

            {!data.paid_at && data.status !== "CANCELLED" && data.payment_method !== "TERMS_REQUEST" ? <PaymentProofUpload orderNo={data.order_no} token={t} /> : null}

            <DeliveryPanel
              orderNo={data.order_no}
              token={t}
              status={data.status}
              courier={data.courier_name ?? null}
              trackingNo={data.tracking_no ?? null}
              etaDate={data.eta_date ?? null}
              shippedAt={data.shipped_at ?? null}
              deliveredAt={data.delivered_at ?? null}
              confirmedAt={data.buyer_confirmed_at ?? null}
              onConfirmed={() => refetch()}
            />

            <OrderTimeline events={data.timeline ?? []} />

            <h2 className="mt-12 font-display text-2xl text-ink">{bi("Rincian", "Details")}</h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {data.items.map((i, idx) => (
                <li key={idx} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm text-ink">{i.product_name}</p>
                    <p className="mt-1 text-xs text-ash">
                      {fmt.qty(i.qty_kg)} × {fmt.money(i.unit_price_idr)}
                    </p>
                  </div>
                  <p className="text-sm text-ink">{fmt.money(i.line_total_idr)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-baseline justify-between">
              <span className="eyebrow text-ash">{data.payment_method === "TERMS_REQUEST" ? bi("Nilai indikatif", "Indicative value") : bi("Total", "Total")}</span>
              <span className="font-display text-3xl text-ink">{fmt.money(data.total_idr)}</span>
            </div>

            <p className="mt-10 text-sm text-ash">
              {bi(
                "Simpan tautan halaman ini untuk memantau status pesanan.",
                "Save this page link to track your order status.",
              )}{" "}
              <Link to="/produk" className="underline">
                {bi("Belanja lagi", "Shop again")}
              </Link>
            </p>
          </>
        )}
      </section>
    </SiteLayout>
  );
}
