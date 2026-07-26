import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getMyRoles } from "@/lib/roles.functions";
import { listVendorOrderItems, decideOrderItem } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/partner/vendor/orders")({
  head: () => ({ meta: [{ title: "Order masuk — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: VendorOrdersPage,
});

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;
const VENDOR_ROLES = new Set(["vendor_admin", "vendor_operator"]);

function VendorOrdersPage() {
  const qc = useQueryClient();
  const rolesFn = useServerFn(getMyRoles);
  const listFn = useServerFn(listVendorOrderItems);
  const decideFn = useServerFn(decideOrderItem);
  const [vendorId, setVendorId] = useState<string>("");

  const rolesQ = useQuery({ queryKey: ["roles"], queryFn: () => rolesFn() });
  const vendorOrgs = (rolesQ.data?.memberships ?? []).filter((m) => VENDOR_ROLES.has(m.role));
  const activeVendor = vendorId || vendorOrgs[0]?.organization_id || "";

  const itemsQ = useQuery({
    queryKey: ["vendor-orders", activeVendor],
    enabled: !!activeVendor,
    queryFn: () => listFn({ data: { vendor_id: activeVendor } }),
  });

  const decideMut = useMutation({
    mutationFn: (v: { item_id: string; decision: "CONFIRM" | "REJECT"; reason?: string }) =>
      decideFn({ data: v }),
    onSuccess: () => {
      toast.success("Diperbarui");
      qc.invalidateQueries({ queryKey: ["vendor-orders", activeVendor] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="SBMEAT Vendor" subtitle="Order masuk">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {vendorOrgs.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Anda bukan anggota organisasi Vendor.</CardContent></Card>
        ) : (
          <>
            {vendorOrgs.length > 1 ? (
              <Select value={activeVendor} onValueChange={setVendorId}>
                <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vendorOrgs.map((v) => (
                    <SelectItem key={v.organization_id} value={v.organization_id}>{v.organization.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Line pesanan</CardTitle>
                <CardDescription>Konfirmasi atau tolak setiap line yang ditugaskan ke Anda.</CardDescription>
              </CardHeader>
              <CardContent>
                {itemsQ.isLoading ? <div className="text-sm text-muted-foreground">Memuat…</div> : null}
                {itemsQ.data && itemsQ.data.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Belum ada order masuk.</div>
                ) : null}
                <ul className="divide-y">
                  {(itemsQ.data ?? []).map((it) => (
                    <ItemRow key={it.id} item={it} onDecide={(d, r) => decideMut.mutate({ item_id: it.id, decision: d, reason: r })} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function ItemRow({
  item,
  onDecide,
}: {
  item: {
    id: string;
    product?: { name: string; sku: string } | null;
    qty_kg: number;
    unit_price: number;
    line_total: number;
    vendor_status: "PENDING" | "CONFIRMED" | "REJECTED";
    vendor_reject_reason: string | null;
  } & { order?: { order_no: string; placed_at: string; status: string } | null };
  onDecide: (d: "CONFIRM" | "REJECT", reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const order = (item as unknown as { order: { order_no: string; placed_at: string; status: string } | null }).order;
  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{item.product?.name ?? "Produk"} <span className="text-xs text-muted-foreground">({item.product?.sku})</span></div>
          <div className="text-xs text-muted-foreground">
            {order?.order_no} · {order ? new Date(order.placed_at).toLocaleString("id-ID") : ""} · {Number(item.qty_kg).toFixed(2)} kg × Rp {Number(item.unit_price).toLocaleString("id-ID")}
          </div>
          {item.vendor_reject_reason ? <div className="text-xs text-destructive">Ditolak: {item.vendor_reject_reason}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={item.vendor_status === "REJECTED" ? "destructive" : item.vendor_status === "CONFIRMED" ? "default" : "secondary"}>
            {item.vendor_status}
          </Badge>
          <div className="w-28 text-right font-semibold">{fmt(item.line_total)}</div>
        </div>
      </div>
      {item.vendor_status === "PENDING" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => onDecide("CONFIRM")}>Konfirmasi</Button>
          <Input
            placeholder="Alasan tolak (min 3)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="max-w-xs"
          />
          <Button size="sm" variant="destructive" disabled={reason.trim().length < 3} onClick={() => onDecide("REJECT", reason)}>
            Tolak
          </Button>
        </div>
      ) : null}
    </li>
  );
}
