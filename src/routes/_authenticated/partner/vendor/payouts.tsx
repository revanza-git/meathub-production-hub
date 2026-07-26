import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listSettlements } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/partner/vendor/payouts")({
  head: () => ({ meta: [
    { title: "Payout saya — MEATHUB" },
    { name: "description", content: "Riwayat settlement & payout vendor." },
    { name: "robots", content: "noindex" },
  ] }),
  component: PayoutsPage,
});

function PayoutsPage() {
  const listFn = useServerFn(listSettlements);
  const { data } = useQuery({ queryKey: ["my-settlements"], queryFn: () => listFn({ data: {} }) });

  return (
    <AppShell title="Payout saya" subtitle="Settlement dari MEATHUB">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat settlement</CardTitle>
            <CardDescription>Payout dijadwalkan T+3 hari setelah DELIVERED · komisi 5%.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada payout.</p>}
            {data?.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <div>
                  <div className="font-mono">{s.settlement_no}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.period_start} → {s.period_end} · Bruto Rp{Number(s.gross_amount).toLocaleString("id-ID")} · Komisi Rp{Number(s.commission_amount).toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">Rp{Number(s.net_amount).toLocaleString("id-ID")}</div>
                  <Badge variant={s.status === "PAID" ? "default" : "outline"}>{s.status}</Badge>
                  {s.payment_reference && <div className="text-xs text-muted-foreground">Ref: {s.payment_reference}</div>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
