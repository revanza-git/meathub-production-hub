import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/app/app-shell";
import { formatIdr } from "@/lib/meatlink/inventory";
import { useBi } from "@/lib/i18n";
import { listReconciliations, checkReconciliationsNow } from "@/lib/meatlink/reconciliation.functions";

const states = ["ALL", "REVIEW", "FAILED", "PENDING", "MATCHED"] as const;

export function ReconciliationPanel() {
  const bi = useBi();
  const qc = useQueryClient();
  const list = useServerFn(listReconciliations);
  const check = useServerFn(checkReconciliationsNow);
  const { data = [], isPending, error } = useQuery({ queryKey: ["admin-reconciliations"], queryFn: () => list() });
  const [filter, setFilter] = useState<(typeof states)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const filtered = data.filter((row) =>
    (filter === "ALL" || row.result === filter) &&
    `${row.storefront_orders?.order_no ?? ""} ${row.payment_ref} ${row.transaction_id ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const name = (value: string) => ({ ALL: bi("Semua", "All"), REVIEW: bi("Perlu ditinjau", "Needs review"), FAILED: bi("Gagal diperiksa", "Check failed"), PENDING: bi("Menunggu", "Pending"), MATCHED: bi("Cocok", "Matched") }[value] ?? value);
  const time = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value)) + " WIB" : bi("Tidak tersedia", "Unavailable");

  async function run(orderId?: string) {
    if (orderId) setActive(orderId); else setRunning(true);
    try {
      const outcome = await check({ data: { orderId } });
      await qc.invalidateQueries({ queryKey: ["admin-reconciliations"] });
      await qc.invalidateQueries({ queryKey: ["admin-storefront-orders"] });
      toast.success(orderId ? bi("Transaksi diperiksa.", "Transaction checked.") :
        bi(`Pemeriksaan selesai: ${"checked" in outcome ? outcome.checked : 1} transaksi.`, `Check complete: ${"checked" in outcome ? outcome.checked : 1} transactions.`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : bi("Pemeriksaan gagal.", "Check failed."));
    } finally { setRunning(false); setActive(null); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
      <div><h2 className="font-display text-xl text-ink">{bi("Rekonsiliasi Midtrans", "Midtrans reconciliation")}</h2>
        <p className="mt-1 text-sm text-ash">{bi("Bandingkan transaksi yang tercatat pada pesanan dengan status Midtrans.", "Compare recorded order transactions against Midtrans.")}</p></div>
      <Button variant="outline" disabled={running} onClick={() => void run()}>{running ? bi("Memeriksa…", "Checking…") : bi("Periksa sekarang", "Check now")}</Button>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <input aria-label={bi("Cari pesanan atau transaksi", "Search order or transaction")} placeholder={bi("Cari nomor pesanan atau transaksi", "Search order or transaction")}
        value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-crimson sm:max-w-xs" />
      <select aria-label={bi("Filter hasil", "Filter results")} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="border border-line bg-card px-3 py-2 text-sm text-ink">
        {states.map((s) => <option key={s} value={s}>{name(s)}</option>)}
      </select>
    </div>
    {isPending ? <p className="text-sm text-ash">{bi("Memuat pemeriksaan…", "Loading checks…")}</p> : error ? <p role="alert" className="text-sm text-crimson">{bi("Hasil belum dapat dimuat. Coba lagi.", "Could not load checks. Please retry.")}</p> :
      filtered.length === 0 ? <Panel className="p-8 text-center text-sm text-ash">{bi("Belum ada hasil. Tekan Periksa sekarang untuk memulai.", "No results yet. Select Check now to start.")}</Panel> :
      <div className="divide-y divide-line border-y border-line">{filtered.map((row) => {
        const difference = row.gateway_amount === null ? null : Number(row.gateway_amount) - Number(row.order_amount);
        const paid = row.storefront_orders?.paid_at;
        return <details key={row.order_id} className="group py-4">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-5 gap-y-2 text-sm marker:hidden">
            <span className="min-w-36 font-display text-base text-ink">{row.storefront_orders?.order_no}</span>
            <span className={`px-2 py-1 text-xs ${row.result === "REVIEW" || row.result === "FAILED" ? "bg-crimson/10 text-crimson" : "bg-ink/5 text-ink"}`}>{name(row.result)}</span>
            <span className="text-ash">{bi("Pesanan", "Order")}: {formatIdr(Number(row.order_amount))} · Midtrans: {row.gateway_amount === null ? "—" : formatIdr(Number(row.gateway_amount))}</span>
            <span className="ml-auto text-xs text-ash">{time(row.checked_at)} <span aria-hidden="true">⌄</span></span>
          </summary>
          <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div><p className="text-xs text-ash">{bi("Status pesanan / Midtrans", "Order / Midtrans status")}</p><p className="text-ink">{row.order_status} / {row.gateway_status ?? "—"}</p></div>
            <div><p className="text-xs text-ash">{bi("Selisih jumlah", "Amount difference")}</p><p className="text-ink">{difference === null ? "—" : formatIdr(difference)}</p></div>
            <div><p className="text-xs text-ash">{bi("ID transaksi", "Transaction ID")}</p><p className="break-all text-ink">{row.transaction_id ?? "—"}</p></div>
            <div><p className="text-xs text-ash">{bi("Dibuat di Midtrans", "Created at Midtrans")}</p><p className="text-ink">{time(row.transaction_time)}</p></div>
            <div><p className="text-xs text-ash">{bi("Dibayar di Midtrans / pesanan", "Paid at Midtrans / order")}</p><p className="text-ink">{time(row.settlement_time)} / {time(paid)}</p></div>
            <div><p className="text-xs text-ash">{bi("Selisih waktu pembayaran", "Payment time difference")}</p><p className="text-ink">{paid && row.settlement_time ? `${Math.round((new Date(paid).getTime() - new Date(row.settlement_time).getTime()) / 60000)} ${bi("menit", "minutes")}` : "—"}</p></div>
            {row.reason && <p className="text-crimson sm:col-span-2 lg:col-span-3">{row.reason}</p>}
            <div className="sm:col-span-2 lg:col-span-3"><Button variant="outline" size="sm" disabled={active === row.order_id} onClick={() => void run(row.order_id)}>{active === row.order_id ? bi("Memeriksa…", "Checking…") : bi("Periksa ulang", "Recheck")}</Button></div>
          </div>
        </details>;
      })}</div>}
  </div>;
}