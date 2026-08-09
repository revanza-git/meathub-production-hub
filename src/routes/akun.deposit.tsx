import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { MarketLayout } from "@/components/market/market-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { rupiah, tanggalJam } from "@/lib/market/format";
import { getConfig } from "@/lib/market/pricing";
import {
  balance,
  listEntries,
  listWithdrawals,
  topUp,
  requestWithdrawal,
  WITHDRAWAL_TONE,
} from "@/lib/market/deposit";

export const Route = createFileRoute("/akun/deposit")({
  head: () => ({
    meta: [
      { title: "Deposit & Saldo — MEATHUB" },
      { name: "description", content: "Top-up deposit, pantau mutasi saldo, dan ajukan penarikan dana MEATHUB." },
      { property: "og:title", content: "Deposit & Saldo — MEATHUB" },
      { property: "og:description", content: "Top-up deposit, mutasi saldo, dan penarikan dana." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DepositPage,
});

function DepositPage() {
  const config = getConfig();
  const [tick, setTick] = useState(0);
  const [amount, setAmount] = useState(String(config.depositMinTopUp));
  const [wdAmount, setWdAmount] = useState("");
  const [bank, setBank] = useState("BCA 5271 8890 41 — PT Boga Rasa Nusantara");
  const refresh = () => setTick((t) => t + 1);

  const saldo = tick >= 0 ? balance() : 0;
  const entries = listEntries();
  const withdrawals = listWithdrawals();

  return (
    <MarketLayout>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold text-ink">Deposit & saldo</h1>
        <p className="text-sm text-muted-foreground">
          Saldo dipakai untuk auto-cut pembayaran CBD. Sisa saldo dapat ditarik kapan saja setelah disetujui admin.
        </p>

        <div className="mt-5 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-maroon" aria-hidden="true" />
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Saldo tersedia</div>
              <div className="font-display text-3xl font-bold text-maroon">{rupiah(saldo)}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-1 font-semibold text-ink">Top-up deposit</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Minimum top-up {rupiah(config.depositMinTopUp)}. Dana masuk instan pada mode demo.
            </p>
            <Label htmlFor="topup" className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Nominal
            </Label>
            <Input id="topup" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button
              className="mt-3 w-full"
              onClick={() => {
                const n = Number(amount);
                if (!Number.isFinite(n) || n < config.depositMinTopUp) {
                  toast.error(`Minimum top-up ${rupiah(config.depositMinTopUp)}`);
                  return;
                }
                topUp(n, "VA-DEMO");
                toast.success(`Top-up ${rupiah(n)} berhasil.`);
                refresh();
              }}
            >
              Top-up sekarang
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-1 font-semibold text-ink">Tarik saldo</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Tidak ada batas minimum penarikan. Setiap permintaan menunggu persetujuan admin.
            </p>
            <Label htmlFor="wd" className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Nominal
            </Label>
            <Input id="wd" inputMode="numeric" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} />
            <Label htmlFor="bank" className="mb-1 mt-2 block text-xs uppercase tracking-widest text-muted-foreground">
              Rekening tujuan
            </Label>
            <Input id="bank" value={bank} onChange={(e) => setBank(e.target.value)} />
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => {
                const n = Number(wdAmount);
                if (!Number.isFinite(n) || n <= 0) {
                  toast.error("Isi nominal penarikan yang valid.");
                  return;
                }
                if (n > saldo) {
                  toast.error("Nominal melebihi saldo tersedia.");
                  return;
                }
                requestWithdrawal(n, bank);
                setWdAmount("");
                toast.success("Permintaan penarikan dikirim, menunggu persetujuan admin.");
                refresh();
              }}
            >
              Ajukan penarikan
            </Button>
          </section>
        </div>

        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold text-ink">Permintaan penarikan</h2>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada permintaan penarikan.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {withdrawals.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">{rupiah(w.amount)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {w.bankAccount} · {tanggalJam(w.requestedAt)}
                    </span>
                  </span>
                  <Badge variant="outline" className={`shrink-0 ${WITHDRAWAL_TONE[w.status]}`}>
                    {w.status.replaceAll("_", " ").toLowerCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold text-ink">Mutasi saldo</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada mutasi.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {entries.map((e) => {
                const masuk = e.amount > 0;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      {masuk ? (
                        <ArrowDownCircle className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 shrink-0 text-maroon" aria-hidden="true" />
                      )}
                      <span className="min-w-0">
                        <span className="block text-ink">{e.description}</span>
                        <span className="block text-xs text-muted-foreground">{tanggalJam(e.at)}</span>
                      </span>
                    </span>
                    <span className={`shrink-0 font-medium ${masuk ? "text-success" : "text-ink"}`}>
                      {masuk ? "+" : "−"} {rupiah(Math.abs(e.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </MarketLayout>
  );
}
