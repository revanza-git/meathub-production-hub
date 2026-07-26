import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getProductDetail } from "@/lib/catalog.functions";
import { addToCart } from "@/lib/cart.functions";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/buyer/products/$id")({
  head: () => ({ meta: [{ title: "Detail produk — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: ProductDetailPage,
});


function ProductDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const detailFn = useServerFn(getProductDetail);
  const addFn = useServerFn(addToCart);
  const { data, isLoading, error } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: () => detailFn({ data: { product_id: id } }),
  });
  const addMut = useMutation({
    mutationFn: (v: { offer_id: string; qty_kg: number }) => addFn({ data: v }),
    onSuccess: () => { toast.success("Ditambahkan ke keranjang"); qc.invalidateQueries({ queryKey: ["cart"] }); },
    onError: (e: Error) => toast.error(e.message),
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
                        <OfferRow
                          key={o.id}
                          offer={o}
                          vendor={vendor?.display_name ?? "Vendor"}
                          onAdd={(qty) => addMut.mutate({ offer_id: o.id, qty_kg: qty })}
                          pending={addMut.isPending}
                        />
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
