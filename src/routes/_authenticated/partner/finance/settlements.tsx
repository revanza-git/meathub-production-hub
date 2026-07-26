import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  listSettlements,
  generateSettlements,
  approveSettlement,
  markSettlementPaid,
  getSettlementDetail,
} from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/partner/finance/settlements")({
  head: () => ({ meta: [
    { title: "Settlement vendor — SBMEAT" },
    { name: "description", content: "Generate, review, dan tandai lunas payout vendor." },
    { name: "robots", content: "noindex" },
  ] }),
  component: SettlementsPage,
});

function SettlementsPage() {
  const listFn = useServerFn(listSettlements);
  const genFn = useServerFn(generateSettlements);
  const approveFn = useServerFn(approveSettlement);
  const payFn = useServerFn(markSettlementPaid);
  const detailFn = useServerFn(getSettlementDetail);
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ["settlements"], queryFn: () => listFn({ data: {} }) });
  const [expanded, setExpanded] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["settlement", expanded],
    queryFn: () => detailFn({ data: { id: expanded! } }),
    enabled: !!expanded,
  });

  const genMut = useMutation({
    mutationFn: () => genFn({ data: {} }),
    onSuccess: (r) => { toast.success(`${r.created} settlement dibuat`); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Settlement vendor" subtitle="Payout T+3 kalender · komisi 5%">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate settlement</CardTitle>
            <CardDescription>
              Kumpulkan order DELIVERED yang lebih dari 3 hari & belum di-settle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" disabled={genMut.isPending} onClick={() => genMut.mutate()}>
              {genMut.isPending ? "Memproses…" : "Generate sekarang"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Daftar settlement</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {list.data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada.</p>}
            {list.data?.map((s: any) => (
              <div key={s.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono">{s.settlement_no}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.vendor?.display_name} · {s.period_start} → {s.period_end} · Net Rp{Number(s.net_amount).toLocaleString("id-ID")} (dari Rp{Number(s.gross_amount).toLocaleString("id-ID")}, komisi {(Number(s.commission_rate)*100).toFixed(1)}%)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === "PAID" ? "default" : "outline"}>{s.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                      {expanded === s.id ? "Tutup" : "Detail"}
                    </Button>
                    {s.status === "DRAFT" && (
                      <Button size="sm" onClick={() => approveFn({ data: { id: s.id } }).then(() => { toast.success("Disetujui"); qc.invalidateQueries(); }).catch((e: Error) => toast.error(e.message))}>Approve</Button>
                    )}
                    {s.status === "APPROVED" && <PayInline id={s.id} onPay={(reference) => payFn({ data: { id: s.id, reference } }).then(() => { toast.success("Ditandai lunas"); qc.invalidateQueries(); }).catch((e: Error) => toast.error(e.message))} />}
                  </div>
                </div>
                {expanded === s.id && detail.data?.settlement.id === s.id && (
                  <div className="mt-3 space-y-1 border-t pt-2">
                    {detail.data.items.map((it: any) => (
                      <div key={it.id} className="flex justify-between text-xs">
                        <span className="font-mono">{it.order?.order_no}</span>
                        <span>Rp{Number(it.line_gross).toLocaleString("id-ID")} → net Rp{Number(it.line_net).toLocaleString("id-ID")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function PayInline({ id: _id, onPay }: { id: string; onPay: (ref: string) => void }) {
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Tandai lunas</Button>;
  return (
    <div className="flex items-end gap-2">
      <div><Label className="text-xs">Referensi</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} className="h-8 w-40" /></div>
      <Button size="sm" disabled={ref.trim().length < 3} onClick={() => onPay(ref)}>Simpan</Button>
    </div>
  );
}
