import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { rupiah, tanggalJam } from "@/lib/market/format";
import { getOrder, updateOrderPayment, type Order } from "@/lib/market/orders-store";
import { mockPaymentService, type PaymentIntent, type PaymentStatus } from "@/lib/market/payment";

export const Route = createFileRoute("/bayar/$orderId")({
  validateSearch: (s: Record<string, unknown>) => ({
    metode: typeof s.metode === "string" ? s.metode : "qris",
  }),
  head: () => ({
    meta: [
      { title: "Pembayaran Pesanan — MEATHUB" },
      { name: "description", content: "Selesaikan pembayaran pesanan MEATHUB Anda." },
      { property: "og:title", content: "Pembayaran Pesanan — MEATHUB" },
      { property: "og:description", content: "Selesaikan pembayaran pesanan Anda." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const { orderId } = Route.useParams();
  const { metode } = Route.useSearch();
  const nav = useNavigate();
  const [order, setOrder] = useState<Order | undefined>();
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("PENDING");
  const [seconds, setSeconds] = useState(3600);

  useEffect(() => {
    setOrder(getOrder(orderId));
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    void mockPaymentService
      .createIntent({ orderId: order.id, method: metode, amount: order.total })
      .then(setIntent);
  }, [order, metode]);

  useEffect(() => {
    if (status !== "PENDING") return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [status]);

  async function simulate(outcome: PaymentStatus) {
    if (!intent) return;
    setStatus("PROCESSING");
    const done = await new Promise<PaymentIntent>((resolve) =>
      setTimeout(() => void mockPaymentService.simulate(intent, outcome).then(resolve), 1200),
    );
    setStatus(done.status);
    updateOrderPayment(orderId, done.status);
    setOrder(getOrder(orderId));
    if (done.status === "PAID") toast.success("Pembayaran berhasil (simulasi)");
    if (done.status === "FAILED") toast.error("Pembayaran gagal (simulasi)");
    if (done.status === "EXPIRED") toast.error("Pembayaran kedaluwarsa (simulasi)");
  }

  if (!order) {
    return (
      <MarketLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Pesanan tidak ditemukan</h1>
          <Link to="/akun/pesanan">
            <Button className="mt-4">Lihat daftar pesanan</Button>
          </Link>
        </div>
      </MarketLayout>
    );
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <MarketLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        {status === "PAID" ? (
          <div className="rounded-xl border border-success/30 bg-success/5 p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" aria-hidden="true" />
            <h1 className="mt-4 font-display text-2xl font-bold text-ink">Pembayaran berhasil</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pesanan {order.id} sedang diteruskan ke {order.subOrders.length} vendor untuk dikonfirmasi.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => nav({ to: "/akun/pesanan/$id", params: { id: order.id } })}>
                Lacak pesanan
              </Button>
              <Link to="/produk" search={{}}>
                <Button variant="outline">Belanja lagi</Button>
              </Link>
            </div>
          </div>
        ) : status === "FAILED" || status === "EXPIRED" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <XCircle className="mx-auto h-14 w-14 text-destructive" aria-hidden="true" />
            <h1 className="mt-4 font-display text-2xl font-bold text-ink">
              {status === "EXPIRED" ? "Pembayaran kedaluwarsa" : "Pembayaran gagal"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Silakan ulangi pembayaran atau pilih metode lain.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => { setStatus("PENDING"); setSeconds(3600); }}>Coba lagi</Button>
              <Link to="/keranjang">
                <Button variant="outline">Kembali ke keranjang</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-xl font-bold text-ink">Selesaikan pembayaran</h1>
                <p className="text-sm text-muted-foreground">
                  Pesanan {order.id} · {tanggalJam(order.createdAt)}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 gap-1 border-accent/40 bg-accent/10">
                <Clock className="h-3 w-3" aria-hidden="true" /> {mm}:{ss}
              </Badge>
            </div>

            <div className="my-5 rounded-lg bg-maroon/5 p-4 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Total tagihan</div>
              <div className="font-display text-3xl font-bold text-maroon">{rupiah(order.total)}</div>
              <div className="mt-1 text-sm text-ink-soft">via {order.paymentMethod}</div>
            </div>

            {metode === "qris" ? (
              <div className="mx-auto grid h-44 w-44 place-items-center rounded-lg border-4 border-ink bg-white p-2">
                <div
                  className="h-full w-full"
                  role="img"
                  aria-label="Kode QRIS simulasi"
                  style={{
                    backgroundImage:
                      "repeating-conic-gradient(#1a1a1a 0% 25%, #ffffff 0% 50%)",
                    backgroundSize: "16px 16px",
                  }}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Nomor Virtual Account (demo)
                </div>
                <div className="mt-1 flex items-center justify-center gap-2 font-display text-xl font-bold tracking-wider text-ink">
                  8808 0000 1234 5678
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Salin nomor virtual account"
                    onClick={() => {
                      void navigator.clipboard.writeText("8808000012345678");
                      toast.success("Nomor VA disalin");
                    }}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}

            <p className="mt-4 text-center text-sm text-ink-soft">
              {intent?.instructions ?? "Menyiapkan instruksi pembayaran…"}
            </p>

            <div className="mt-6 space-y-2 rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Simulasi hasil pembayaran (demo)
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={status === "PROCESSING"} onClick={() => void simulate("PAID")}>
                  {status === "PROCESSING" ? "Memproses…" : "Bayar berhasil"}
                </Button>
                <Button size="sm" variant="outline" disabled={status === "PROCESSING"} onClick={() => void simulate("FAILED")}>
                  Bayar gagal
                </Button>
                <Button size="sm" variant="outline" disabled={status === "PROCESSING"} onClick={() => void simulate("EXPIRED")}>
                  Kedaluwarsa
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MarketLayout>
  );
}
