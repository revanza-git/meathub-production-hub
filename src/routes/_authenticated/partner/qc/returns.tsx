import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listPendingReturns, qcDecide } from "@/lib/fulfillment.functions";

export const Route = createFileRoute("/_authenticated/partner/qc/returns")({
  head: () => ({ meta: [{ title: "QC Returns — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: QcReturnsPage,
});

type ReturnRow = {
  id: string;
  return_number: string;
  status: string;
  reason_code: string;
  description: string | null;
  created_at: string;
  order: { order_no: string } | null;
};

function QcReturnsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingReturns);
  const decideFn = useServerFn(qcDecide);
  const { data } = useQuery({ queryKey: ["qc-returns"], queryFn: () => listFn() as Promise<ReturnRow[]> });

  const decideMut = useMutation({
    mutationFn: (v: { return_id: string; decision: "APPROVE_FULL"|"APPROVE_PARTIAL"|"REJECT"; notes: string }) => decideFn({ data: v }),
    onSuccess: () => { toast.success("Keputusan tersimpan"); qc.invalidateQueries({ queryKey: ["qc-returns"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="QC Returns" subtitle="Inspeksi & keputusan retur">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {(data ?? []).map((r) => (
          <ReturnCard key={r.id} r={r} onDecide={(decision, notes) => decideMut.mutate({ return_id: r.id, decision, notes })} />
        ))}
        {data && data.length === 0 ? <div className="text-sm text-muted-foreground">Tidak ada retur pending.</div> : null}
      </div>
    </AppShell>
  );
}

function ReturnCard({ r, onDecide }: { r: ReturnRow; onDecide: (decision: "APPROVE_FULL"|"APPROVE_PARTIAL"|"REJECT", notes: string) => void }) {
  const [decision, setDecision] = useState<"APPROVE_FULL"|"APPROVE_PARTIAL"|"REJECT">("APPROVE_FULL");
  const [notes, setNotes] = useState("");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{r.return_number} · Order {r.order?.order_no ?? "—"}</CardTitle>
          <Badge variant="outline">{r.status}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(r.created_at).toLocaleString("id-ID")} · {r.reason_code}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {r.description ? <div className="text-sm">{r.description}</div> : null}
        <Select value={decision} onValueChange={(v) => setDecision(v as typeof decision)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="APPROVE_FULL">Setujui penuh</SelectItem>
            <SelectItem value="APPROVE_PARTIAL">Setujui sebagian</SelectItem>
            <SelectItem value="REJECT">Tolak</SelectItem>
          </SelectContent>
        </Select>
        <Textarea placeholder="Catatan QC (wajib min 3 karakter)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={() => onDecide(decision, notes)} disabled={notes.trim().length < 3}>Simpan keputusan</Button>
      </CardContent>
    </Card>
  );
}
