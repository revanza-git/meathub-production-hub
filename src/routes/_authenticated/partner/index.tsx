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
            <CardContent>
              <Link to="/partner/admin/orgs">
                <Button size="sm">Buka antrian review</Button>
              </Link>
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
              <Link to="/onboarding"><Button size="sm" variant="outline">Kelola onboarding</Button></Link>
            </CardContent>

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
