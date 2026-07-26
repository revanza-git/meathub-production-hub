import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyRoles } from "@/lib/roles.functions";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partner/")({
  head: () => ({
    meta: [
      { title: "Partner Portal — SBMEAT" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnerDashboard,
});

function PartnerDashboard() {
  const rolesFn = useServerFn(getMyRoles);
  const { data } = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });
  const isAdmin = data?.memberships.some((m) => m.role === "platform_admin");
  const vendorOrgs = (data?.memberships ?? []).filter((m) =>
    ["vendor_admin", "vendor_operator"].includes(m.role),
  );
  const isHub = data?.memberships.some((m) => m.role === "hub_operator");
  const isCourier = data?.memberships.some((m) => m.role === "courier");
  const isQc = data?.memberships.some((m) => m.role === "qc_officer");
  const isFinance = data?.memberships.some((m) => ["finance_operator","platform_admin"].includes(m.role));


  return (
    <AppShell title="SBMEAT Partner" subtitle="Vendor & Ops portal">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {isAdmin ? (
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" /> Admin — Review KYB Organisasi
              </CardTitle>
              <CardDescription>
                Setujui / tolak pendaftaran organisasi pembeli & vendor.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link to="/partner/admin/orgs"><Button size="sm">Antrian review organisasi</Button></Link>
              <Link to="/partner/admin/catalog"><Button size="sm" variant="secondary">Katalog & master data</Button></Link>
              <Link to="/partner/admin/sp-warnings"><Button size="sm" variant="secondary">SP warnings</Button></Link>
              <Link to="/partner/admin/flags"><Button size="sm" variant="secondary">Feature flags</Button></Link>
              <Link to="/partner/admin/audit"><Button size="sm" variant="outline">Audit log</Button></Link>
            </CardContent>

          </Card>
        ) : null}

        {vendorOrgs.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organisasi vendor Anda</CardTitle>
              <CardDescription>
                {vendorOrgs.map((v) => (
                  <span key={v.organization_id} className="mr-2 inline-flex items-center gap-1">
                    <strong>{v.organization.display_name}</strong>
                    <Badge variant="outline">{v.organization.status}</Badge>
                  </span>
                ))}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link to="/partner/vendor/offers"><Button size="sm">Kelola offers & inventory</Button></Link>
              <Link to="/partner/vendor/orders"><Button size="sm" variant="secondary">Order masuk</Button></Link>
              <Link to="/partner/vendor/fulfillments"><Button size="sm" variant="secondary">Fulfillment</Button></Link>
              <Link to="/partner/vendor/reliability"><Button size="sm" variant="secondary">Reliability & SP</Button></Link>
              <Link to="/onboarding"><Button size="sm" variant="outline">Kelola onboarding</Button></Link>
            </CardContent>
          </Card>
        ) : null}

        {isHub ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Hub Kemayoran</CardTitle></CardHeader>
            <CardContent><Link to="/partner/hub/inbound"><Button size="sm">Inbound & dispatch</Button></Link></CardContent>
          </Card>
        ) : null}
        {isCourier ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Kurir</CardTitle></CardHeader>
            <CardContent><Link to="/partner/courier/deliveries"><Button size="sm">Delivery saya</Button></Link></CardContent>
          </Card>
        ) : null}
        {isQc ? (
          <Card>
            <CardHeader><CardTitle className="text-base">QC</CardTitle></CardHeader>
            <CardContent><Link to="/partner/qc/returns"><Button size="sm">Antrian retur</Button></Link></CardContent>
          </Card>
        ) : null}
        {isFinance ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Finance</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link to="/partner/finance/invoices"><Button size="sm">Invoice pembeli</Button></Link>
              <Link to="/partner/finance/settlements"><Button size="sm" variant="secondary">Settlement vendor</Button></Link>
            </CardContent>
          </Card>
        ) : null}
        {vendorOrgs.length > 0 ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Payout vendor</CardTitle></CardHeader>
            <CardContent><Link to="/partner/vendor/payouts"><Button size="sm">Lihat settlement saya</Button></Link></CardContent>
          </Card>
        ) : null}



        <Card>
          <CardHeader>
            <CardTitle>Partner Dashboard</CardTitle>
            <CardDescription>
              Layar vendor, hub, courier, QC, finance, dan support akan diisi di phase
              berikutnya sesuai peran login Anda.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
