import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getMyRoleContext } from "@/lib/roles.functions";
import { listVendorFulfillments, vendorDispatchToHub } from "@/lib/fulfillment.functions";

export const Route = createFileRoute("/_authenticated/partner/vendor/fulfillments")({
  head: () => ({ meta: [{ title: "Fulfillment vendor — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: VendorFulfillmentsPage,
});

function VendorFulfillmentsPage() {
  const qc = useQueryClient();
  const roleFn = useServerFn(getMyRoleContext);
  const listFn = useServerFn(listVendorFulfillments);
  const dispatchFn = useServerFn(vendorDispatchToHub);
  const { data: role } = useQuery({ queryKey: ["role-ctx"], queryFn: () => roleFn() });
  const vendorOrgs = (role?.memberships ?? []).filter((m) => m.org_type === "VENDOR");
  const [vendorId, setVendorId] = useState<string>("");
  const active = vendorId || vendorOrgs[0]?.org_id || "";

  const { data: rows } = useQuery({
    queryKey: ["vendor-fulfillments", active],
    queryFn: () => listFn({ data: { vendor_id: active } }),
    enabled: !!active,
  });

  const dispatchMut = useMutation({
    mutationFn: (fid: string) => dispatchFn({ data: { fulfillment_id: fid } }),
    onSuccess: () => { toast.success("Ditandai dikirim ke hub"); qc.invalidateQueries({ queryKey: ["vendor-fulfillments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Fulfillment" subtitle="Dispatch ke hub Kemayoran">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        {vendorOrgs.length > 1 ? (
          <Select value={active} onValueChange={setVendorId}>
            <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              {vendorOrgs.map((v) => <SelectItem key={v.org_id} value={v.org_id}>{v.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
        {(rows ?? []).map((f) => (
          <Card key={f.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Order {(f as { order: { order_no: string } }).order?.order_no ?? "—"}</CardTitle>
                <Badge variant="outline">{String(f.status).replaceAll("_"," ")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm">
              <div>
                <div>Deadline hub: {f.hub_deadline_at ? new Date(f.hub_deadline_at).toLocaleString("id-ID") : "—"}</div>
              </div>
              {f.status === "AWAITING_VENDOR_DISPATCH" ? (
                <Button size="sm" onClick={() => dispatchMut.mutate(f.id)} disabled={dispatchMut.isPending}>
                  Kirim ke hub
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {rows && rows.length === 0 ? <div className="text-sm text-muted-foreground">Belum ada fulfillment.</div> : null}
      </div>
    </AppShell>
  );
}
