import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listMyOrganizations } from "@/lib/orgs.functions";
import { MapPin, Building2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/buyer/")({
  head: () => ({
    meta: [
      { title: "Beranda Pembeli — MEATHUB" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BuyerHome,
});

function BuyerHome() {
  const listFn = useServerFn(listMyOrganizations);
  const { data } = useQuery({ queryKey: ["my-orgs"], queryFn: () => listFn() });
  const buyerOrgs = (data ?? []).filter((o) => o.type === "BUYER");
  const approved = buyerOrgs.filter((o) => o.status === "APPROVED");
  const pending = buyerOrgs.filter((o) => o.status !== "APPROVED");

  return (
    <AppShell title="MEATHUB" subtitle="Beranda pembeli">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {pending.length > 0 ? (
          <Card className="border-gold/50 bg-gold/10">
            <CardHeader>
              <CardTitle className="text-base">Organisasi menunggu persetujuan</CardTitle>
              <CardDescription>
                {pending.map((o) => (
                  <span key={o.id} className="mr-2 inline-flex items-center gap-1">
                    <strong>{o.display_name}</strong>
                    <Badge variant="outline">{o.status}</Badge>
                  </span>
                ))}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/onboarding">
                <Button size="sm" variant="secondary">Kelola onboarding</Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" /> Alamat pengiriman
              </CardTitle>
              <CardDescription>Kelola alamat & zona layanan.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/buyer/addresses">
                <Button size="sm">Buka alamat</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" /> Organisasi
              </CardTitle>
              <CardDescription>
                {approved.length > 0
                  ? `${approved.length} organisasi aktif`
                  : "Belum ada organisasi disetujui"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/onboarding">
                <Button size="sm" variant="outline">Onboarding</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" /> Cari produk & vendor
            </CardTitle>
            <CardDescription>
              Cari daging berdasarkan nama, tier, purchase type, dan zona layanan.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link to="/buyer/search"><Button size="sm">Mulai cari</Button></Link>
            <Link to="/buyer/cart"><Button size="sm" variant="secondary">Keranjang</Button></Link>
            <Link to="/buyer/orders"><Button size="sm" variant="outline">Pesanan</Button></Link>
            <Link to="/buyer/ai"><Button size="sm" variant="outline">AI Konsultan</Button></Link>
          </CardContent>

        </Card>

      </div>
    </AppShell>
  );
}
