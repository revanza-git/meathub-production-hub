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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  listInvoices,
  listDeliveredOrdersForInvoicing,
  issueInvoice,
  recordPayment,
} from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/partner/finance/invoices")({
  head: () => ({ meta: [
    { title: "Invoice pembeli — MEATHUB" },
    { name: "description", content: "Terbitkan invoice dan catat pembayaran pembeli." },
    { name: "robots", content: "noindex" },
  ] }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const listFn = useServerFn(listInvoices);
  const pendingFn = useServerFn(listDeliveredOrdersForInvoicing);
  const issueFn = useServerFn(issueInvoice);
  const payFn = useServerFn(recordPayment);
  const qc = useQueryClient();

  const invoices = useQuery({ queryKey: ["invoices"], queryFn: () => listFn({ data: {} }) });
  const pending = useQuery({ queryKey: ["invoices-pending"], queryFn: () => pendingFn() });

  const issueMut = useMutation({
    mutationFn: (order_id: string) => issueFn({ data: { order_id } }),
    onSuccess: () => { toast.success("Invoice diterbitkan"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Invoice pembeli" subtitle="Terbitkan & catat pembayaran">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order siap diterbitkan invoice</CardTitle>
            <CardDescription>Order DELIVERED yang belum punya invoice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.data?.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada order menunggu.</p>}
            {pending.data?.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <div>
                  <div className="font-mono">{o.order_no}</div>
                  <div className="text-xs text-muted-foreground">
                    {(o.buyer as { display_name: string } | null)?.display_name} · Rp{Number(o.total_amount).toLocaleString("id-ID")}
                  </div>
                </div>
                <Button size="sm" disabled={issueMut.isPending} onClick={() => issueMut.mutate(o.id)}>
                  Terbitkan invoice
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Semua invoice</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invoices.data?.map((inv) => (
              <InvoiceRow key={inv.id} inv={inv} onPay={(payload) => payFn({ data: payload }).then(() => { toast.success("Pembayaran dicatat"); qc.invalidateQueries(); }).catch((e: Error) => toast.error(e.message))} />
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function InvoiceRow({ inv, onPay }: { inv: any; onPay: (p: { invoice_id: string; amount: number; method: "BANK_TRANSFER"|"VA"|"CASH"|"OTHER"; reference?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(Number(inv.total_amount) - Number(inv.amount_paid)));
  const [method, setMethod] = useState<"BANK_TRANSFER"|"VA"|"CASH"|"OTHER">("BANK_TRANSFER");
  const [ref, setRef] = useState("");

  return (
    <div className="rounded border p-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono">{inv.invoice_no}</div>
          <div className="text-xs text-muted-foreground">
            {inv.buyer?.display_name} · Order {inv.order?.order_no} · Rp{Number(inv.total_amount).toLocaleString("id-ID")} · dibayar Rp{Number(inv.amount_paid).toLocaleString("id-ID")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={inv.status === "PAID" ? "default" : "outline"}>{inv.status}</Badge>
          {inv.status !== "PAID" && inv.status !== "VOID" && (
            <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>Catat pembayaran</Button>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <div><Label>Jumlah</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div>
            <Label>Metode</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="VA">Virtual Account</SelectItem>
                <SelectItem value="CASH">Tunai</SelectItem>
                <SelectItem value="OTHER">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Referensi</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="No. transaksi" /></div>
          <div className="flex items-end">
            <Button size="sm" onClick={() => onPay({ invoice_id: inv.id, amount: Number(amount), method, reference: ref || undefined })}>Simpan</Button>
          </div>
        </div>
      )}
    </div>
  );
}
