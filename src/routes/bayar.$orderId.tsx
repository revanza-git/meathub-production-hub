import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { CheckCircle2, Clock, XCircle, Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { rupiah, tanggalJam } from "@/lib/market/format";
import { getOrder, updateOrderPayment, type Order } from "@/lib/market/orders-store";

import { PAY_CHANNELS, DEFAULT_CHANNEL_ID, channelById } from "@/lib/market/channels";
import { createOrderPayment, getPaymentStatus, type CreatedPayment } from "@/lib/payments.functions";
import type { PaymentStatus } from "@/lib/market/payment";

export const Route = createFileRoute("/bayar/$orderId")({
  validateSearch: (s: Record<string, unknown>) => ({
    metode: typeof s.metode === "string" ? s.metode : DEFAULT_CHANNEL_ID,
  }),
  head: () => ({
    meta: [
      { title: "Pembayaran Pesanan — MEATHUB" },
      { name: "description", content: "Selesaikan pembayaran pesanan MEATHUB via Virtual Account, QRIS, atau gerai retail." },
      { property: "og:title", content: "Pembayaran Pesanan — MEATHUB" },
      { property: "og:description", content: "Selesaikan pembayaran pesanan Anda dengan aman." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentPage,
});

const GROUPS = ["Virtual Account", "QRIS", "Gerai Retail"] as const;

function PaymentPage() {
  const { orderId } = Route.useParams();
  const { metode } = Route.useSearch();
  const nav = useNavigate();

  const [order, setOrder] = useState<Order | undefined>();
  const [channelId, setChannelId] = useState<string>(channelById(metode) ? metode : DEFAULT_CHANNEL_ID);
  const [intent, setIntent] = useState<CreatedPayment | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("PENDING");
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const settled = useRef(false);

  useEffect(() => setOrder(getOrder(orderId)), [orderId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const channel = channelById(channelId);

  const remaining = useMemo(() => {
    if (!intent?.expiresAt) return null;
    return Math.max(0, Math.floor((new Date(intent.expiresAt).getTime() - now) / 1000));
  }, [intent, now]);

  function applyStatus(next: PaymentStatus) {
    setStatus(next);
    if (next === "PAID" && !settled.current) {
      settled.current = true;
      // Dana masuk ke rekening MEATHUB (escrow) dan ditahan sampai pesanan Selesai.
      updateOrderPayment(orderId, "PAID");
      setOrder(getOrder(orderId));
      toast.success("Pembayaran diterima");
    }
    if (next === "FAILED") toast.error("Pembayaran gagal");
    if (next === "EXPIRED") toast.error("Pembayaran kedaluwarsa");
  }

  async function startPayment() {
    if (!order) return;
    setCreating(true);
    setError(null);
    try {
      const res = await createOrderPayment({
        data: {
          orderRef: order.id,
          channelId,
          amount: Math.round(order.total),
          customer: {
            name: order.buyer.name,
            phone: order.buyer.phone.replace(/[^0-9]/g, ""),
            email: `po-${order.id.toLowerCase()}@meathub.id`,
          },
        },
      });
      setIntent(res);
      setStatus("PENDING");
      settled.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat pembayaran.");
    } finally {
      setCreating(false);
    }
  }

  async function refreshStatus(silent = false) {
    if (!intent) return;
    if (!silent) setChecking(true);
    try {
      const res = await getPaymentStatus({ data: { intentId: intent.intentId } });
      if (res.status !== status) applyStatus(res.status as PaymentStatus);
      else if (!silent) toast.info("Pembayaran belum diterima. Coba lagi beberapa saat.");
    } catch {
      if (!silent) toast.error("Gagal memeriksa status pembayaran.");
    } finally {
      if (!silent) setChecking(false);
    }
  }

  // Auto-poll while awaiting payment.
  useEffect(() => {
    if (!intent || status !== "PENDING") return;
    const t = setInterval(() => void refreshStatus(true), 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, status]);

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

  const mm = remaining === null ? null : String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = remaining === null ? null : String(remaining % 60).padStart(2, "0");

  if (status === "PAID") {
    return (
      <MarketLayout>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-xl border border-success/30 bg-success/5 p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" aria-hidden="true" />
            <h1 className="mt-4 font-display text-2xl font-bold text-ink">Pembayaran berhasil</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pesanan {order.id} sedang diteruskan ke {order.subOrders.length} vendor untuk dikonfirmasi.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => nav({ to: "/akun/pesanan/$id", params: { id: order.id } })}>Lacak pesanan</Button>
              <Link to="/produk" search={{}}>
                <Button variant="outline">Belanja lagi</Button>
              </Link>
            </div>
          </div>
        </div>
      </MarketLayout>
    );
  }

  if (status === "FAILED" || status === "EXPIRED") {
    return (
      <MarketLayout>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <XCircle className="mx-auto h-14 w-14 text-destructive" aria-hidden="true" />
            <h1 className="mt-4 font-display text-2xl font-bold text-ink">
              {status === "EXPIRED" ? "Pembayaran kedaluwarsa" : "Pembayaran gagal"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Silakan buat pembayaran baru atau pilih kanal lain.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  setIntent(null);
                  setStatus("PENDING");
                }}
              >
                Buat pembayaran baru
              </Button>
              <Link to="/akun/pesanan/$id" params={{ id: order.id }}>
                <Button variant="outline">Lihat pesanan</Button>
              </Link>
            </div>
          </div>
        </div>
      </MarketLayout>
    );
  }

  return (
    <MarketLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold text-ink">Selesaikan pembayaran</h1>
              <p className="text-sm text-muted-foreground">
                Pesanan {order.id} · {tanggalJam(order.createdAt)}
              </p>
            </div>
            {mm && (
              <Badge variant="outline" className="shrink-0 gap-1 border-accent/40 bg-accent/10">
                <Clock className="h-3 w-3" aria-hidden="true" /> {mm}:{ss}
              </Badge>
            )}
          </div>

          <div className="my-5 rounded-lg bg-maroon/5 p-4 text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Total tagihan</div>
            <div className="font-display text-3xl font-bold text-maroon">{rupiah(intent?.amount ?? order.total)}</div>
            {intent?.fee ? (
              <div className="mt-1 text-xs text-muted-foreground">Biaya kanal {rupiah(intent.fee)} ditanggung MEATHUB</div>
            ) : null}
          </div>

          {!intent ? (
            <>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Pilih kanal pembayaran
              </h2>
              <div className="space-y-4">
                {GROUPS.map((g) => (
                  <div key={g}>
                    <p className="mb-1.5 text-sm font-semibold text-ink">{g}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PAY_CHANNELS.filter((c) => c.group === g).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setChannelId(c.id)}
                          aria-pressed={channelId === c.id}
                          className={`rounded-lg border p-3 text-left text-sm transition ${
                            channelId === c.id ? "border-maroon bg-maroon/5" : "border-border hover:border-maroon/40"
                          }`}
                        >
                          <span className="block font-medium text-ink">{c.label}</span>
                          <span className="block text-xs text-muted-foreground">{c.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

              <Button className="mt-5 w-full" disabled={creating} onClick={() => void startPayment()}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Membuat pembayaran…
                  </>
                ) : (
                  `Bayar dengan ${channel?.label ?? "kanal terpilih"}`
                )}
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Pembayaran diproses oleh iPaymu. Status lunas hanya dikonfirmasi oleh sistem pembayaran.
              </p>
            </>
          ) : (
            <>
              {channel?.method === "qris" && intent.qrString ? (
                <div className="mx-auto w-fit rounded-lg border-4 border-ink bg-white p-3">
                  <QRCodeCanvas value={intent.qrString} size={196} aria-label="Kode QRIS pembayaran" />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {channel?.method === "cstore" ? "Kode pembayaran" : "Nomor Virtual Account"} · {intent.paymentName}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-2 font-display text-xl font-bold tracking-wider text-ink">
                    {intent.paymentNo ?? "—"}
                    {intent.paymentNo && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Salin nomor pembayaran"
                        onClick={() => {
                          void navigator.clipboard.writeText(intent.paymentNo!);
                          toast.success("Nomor pembayaran disalin");
                        }}
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <p className="mt-4 text-center text-sm text-ink-soft">{channel?.hint}</p>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Bayar tepat sejumlah {rupiah(intent.amount)}. Status akan diperbarui otomatis setelah pembayaran diterima.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button variant="outline" disabled={checking} onClick={() => void refreshStatus(false)}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />
                  Saya sudah bayar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIntent(null);
                    setError(null);
                  }}
                >
                  Ganti kanal
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </MarketLayout>
  );
}
