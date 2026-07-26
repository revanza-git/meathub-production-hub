import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/buyer/")({
  head: () => ({
    meta: [
      { title: "Beranda Pembeli — SBMEAT" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BuyerHome,
});

function BuyerHome() {
  return (
    <AppShell title="SBMEAT" subtitle="Beranda pembeli">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Selamat datang</CardTitle>
            <CardDescription>
              Beranda pembeli — pencarian, kategori, saldo deposit, dan antrian aktif akan
              diisi di Phase 3.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
