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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  listSpWarnings, listVendorReliability, listVendorOrgs,
  issueSpWarning, resolveSpWarning,
} from "@/lib/governance.functions";

export const Route = createFileRoute("/_authenticated/partner/admin/sp-warnings")({
  head: () => ({ meta: [
    { title: "SP Warnings — SBMEAT" },
    { name: "description", content: "Kelola surat peringatan (SP) vendor." },
    { name: "robots", content: "noindex" },
  ] }),
  component: SpWarningsPage,
});

type Sev = "SP1"|"SP2"|"SP3"|"SP4"|"SP5";
type Cat = "ORDER_REJECTION"|"LATE_DISPATCH"|"QC_FAIL"|"RETURN_VENDOR_FAULT"|"DOCUMENT_MISSING"|"POLICY_VIOLATION"|"OTHER";

function SpWarningsPage() {
  const listFn = useServerFn(listSpWarnings);
  const relFn = useServerFn(listVendorReliability);
  const orgsFn = useServerFn(listVendorOrgs);
  const issueFn = useServerFn(issueSpWarning);
  const resolveFn = useServerFn(resolveSpWarning);
  const qc = useQueryClient();

  const warnings = useQuery({ queryKey: ["sp-warnings"], queryFn: () => listFn({ data: {} }) });
  const reliability = useQuery({ queryKey: ["vendor-reliability"], queryFn: () => relFn() });
  const vendors = useQuery({ queryKey: ["vendor-orgs"], queryFn: () => orgsFn() });

  const [vendorId, setVendorId] = useState("");
  const [sev, setSev] = useState<Sev>("SP2");
  const [cat, setCat] = useState<Cat>("LATE_DISPATCH");
  const [reason, setReason] = useState("");

  const issueMut = useMutation({
    mutationFn: () => issueFn({ data: { vendor_id: vendorId, severity: sev, category: cat, reason } }),
    onSuccess: () => { toast.success("SP diterbitkan"); setReason(""); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="SP Warnings" subtitle="Vendor reliability & sanksi">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terbitkan SP baru</CardTitle>
            <CardDescription>SP1 (ringan) hingga SP5 (skorsing).</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="Pilih vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.data?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={sev} onValueChange={(v) => setSev(v as Sev)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["SP1","SP2","SP3","SP4","SP5"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={cat} onValueChange={(v) => setCat(v as Cat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORDER_REJECTION">Order Rejection</SelectItem>
                  <SelectItem value="LATE_DISPATCH">Late Dispatch</SelectItem>
                  <SelectItem value="QC_FAIL">QC Fail</SelectItem>
                  <SelectItem value="RETURN_VENDOR_FAULT">Return - Vendor Fault</SelectItem>
                  <SelectItem value="DOCUMENT_MISSING">Document Missing</SelectItem>
                  <SelectItem value="POLICY_VIOLATION">Policy Violation</SelectItem>
                  <SelectItem value="OTHER">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4">
              <Label>Alasan</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
            <div className="md:col-span-4">
              <Button
                size="sm"
                disabled={!vendorId || reason.trim().length < 3 || issueMut.isPending}
                onClick={() => issueMut.mutate()}
              >Terbitkan SP</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Reliability score vendor</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reliability.data?.map((r: any) => (
              <div key={r.vendor_id} className="flex items-center justify-between rounded border p-2 text-sm">
                <div>{r.display_name}</div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{r.active_warnings} aktif</Badge>
                  <span className={`font-mono ${Number(r.reliability_score) < 60 ? "text-destructive" : ""}`}>
                    {r.reliability_score}/100
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Riwayat SP</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {warnings.data?.map((w: any) => (
              <div key={w.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={w.resolved_at ? "outline" : "destructive"}>{w.severity}</Badge>
                      <span className="font-medium">{w.category}</span>
                      <span className="text-muted-foreground">· {w.vendor?.display_name}</span>
                    </div>
                    <div className="mt-1 text-xs">{w.reason}</div>
                    {w.order?.order_no && <div className="text-xs text-muted-foreground">Order {w.order.order_no}</div>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{new Date(w.issued_at).toLocaleString("id-ID")}</div>
                    {w.resolved_at ? (
                      <Badge variant="secondary">Resolved</Badge>
                    ) : (
                      <ResolveInline onResolve={(notes) => resolveFn({ data: { id: w.id, notes } }).then(() => { toast.success("Resolved"); qc.invalidateQueries(); }).catch((e: Error) => toast.error(e.message))} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function ResolveInline({ onResolve }: { onResolve: (notes: string) => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  if (!open) return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Resolve</Button>;
  return (
    <div className="mt-1 flex items-end gap-2">
      <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8 w-40" placeholder="Catatan" />
      <Button size="sm" disabled={notes.trim().length < 3} onClick={() => onResolve(notes)}>Simpan</Button>
    </div>
  );
}
