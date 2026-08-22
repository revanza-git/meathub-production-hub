import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/meatlink/cart";

export function AddToCart({
  slug,
  name,
  price,
  compact = false,
}: {
  slug: string;
  name: string;
  price: number;
  compact?: boolean;
}) {
  const { add } = useCart();
  const [qty, setQty] = useState("10");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Masukkan jumlah dalam kilogram.");
      return;
    }
    add({ slug, name, price, qty: n });
    toast.success(`${name} ditambahkan ke keranjang.`);
  }

  return (
    <form onSubmit={submit} className={compact ? "flex gap-2" : "mt-6 grid gap-3"}>
      <label className="sr-only" htmlFor={`qty-${slug}`}>
        Jumlah dalam kilogram untuk {name}
      </label>
      <div className="flex items-center border border-line">
        <input
          id={`qty-${slug}`}
          type="number"
          min="1"
          step="0.5"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-full bg-background px-4 py-3 text-sm text-ink outline-none"
        />
        <span className="px-4 text-sm text-ash">kg</span>
      </div>
      <button
        type="submit"
        className="eyebrow inline-flex items-center justify-center gap-2 bg-ink px-6 py-4 text-bone transition-colors hover:bg-ink/85"
      >
        <ShoppingCart className="h-4 w-4" /> Tambah ke keranjang
      </button>
    </form>
  );
}
