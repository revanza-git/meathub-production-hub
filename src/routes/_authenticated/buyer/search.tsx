import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { searchOffers, type SearchOfferHit } from "@/lib/catalog.functions";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/buyer/search")({
  head: () => ({ meta: [{ title: "Cari produk — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: BuyerSearchPage,
});

function BuyerSearchPage() {
  const [q, setQ] = useState("");
  const [pt, setPt] = useState<"ALL" | "LOAF" | "CARTON" | "RETAIL">("ALL");
  const [zone, setZone] = useState<"ALL" | "JKT_INNER" | "JKT_OUTER" | "BODETABEK">("ALL");

  const searchFn = useServerFn(searchOffers);
  const { data, isLoading } = useQuery({
    queryKey: ["search", q, pt, zone],
    queryFn: () =>
      searchFn({
        data: {
          q: q || undefined,
          purchase_type: pt === "ALL" ? undefined : pt,
          service_zone: zone === "ALL" ? undefined : zone,
        },
      }),
  });

  return (
    <AppShell title="SBMEAT" subtitle="Cari produk & vendor">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-2 md:grid-cols-[1fr_160px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ribeye, wagyu, ayam broiler…" className="pl-9" />
              </div>
              <Select value={pt} onValueChange={(v) => setPt(v as typeof pt)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ALL","LOAF","CARTON","RETAIL"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={zone} onValueChange={(v) => setZone(v as typeof zone)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ALL","JKT_INNER","JKT_OUTER","BODETABEK"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? <div className="text-sm text-muted-foreground">Mencari…</div> : null}

        <div className="grid gap-3">
          {(data ?? []).map((hit) => <OfferCard key={hit.offer_id} hit={hit} />)}
          {data && data.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Tidak ada offer aktif yang cocok. Coba ubah filter.
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function OfferCard({ hit }: { hit: SearchOfferHit }) {
  const staleMins = hit.stock ? Math.floor((Date.now() - new Date(hit.stock.as_of).getTime()) / 60000) : null;
  const stockLabel = !hit.stock
    ? { label: "Stok belum tersedia", tone: "bg-muted text-muted-foreground" }
    : hit.stock.available_kg <= 0
      ? { label: "Habis", tone: "bg-destructive/15 text-destructive" }
      : hit.stock.available_kg < 20
        ? { label: `Rendah · ${hit.stock.available_kg} kg`, tone: "bg-gold/40 text-ink" }
        : { label: `Ready · ${hit.stock.available_kg} kg`, tone: "bg-emerald-100 text-emerald-900" };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              <Link to="/buyer/products/$id" params={{ id: hit.product_id }} className="hover:underline">
                {hit.name}
              </Link>
            </CardTitle>
            <CardDescription>
              {hit.brand ?? "—"} · {hit.grade ?? "—"} · {hit.species}/{hit.cut} · Vendor: {hit.vendor_name}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-lg font-semibold">Rp {hit.base_price_per_kg.toLocaleString("id-ID")}<span className="text-xs font-normal text-muted-foreground">/kg</span></div>
            <Badge variant="outline">{hit.purchase_type}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <Badge className={stockLabel.tone}>{stockLabel.label}</Badge>
          <Badge variant="outline">{hit.tier.replace("_"," ")}</Badge>
          {staleMins !== null ? <span className="text-muted-foreground">Update {staleMins}m lalu</span> : null}
        </div>
        <Link to="/buyer/products/$id" params={{ id: hit.product_id }}>
          <Button size="sm" variant="outline">Lihat detail</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
