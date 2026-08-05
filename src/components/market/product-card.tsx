import { Link } from "@tanstack/react-router";
import { Heart, Star, ShoppingCart, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rupiah } from "@/lib/market/format";
import { vendorById, type Product } from "@/lib/market/data";
import { useCart } from "@/lib/market/cart";
import { toast } from "sonner";

export function ProductCard({ product, compact }: { product: Product; compact?: boolean }) {
  const { add, wishlist, toggleWish } = useCart();
  const vendor = vendorById(product.vendorId);
  const wished = wishlist.includes(product.id);
  const disc = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const habis = product.stock <= 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <Link
        to="/produk/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {disc > 0 && <Badge className="bg-maroon text-white">-{disc}%</Badge>}
          {product.halal && (
            <Badge className="border-success/40 bg-success/15 text-success" variant="outline">
              Halal
            </Badge>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={() => {
          toggleWish(product.id);
          toast.success(wished ? "Dihapus dari wishlist" : "Ditambahkan ke wishlist");
        }}
        aria-label={wished ? "Hapus dari wishlist" : "Simpan ke wishlist"}
        aria-pressed={wished}
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-card/90 text-ink-soft shadow-sm transition-colors hover:text-maroon"
      >
        <Heart className={cn("h-4 w-4", wished && "fill-maroon text-maroon")} />
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link
          to="/produk/$id"
          params={{ id: product.id }}
          className="line-clamp-2 text-sm font-semibold leading-snug text-ink hover:text-maroon"
        >
          {product.name}
        </Link>

        <div className="flex items-baseline gap-2">
          <span className="font-display text-base font-bold text-maroon">{rupiah(product.price)}</span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {rupiah(product.originalPrice)}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">per {product.unit}</div>

        {!compact && (
          <div className="mt-auto space-y-1.5 pt-1">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Star className="h-3 w-3 fill-accent text-accent" aria-hidden="true" />
              <span className="font-medium text-ink">{product.rating.toFixed(1)}</span>
              <span>({product.reviewCount})</span>
              <span aria-hidden="true">·</span>
              <span>{product.sold} terjual</span>
            </div>
            <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
              {vendor.verified && <BadgeCheck className="h-3 w-3 shrink-0 text-success" aria-hidden="true" />}
              <span className="truncate">{vendor.name}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {vendor.city} · MOQ {product.moq} {product.unit} ·{" "}
              <span className={habis ? "text-destructive" : "text-success"}>
                {habis ? "Stok habis" : `Stok ${product.stock}`}
              </span>
            </div>
            <Button
              size="sm"
              className="mt-1 w-full gap-1.5"
              disabled={habis}
              onClick={() => {
                add(product.id, product.variants[1]?.id ?? product.variants[0].id, product.moq);
                toast.success(`${product.name} masuk keranjang`);
              }}
            >
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              {habis ? "Stok habis" : "Tambah"}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-square bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-4/5 rounded bg-muted" />
        <div className="h-3 w-2/5 rounded bg-muted" />
        <div className="h-8 w-full rounded bg-muted" />
      </div>
    </div>
  );
}
