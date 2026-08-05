import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PRODUCTS, productById, vendorById, type Product } from "./data";

export type CartLine = {
  key: string;
  productId: string;
  variantId: string;
  qty: number;
  selected: boolean;
};

export type CartLineFull = CartLine & {
  product: Product;
  variantLabel: string;
  unitPrice: number;
  stock: number;
};

const KEY = "meathub.demo.cart";
const NOTES_KEY = "meathub.demo.cart.notes";
const WISH_KEY = "meathub.demo.wishlist";
const VIEWED_KEY = "meathub.demo.viewed";

type Ctx = {
  lines: CartLine[];
  full: CartLineFull[];
  groups: { vendorId: string; lines: CartLineFull[]; subtotal: number }[];
  count: number;
  add: (productId: string, variantId: string, qty: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  toggleSelect: (key: string) => void;
  selectVendor: (vendorId: string, value: boolean) => void;
  clear: () => void;
  notes: Record<string, string>;
  setNote: (vendorId: string, note: string) => void;
  wishlist: string[];
  toggleWish: (productId: string) => void;
  viewed: string[];
  markViewed: (productId: string) => void;
  totals: { subtotal: number; discount: number; totalKg: number };
};

const CartContext = createContext<Ctx | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [viewed, setViewed] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(read<CartLine[]>(KEY, []));
    setNotes(read<Record<string, string>>(NOTES_KEY, {}));
    setWishlist(read<string[]>(WISH_KEY, []));
    setViewed(read<string[]>(VIEWED_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }, [notes, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(VIEWED_KEY, JSON.stringify(viewed));
  }, [viewed, hydrated]);

  const value = useMemo<Ctx>(() => {
    const full: CartLineFull[] = lines.flatMap((l) => {
      const product = productById(l.productId);
      if (!product) return [];
      const v = product.variants.find((x) => x.id === l.variantId) ?? product.variants[0];
      return [{ ...l, product, variantLabel: v.label, unitPrice: v.price, stock: v.stock }];
    });

    const vendorIds = Array.from(new Set(full.map((l) => l.product.vendorId)));
    const groups = vendorIds.map((vendorId) => {
      const gl = full.filter((l) => l.product.vendorId === vendorId);
      return {
        vendorId,
        lines: gl,
        subtotal: gl.filter((l) => l.selected).reduce((s, l) => s + l.unitPrice * l.qty, 0),
      };
    });

    const selected = full.filter((l) => l.selected);
    const subtotal = selected.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    const discount = selected.reduce((s, l) => {
      const op = l.product.originalPrice;
      if (!op) return s;
      const ratio = op / l.product.price;
      return s + (l.unitPrice * ratio - l.unitPrice) * l.qty;
    }, 0);
    const totalKg = selected.reduce((s, l) => {
      const v = l.product.variants.find((x) => x.id === l.variantId);
      return s + ((v?.weightGram ?? 1000) / 1000) * l.qty;
    }, 0);

    return {
      lines,
      full,
      groups,
      count: lines.reduce((s, l) => s + l.qty, 0),
      add: (productId, variantId, qty) =>
        setLines((prev) => {
          const key = `${productId}:${variantId}`;
          const found = prev.find((l) => l.key === key);
          if (found) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty, selected: true } : l));
          return [...prev, { key, productId, variantId, qty, selected: true }];
        }),
      setQty: (key, qty) =>
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, qty: Math.max(1, qty) } : l))),
      remove: (key) => setLines((prev) => prev.filter((l) => l.key !== key)),
      toggleSelect: (key) =>
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, selected: !l.selected } : l))),
      selectVendor: (vendorId, val) =>
        setLines((prev) =>
          prev.map((l) =>
            productById(l.productId)?.vendorId === vendorId ? { ...l, selected: val } : l,
          ),
        ),
      clear: () => setLines([]),
      notes,
      setNote: (vendorId, note) => setNotes((p) => ({ ...p, [vendorId]: note })),
      wishlist,
      toggleWish: (productId) =>
        setWishlist((p) => (p.includes(productId) ? p.filter((x) => x !== productId) : [...p, productId])),
      viewed,
      markViewed: (productId) =>
        setViewed((p) => [productId, ...p.filter((x) => x !== productId)].slice(0, 8)),
      totals: { subtotal, discount, totalKg },
    };
  }, [lines, notes, wishlist, viewed]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export { PRODUCTS, vendorById };
