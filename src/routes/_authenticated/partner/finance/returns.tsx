import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listReturnsForFinance, processReturnRefund, closeReturn } from "@/lib/returns.functions";

export const Route = createFileRoute("/_authenticated/partner/finance/returns")({
  head: () => ({ meta: [{ title: "Refund Retur — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: FinanceReturnsPage,
});

type Row = {
  id: string;
  return_number: string;
  order_id: string;
  status: string;
  reason_code: string;
  description: string | null;
  resolution: string | null;
  resolved_at: string | null;
  requested_at: string;
  orders: { order_no: string; total_amount: number } | null;
};

function FinanceReturnsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listReturnsForFinance);
  const refundFn = useServerFn(processReturnRefund);
  const closeFn = useServerFn(closeReturn);
  const { data } = useQuery({ queryKey: ["finance-returns"], queryFn: () => listFn() as Promise<Row[]> });

  const refundMut = useMutation({
    mutationFn: (v: Parameters<typeof refundFn>[0]["data"]) => refundFn({ data: v }),
    onSuccess: () => { toast.success("Refund diposting"); qc.invalidateQueries({ queryKey: ["finance-returns"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMut = useMutation({
    mutationFn: (v: { return_id: string; resolution: string }) => closeFn({ data: v }),
    onSuccess: () => { toast.success("Retur ditutup"); qc.invalidateQueries({ queryKey: ["finance-returns"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Refund Retur" subtitle="Posting refund untuk retur yang disetujui QC">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {(data ?? []).map((r) => (
          <ReturnRefundCard
            key={r.id}
            r={r}
            onRefund={(v) => refundMut.mutate({ return_id: r.id, ...v })}
            onClose={(resolution) => closeMut.mutate({ return_id: r.id, resolution })}
          />
        ))}
        {data && data.length === 0 ? (
          <div className="text-sm text-muted-foreground">Belum ada retur yang siap diproses.</div>
        ) : null}
      </div>
    </AppShell>
  );
}

function ReturnRefundCard({
  r,
  onRefund,
  onClose,
}: {
  r: Row;
  onRefund: (v: { amount: number; method: "BANK_TRANSFER"|"VIRTUAL_ACCOUNT"|"CASH"|"OTHER"; reference?: string; notes?: string }) => void;
  onClose: (resolution: string) => void;
}) {
  const [amount, setAmount] = useState<string>(r.orders?.total_amount ? String(r.orders.total_amount) : "");
  const [method, setMethod] = useState<"BANK_TRANSFER"|"VIRTUAL_ACCOUNT"|"CASH"|"OTHER">("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [closing, setClosing] = useState(false);
  const [resolution, setResolution] = useState("");

  const finalized = r.status === "REFUNDED" || r.status === "CLOSED";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{r.return_number} · Order {r.orders?.order_no ?? "—"}</CardTitle>
          <Badge variant={finalized ? "secondary" : "outline"}>{r.status}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(r.requested_at).toLocaleString("id-ID")} · {r.reason_code}
          {r.orders?.total_amount ? ` · Total order Rp${Number(r.orders.total_amount).toLocaleString("id-ID")}` : ""}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {r.description ? <div className="text-sm">{r.description}</div> : null}
        {r.resolution ? <div className="text-xs text-muted-foreground">Resolusi: {r.resolution}</div> : null}

        {!finalized && r.status === "APPROVED" ? (
          <>
            {!closing ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Jumlah refund (Rp)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="VIRTUAL_ACCOUNT">Virtual Account</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="OTHER">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Referensi (nomor transfer/VA)" value={reference} onChange={(e) => setReference(e.target.value)} />
                <Textarea placeholder="Catatan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <div className="flex gap-2">
                  <Button
                    onClick={() => onRefund({ amount: Number(amount), method, reference: reference || undefined, notes: notes || undefined })}
                    disabled={!(Number(amount) > 0)}
                  >
                    Posting refund
                  </Button>
                  <Button variant="outline" onClick={() => setClosing(true)}>Tutup tanpa refund</Button>
                </div>
              </>
            ) : (
              <>
                <Textarea placeholder="Catatan penutupan (min 3 karakter)" value={resolution} onChange={(e) => setResolution(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={() => onClose(resolution)} disabled={resolution.trim().length < 3}>Tutup retur</Button>
                  <Button variant="ghost" onClick={() => setClosing(false)}>Batal</Button>
                </div>
              </>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
