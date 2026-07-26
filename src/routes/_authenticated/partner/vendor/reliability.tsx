import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listSpWarnings, listVendorReliability } from "@/lib/governance.functions";
import { getMyRoles } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/partner/vendor/reliability")({
  head: () => ({ meta: [
    { title: "Reliability saya — MEATHUB" },
    { name: "description", content: "Skor reliability & riwayat SP vendor." },
    { name: "robots", content: "noindex" },
  ] }),
  component: ReliabilityPage,
});

function ReliabilityPage() {
  const rolesFn = useServerFn(getMyRoles);
  const listFn = useServerFn(listSpWarnings);
  const relFn = useServerFn(listVendorReliability);

  const roles = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });
  const vendorOrgIds = (roles.data?.memberships ?? [])
    .filter((m) => ["vendor_admin","vendor_operator"].includes(m.role))
    .map((m) => m.organization_id);

  const warnings = useQuery({ queryKey: ["my-sp"], queryFn: () => listFn({ data: {} }) });
  const reliability = useQuery({ queryKey: ["my-reliability"], queryFn: () => relFn() });

  const myRel = (reliability.data ?? []).filter((r: any) => vendorOrgIds.includes(r.vendor_id));

  return (
    <AppShell title="Reliability saya" subtitle="Kesehatan performa vendor">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skor reliability</CardTitle>
            <CardDescription>100 = sempurna. Score turun setiap SP aktif.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {myRel.map((r: any) => (
              <div key={r.vendor_id} className="flex items-center justify-between rounded border p-3 text-sm">
                <div>
                  <div className="font-medium">{r.display_name}</div>
                  <div className="text-xs text-muted-foreground">{r.active_warnings} SP aktif</div>
                </div>
                <div className={`text-xl font-semibold ${Number(r.reliability_score) < 60 ? "text-destructive" : ""}`}>
                  {r.reliability_score}
                </div>
              </div>
            ))}
            {myRel.length === 0 && <p className="text-sm text-muted-foreground">Belum ada data.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Riwayat SP</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {warnings.data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada SP. Bagus!</p>}
            {warnings.data?.map((w: any) => (
              <div key={w.id} className="rounded border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={w.resolved_at ? "outline" : "destructive"}>{w.severity}</Badge>
                  <span className="font-medium">{w.category}</span>
                  {w.resolved_at && <Badge variant="secondary">Resolved</Badge>}
                </div>
                <div className="mt-1 text-xs">{w.reason}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(w.issued_at).toLocaleString("id-ID")}
                  {w.order?.order_no && ` · Order ${w.order.order_no}`}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
