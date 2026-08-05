import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { MarketLayout } from "@/components/market/market-layout";
import { ProductCard } from "@/components/market/product-card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/market/cart";
import { productById } from "@/lib/market/data";

export const Route = createFileRoute("/akun/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist Saya — MEATHUB" },
      { name: "description", content: "Daftar produk daging favorit yang Anda simpan di MEATHUB." },
      { property: "og:title", content: "Wishlist Saya — MEATHUB" },
      { property: "og:description", content: "Daftar produk daging favorit yang Anda simpan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { wishlist } = useCart();
  const items = wishlist.map((id) => productById(id)).filter(Boolean);

  return (
    <MarketLayout>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-4 font-display text-2xl font-bold text-ink">Wishlist saya</h1>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-display text-lg font-bold text-ink">Belum ada produk tersimpan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tekan ikon hati pada produk untuk menyimpannya di sini.
            </p>
            <Link to="/produk" search={{}}>
              <Button className="mt-4">Jelajahi katalog</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p!.id} product={p!} />
            ))}
          </div>
        )}
      </div>
    </MarketLayout>
  );
}
