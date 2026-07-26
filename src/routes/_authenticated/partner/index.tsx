import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
  return (
    <AppShell title="SBMEAT Partner" subtitle="Vendor & Ops portal">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Partner Dashboard</CardTitle>
            <CardDescription>
              Layar vendor, hub, courier, QC, finance, support, dan admin akan diisi di phase
              berikutnya sesuai peran login Anda.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
