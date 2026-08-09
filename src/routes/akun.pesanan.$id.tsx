import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Circle, Truck, MapPin, Receipt, ClipboardCheck, Video, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getOrder,
  STATUS_TONE,
  approveVerification,
  requestSwap,
  cancelOrder,
  confirmReceipt,
} from "@/lib/market/orders-store";
import { vendorById } from "@/lib/market/data";
import { rupiah, tanggalJam } from "@/lib/market/format";
import { getConfig, TIER_SEGMENT, FEE_DISCLOSURE } from "@/lib/market/pricing";

export const Route = createFileRoute("/akun/pesanan/$id")({
  head: () => ({
    meta: [
      { title: "Detail Pesanan — MEATHUB" },
      { name: "description", content: "Verifikasi gudang, persetujuan pembeli, pembayaran, dan cek fisik pesanan MEATHUB." },
      { property: "og:title", content: "Detail Pesanan — MEATHUB" },
      { property: "og:description", content: "Status PO, verifikasi gudang, dan cek fisik penerimaan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const order = getOrder(id);
  const config = getConfig();
  const [swapReason, setSwapReason] = useState("");
  const [condition, setCondition] = useState("Sesuai");
  const [videoName, setVideoName] = useState("");
  const [receiptNote, setReceiptNote] = useState("");

  if (!order) {
    return (
      <MarketLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Pesanan tidak ditemukan</h1>
          <Link to="/akun/pesanan">
            <Button className="mt-4">Kembali ke daftar pesanan</Button>
          </Link>
        </div>
      </MarketLayout>
    );
  }

  const refresh = () => router.invalidate();

  return (
    <MarketLayout>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
          <Link to="/akun" className="hover:text-maroon">Akun</Link> /{" "}
          <Link to="/akun/pesanan" className="hover:text-maroon">Pesanan</Link> /{" "}
          <span className="text-ink">{order.id}</span>
        </nav>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-ink">Pesanan {order.id}</h1>
            <p className="text-sm text-muted-foreground">
              Dibuat {tanggalJam(order.createdAt)} · {order.paymentMethod}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tier {order.tier} · {TIER_SEGMENT[order.tier]} · {order.totalKg.toFixed(1)} kg
            </p>
          </div>
          <Badge variant="outline" className={`shrink-0 ${STATUS_TONE[order.status] ?? ""}`}>
            {order.status}
          </Badge>
        </div>

        {order.status === "Menunggu Persetujuan Pembeli" && (
          <section className="mt-4 rounded-xl border border-accent/50 bg-accent/10 p-4">
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
              <ClipboardCheck className="h-4 w-4 text-maroon" aria-hidden="true" /> Tinjau hasil verifikasi gudang
            </h2>
            <p className="mb-3 text-xs text-ink-soft">
              Setujui untuk melanjutkan ke pembayaran, minta ganti barang, atau batalkan PO tanpa biaya.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  approveVerification(order.id);
                  toast.success("Verifikasi disetujui. Lanjutkan ke pembayaran.");
                  refresh();
                }}
              >
                Setujui & lanjut bayar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!swapReason.trim()) {
                    toast.error("Isi alasan permintaan ganti barang.");
                    return;
                  }
                  requestSwap(order.id, swapReason.trim());
                  toast.success("Permintaan ganti barang dikirim ke gudang vendor.");
                  refresh();
                }}
              >
                Minta ganti barang
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => {
                  cancelOrder(order.id);
                  toast.success("PO dibatalkan.");
                  refresh();
                }}
              >
                Batalkan PO
              </Button>
            </div>
            <Input
              className="mt-2"
              placeholder="Alasan ganti barang (mis. gramasi kurang, exp date terlalu dekat)"
              value={swapReason}
              onChange={(e) => setSwapReason(e.target.value)}
              aria-label="Alasan permintaan ganti barang"
            />
          </section>
        )}

        {order.status === "Menunggu Cek Fisik Pembeli" && (
          <section className="mt-4 rounded-xl border border-accent/50 bg-accent/10 p-4">
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
              <Video className="h-4 w-4 text-maroon" aria-hidden="true" /> Cek fisik & video 360°
            </h2>
            <p className="mb-3 text-xs text-ink-soft">
              Wajib diselesaikan maksimal {config.buyerCheckHours} jam setelah barang diterima. Lewat batas → pesanan
              disetujui otomatis dan retur tidak dapat diajukan. Tanpa konfirmasi sama sekali, sistem menutup pesanan
              setelah {config.autoConfirmDays} hari.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Nama file video 360° (mis. cek-360.mp4)"
                value={videoName}
                onChange={(e) => setVideoName(e.target.value)}
                aria-label="Nama file video 360 derajat"
              />
              <Input
                placeholder="Kondisi barang (Sesuai / Tidak sesuai)"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                aria-label="Kondisi barang"
              />
            </div>
            <Textarea
              className="mt-2"
              rows={2}
              placeholder="Catatan tambahan"
              value={receiptNote}
              onChange={(e) => setReceiptNote(e.target.value)}
              aria-label="Catatan penerimaan"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (!videoName.trim()) {
                    toast.error("Unggah/isi nama file video 360° terlebih dahulu.");
                    return;
                  }
                  confirmReceipt(order.id, { videoName: videoName.trim(), condition, notes: receiptNote });
                  toast.success("Penerimaan dikonfirmasi. Dana vendor dijadwalkan cair.");
                  refresh();
                }}
              >
                Konfirmasi terima (Done)
              </Button>
              <Link to="/akun/pesanan">
                <Button size="sm" variant="outline">Ajukan retur</Button>
              </Link>
            </div>
            <p className="mt-2 flex items-start gap-1 text-[11px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              Kasus barang busuk tidak masuk skema retur otomatis — hubungi PIC vendor via WhatsApp untuk penyelesaian.
            </p>
          </section>
        )}

        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <MapPin className="h-4 w-4 text-maroon" aria-hidden="true" /> Alamat pengiriman
          </h2>
          <p className="text-sm text-ink-soft">
            {order.buyer.name} · {order.buyer.phone}
            <br />
            {order.buyer.company}
            <br />
            {order.buyer.address}
          </p>
        </section>

        {order.subOrders.map((so) => {
          const vendor = vendorById(so.vendorId);
          const v = so.verification;
          return (
            <section key={so.id} className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <Link
                    to="/toko/$slug"
                    params={{ slug: vendor.slug }}
                    className="truncate font-semibold text-ink hover:text-maroon"
                  >
                    {vendor.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">Sub-pesanan {so.id}</div>
                </div>
                <Badge variant="outline" className={`shrink-0 ${STATUS_TONE[so.status] ?? ""}`}>
                  {so.status}
                </Badge>
              </div>

              <ul className="mt-3 divide-y divide-border text-sm">
                {so.items.map((it) => (
                  <li key={it.productId} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <Link to="/produk/$id" params={{ id: it.productId }} className="hover:text-maroon">
                        {it.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {it.variantLabel} × {it.qty} · {it.weightKg.toFixed(1)} kg · app fee {rupiah(it.appFee)}
                      </span>
                    </span>
                    <span className="shrink-0">{rupiah(it.unitPrice * it.qty)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs">
                <div className="font-semibold text-ink">Verifikasi gudang vendor</div>
                {v.status === "TERVERIFIKASI" ? (
                  <p className="mt-1 text-ink-soft">
                    Terverifikasi {v.verifiedAt ? tanggalJam(v.verifiedAt) : "—"} · gramasi {v.actualWeightKg ?? "—"} kg ·
                    slaughter {v.slaughterDate ?? "—"} · exp {v.expiryDate ?? "—"} · {v.photoCount ?? 0} foto
                    {v.notes ? ` · ${v.notes}` : ""}
                  </p>
                ) : v.status === "KADALUARSA" ? (
                  <p className="mt-1 text-destructive">Lewat batas {config.warehouseVerificationHours} jam — PO dibatalkan otomatis.</p>
                ) : (
                  <p className="mt-1 text-ink-soft">
                    Menunggu verifikasi fisik. Batas waktu {tanggalJam(v.deadlineAt)}.
                    {v.notes ? ` ${v.notes}` : ""}
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" aria-hidden="true" /> {so.deliveryOption} ·{" "}
                  {so.deliveryFee === 0 ? "Gratis" : rupiah(so.deliveryFee)}
                </span>
                <span>
                  Pencairan vendor: {so.payoutStatus} · didanai MEATHUB
                </span>
              </div>
              {so.note ? <p className="mt-1 text-xs text-muted-foreground">Catatan: {so.note}</p> : null}

              <ol className="mt-4 space-y-2">
                {so.timeline.map((t) => (
                  <li key={t.label} className="flex items-start gap-2 text-sm">
                    {t.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                    )}
                    <span className={t.done ? "text-ink" : "text-muted-foreground"}>
                      {t.label}
                      <span className="block text-[11px] text-muted-foreground">{tanggalJam(t.at)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}

        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Receipt className="h-4 w-4 text-maroon" aria-hidden="true" /> Landed price
          </h2>
          <dl className="space-y-1.5 text-sm">
            <Row label="Harga vendor" value={rupiah(order.subtotal)} />
            <Row label={`App fee MEATHUB (${order.totalKg.toFixed(1)} kg)`} value={rupiah(order.appFee)} />
            <Row label="Ongkos kirim" value={order.deliveryFee === 0 ? "Gratis" : rupiah(order.deliveryFee)} />
            {order.discount > 0 && <Row label="Diskon" value={`− ${rupiah(order.discount)}`} tone="text-success" />}
          </dl>
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <span className="font-semibold text-ink">Total landed</span>
            <span className="font-display text-xl font-bold text-maroon">{rupiah(order.total)}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{FEE_DISCLOSURE}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.info("Invoice PDF tersedia pada versi berikutnya (demo).")}>
              Unduh invoice
            </Button>
            {order.status === "Menunggu Pembayaran" && (
              <Link to="/bayar/$orderId" params={{ orderId: order.id }} search={{ metode: "va-bca" }}>
                <Button size="sm">Bayar sekarang</Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={() => toast.info("Broadcast WhatsApp ke seluruh PIC vendor (demo).")}>
              Hubungi PIC vendor
            </Button>
          </div>
        </section>
      </div>
    </MarketLayout>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={tone ?? "text-ink"}>{value}</dd>
    </div>
  );
}
