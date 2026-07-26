import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { getOrderDetail, cancelOrder } from "@/lib/orders.functions";
import { getFulfillmentByOrder, listMyReturns, requestReturn } from "@/lib/fulfillment.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";


export const Route = createFileRoute("/_authenticated/buyer/orders/$id")({
  head: () => ({ meta: [{ title: "Detail pesanan — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: OrderDetailPage,
});

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

function OrderDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const detail = useServerFn(getOrderDetail);
  const cancel = useServerFn(cancelOrder);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => detail({ data: { order_id: id } }),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancel({ data: { order_id: id, reason } }),
    onSuccess: () => {
      toast.success("Order dibatalkan");
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const order = data?.order as
    | {
        order_no: string;
        status: string;
        subtotal: number;
        shipping_fee: number;
        tax_amount: number;
        total_amount: number;
        total_kg: number;
        notes: string | null;
        placed_at: string;
        address: { label: string; address_line: string; city: string; service_zone: string | null } | null;
      }
    | undefined;
  const items = data?.items ?? [];
  const history = data?.history ?? [];
  const cancellable = order && !["FULFILLING", "DELIVERED", "CLOSED", "CANCELLED"].includes(order.status);

  return (
    <AppShell title="SBMEAT" subtitle="Detail pesanan">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <Link to="/buyer/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Link>
        {isLoading ? <div className="text-sm text-muted-foreground">Memuat…</div> : null}
        {order ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{order.order_no}</CardTitle>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.placed_at).toLocaleString("id-ID")}
                    </div>
                  </div>
                  <Badge variant="outline">{order.status.replaceAll("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.address ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alamat</div>
                    <div>{order.address.label} — {order.address.address_line}, {order.address.city} ({order.address.service_zone ?? "?"})</div>
                  </div>
                ) : null}
                {order.notes ? <div className="text-muted-foreground">Catatan: {order.notes}</div> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Item</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {items.map((it) => (
                    <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <div className="font-medium">{it.product?.name ?? "Produk"}</div>
                        <div className="text-xs text-muted-foreground">
                          {it.vendor?.display_name} · {Number(it.qty_kg).toFixed(2)} kg × {fmt(it.unit_price)}
                          {it.vendor_reject_reason ? ` · Alasan: ${it.vendor_reject_reason}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={it.vendor_status === "REJECTED" ? "destructive" : it.vendor_status === "CONFIRMED" ? "default" : "secondary"}>
                          {it.vendor_status}
                        </Badge>
                        <div className="w-28 text-right font-semibold">{fmt(it.line_total)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Ringkasan</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label="Subtotal" value={fmt(order.subtotal)} />
                <Row label="Ongkir" value={fmt(order.shipping_fee)} />
                <Row label="PPN 11%" value={fmt(order.tax_amount)} />
                <Row label="Berat" value={`${Number(order.total_kg).toFixed(2)} kg`} />
                <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
                  <span>Total</span><span>{fmt(order.total_amount)}</span>
                </div>
              </CardContent>
            </Card>

            {cancellable ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Batalkan pesanan</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap items-end gap-2">
                  <Input
                    placeholder="Alasan pembatalan (min 3 karakter)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-w-[240px] flex-1"
                  />
                  <Button
                    variant="destructive"
                    disabled={reason.trim().length < 3 || cancelMut.isPending}
                    onClick={() => cancelMut.mutate()}
                  >
                    {cancelMut.isPending ? "Membatalkan…" : "Batalkan"}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader><CardTitle className="text-base">Riwayat status</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {history.map((h) => (
                    <li key={h.id} className="text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("id-ID")} — {h.from_state ?? "—"} → <span className="text-foreground">{h.to_state}</span>
                      {h.reason ? ` · ${h.reason}` : ""}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>
  );
}
