import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductDetail } from "@/lib/catalog.functions";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/buyer/products/$id")({
  head: () => ({ meta: [{ title: "Detail produk — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { id } = Route.useParams();
  const detailFn = useServerFn(getProductDetail);
  const { data, isLoading, error } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: () => detailFn({ data: { product_id: id } }),
  });

  return (
    <AppShell title="SBMEAT" subtitle="Detail produk">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <Link to="/buyer/search" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Kembali ke pencarian
        </Link>
        {isLoading ? <div className="text-sm text-muted-foreground">Memuat…</div> : null}
        {error ? <div className="text-sm text-destructive">{(error as Error).message}</div> : null}
        {data ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>{data.product.name}</CardTitle>
                    <CardDescription>
                      {data.product.sku} · {data.product.species?.name}/{data.product.cut?.name} · {data.product.brand?.name} · {data.product.grade?.name}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{data.product.tier.replace("_"," ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.product.primary_image_url ? (
                  <img src={data.product.primary_image_url} alt={data.product.name} className="max-h-72 rounded-md border object-cover" />
                ) : null}
                {data.product.description ? <p className="text-sm">{data.product.description}</p> : null}
                {data.product.tier === "UNDERVALUED_QC" && data.product.undervalued_disclosure ? (
                  <div className="rounded-md border border-gold/60 bg-gold/10 p-3 text-sm">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink">
                      Disclosure Undervalued · {data.product.disclosure_version}
                    </div>
                    <p>{data.product.undervalued_disclosure}</p>
                  </div>
                ) : null}
                {data.evidence.length > 0 ? (
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Evidence</div>
                    <ul className="space-y-1 text-sm">
                      {data.evidence.map((e) => (
                        <li key={e.id}>
                          <Badge variant="outline" className="mr-2">{e.type}</Badge>
                          {e.source_url ? (
                            <a href={e.source_url} target="_blank" rel="noreferrer" className="underline">
                              {e.title ?? e.source_url}
                            </a>
                          ) : (e.title ?? "—")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Offer aktif</CardTitle></CardHeader>
              <CardContent>
                {data.offers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Belum ada offer aktif untuk produk ini.</div>
                ) : (
                  <ul className="divide-y">
                    {data.offers.map((o) => {
                      const vendor = (o as unknown as { vendor: { display_name: string } | null }).vendor;
                      return (
                        <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <div className="font-medium">{vendor?.display_name ?? "Vendor"}</div>
                            <div className="text-xs text-muted-foreground">
                              {o.purchase_type} · min {o.min_qty} step {o.qty_step}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-semibold">Rp {Number(o.base_price_per_kg).toLocaleString("id-ID")}</div>
                              <div className="text-xs text-muted-foreground">/kg</div>
                            </div>
                            <Button size="sm" disabled title="Order flow di Phase 3">Pesan</Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
