import { useCallback, useEffect, useState } from "react";
import type { Database } from "@/integrations/supabase/types";
import { trackEvent } from "@/lib/analytics";

export type PayMethod = Database["public"]["Enums"]["ml_pay_method"];

export const PAY_METHODS: {
  value: PayMethod;
  label: string;
  hint: string;
}[] = [
  {
    value: "BANK_TRANSFER",
    label: "Transfer bank / Virtual Account",
    hint: "Nomor VA tersedia setelah pesanan dibuat.",
  },
  { value: "QRIS", label: "QRIS", hint: "Kode QR tersedia setelah pesanan dibuat." },
  { value: "WHATSAPP", label: "Konfirmasi via WhatsApp", hint: "Tim kami menghubungi Anda untuk finalisasi." },
  { value: "CBD", label: "Cash Before Delivery", hint: "Bayar tunai sebelum barang dikirim." },
  {
    value: "TERMS_REQUEST",
    label: "Ajukan termin via WhatsApp",
    hint: "Buat pesanan dahulu, lalu bahas syarat pembayaran dengan tim kami. Belum disetujui.",
  },
];

export const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  BANK_TRANSFER: "Transfer bank / VA",
  QRIS: "QRIS",
  WHATSAPP: "WhatsApp",
  CBD: "Cash Before Delivery",
  TOP: "Tempo (TOP)",
  TERMS_REQUEST: "Pengajuan termin — belum disetujui",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "Pesanan diterima",
  AWAITING_PAYMENT: "Menunggu pembayaran",
  PAID: "Pembayaran diterima",
  PROCESSING: "Sedang diproses",
  SHIPPED: "Dalam pengiriman",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export type CartLine = {
  slug: string;
  name: string;
  price: number;
  qty: number;
};

const KEY = "meatlink.cart.v1";
const EVT = "meatlink-cart-changed";

function read(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l && l.slug && l.qty > 0) : [];
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  window.localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(EVT));
}

/** Reactive cart backed by localStorage, shared across components in the tab. */
export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    const sync = () => setLines(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const add = useCallback((line: CartLine) => {
    const next = read();
    const found = next.find((l) => l.slug === line.slug);
    if (found) found.qty = Math.round((found.qty + line.qty) * 100) / 100;
    else next.push(line);
    write(next);
    trackEvent("add_to_cart", {
      currency: "IDR",
      value: line.price * line.qty,
      items: [{ item_id: line.slug, item_name: line.name, price: line.price, quantity: line.qty }],
    });
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    const next = read()
      .map((l) => (l.slug === slug ? { ...l, qty: Math.round(qty * 100) / 100 } : l))
      .filter((l) => l.qty > 0);
    write(next);
  }, []);

  const remove = useCallback((slug: string) => write(read().filter((l) => l.slug !== slug)), []);
  const clear = useCallback(() => write([]), []);

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const count = lines.length;

  return { lines, add, setQty, remove, clear, subtotal, count };
}
