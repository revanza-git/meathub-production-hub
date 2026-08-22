import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/site-layout";
import { formatIdr } from "@/lib/meatlink/inventory";
import { PAY_METHODS, useCart, type PayMethod } from "@/lib/meatlink/cart";
import { supabase } from "@/integrations/supabase/client";
import { notifyOrderEventPublic } from "@/lib/meatlink/notify.functions";

type CreditSummary = {
  status: string;
  limit_idr: number;
  term_days: number;
  outstanding_idr: number;
  available_idr: number;
};

export const Route = createFileRoute("/keranjang")({
  head: () => ({
    meta: [
      { title: "Keranjang & Checkout — Meatlink.id" },
      {
        name: "description",
        content:
          "Periksa keranjang pesanan daging B2B Anda, isi data pengiriman dan pilih metode pembayaran: transfer bank, QRIS, WhatsApp atau cash before delivery.",
      },
      { property: "og:title", content: "Keranjang & Checkout — Meatlink.id" },
      {
        property: "og:description",
        content: "Selesaikan pesanan daging B2B Anda di Meatlink.id.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, setQty, remove, clear, subtotal } = useCart();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [method, setMethod] = useState<PayMethod>("BANK_TRANSFER");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [credit, setCredit] = useState<CreditSummary | null>(null);
  const [form, setForm] = useState({
    buyer_name: "",
    company: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    notes: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Signed-in buyers: prefill shipping details from their most recent order.
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("storefront_orders")
        .select("buyer_name, company, phone, email, address, city")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: creditRow } = await supabase.rpc("ml_my_credit");
      if (active && creditRow) setCredit(creditRow as unknown as CreditSummary);
      if (!active || !data) return;
      setForm((f) =>
        f.buyer_name || f.phone || f.address
          ? f
          : {
              ...f,
              buyer_name: data.buyer_name ?? "",
              company: data.company ?? "",
              phone: data.phone ?? "",
              email: data.email ?? "",
              address: data.address ?? "",
              city: data.city ?? "",
            },
      );
    })();
    return () => {
      active = false;
    };
  }, []);

  // Re-check the code whenever the cart total moves so minimum-spend rules stay honest.
  useEffect(() => {
    if (!applied) return;
    setApplied(null);
  }, [subtotal]); // eslint-disable-line react-hooks/exhaustive-deps

  async function applyCoupon() {
    const code = coupon.trim();
    if (!code) return;
    setCheckingCoupon(true);
    const { data, error } = await supabase.rpc("ml_validate_coupon", {
      _code: code,
      _subtotal: subtotal,
    });
    setCheckingCoupon(false);
    const res = data as unknown as
      | { valid: boolean; reason?: string; code?: string; discount_idr?: number }
      | null;
    if (error || !res) {
      toast.error(error?.message ?? "Kode promo tidak dapat diperiksa.");
      return;
    }
    if (!res.valid) {
      setApplied(null);
      toast.error(res.reason ?? "Kode promo tidak berlaku.");
      return;
    }
    setApplied({ code: res.code ?? code, discount: Number(res.discount_idr ?? 0) });
    toast.success("Kode promo diterapkan.");
  }

  async function requestCredit() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Masuk terlebih dahulu untuk mengajukan pembayaran tempo.");
      return;
    }
    const raw = window.prompt("Berapa limit tempo yang Anda ajukan (Rp)?", "50000000");
    const limit = Number((raw ?? "").replace(/\D/g, ""));
    if (!limit) return;
    const { error } = await supabase.rpc("ml_request_credit", { _limit: limit });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pengajuan limit tempo terkirim.");
    const { data: creditRow } = await supabase.rpc("ml_my_credit");
    if (creditRow) setCredit(creditRow as unknown as CreditSummary);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error("Keranjang masih kosong.");
      return;
    }
    setPending(true);
    try {
      const { data, error } = await supabase.rpc("ml_place_order", {
        _buyer: form,
        _items: lines.map((l) => ({ slug: l.slug, qty_kg: l.qty })),
        _payment_method: method,
        _coupon: applied?.code ?? undefined,
      });
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) throw new Error("Pesanan gagal dibuat");
      clear();
      toast.success(`Pesanan ${row.order_no} berhasil dibuat.`);
      void notifyOrderEventPublic({
        data: { orderNo: row.order_no, token: row.access_token, event: "placed" },
      }).catch(() => undefined);
      navigate({
        to: "/pesanan/$orderNo",
        params: { orderNo: row.order_no },
        search: { t: row.access_token },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pesanan gagal dibuat.");
    } finally {
      setPending(false);
    }
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Keranjang"
        title="Selesaikan pesanan Anda"
        intro="Harga final mengikuti volume dan lokasi pengiriman. Tim kami mengonfirmasi setiap pesanan sebelum diproses."
      />

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        {lines.length === 0 ? (
          <p className="text-sm text-ash">
            Keranjang masih kosong.{" "}
            <Link to="/produk" className="underline">
              Lihat katalog
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <h2 className="font-display text-2xl text-ink">Item pesanan</h2>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {lines.map((l) => (
                  <li key={l.slug} className="flex flex-wrap items-center gap-4 py-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{l.name}</p>
                      <p className="mt-1 text-xs text-ash">{formatIdr(l.price)} /kg</p>
                    </div>
                    <div className="flex items-center border border-line">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={l.qty}
                        aria-label={`Jumlah kg untuk ${l.name}`}
                        onChange={(e) => setQty(l.slug, Number(e.target.value))}
                        className="w-24 bg-background px-3 py-2 text-sm text-ink outline-none"
                      />
                      <span className="px-3 text-xs text-ash">kg</span>
                    </div>
                    <p className="w-32 text-right text-sm text-ink">
                      {formatIdr(l.price * l.qty)}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(l.slug)}
                      aria-label={`Hapus ${l.name}`}
                      className="text-ash hover:text-crimson"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <h2 className="mt-12 font-display text-2xl text-ink">Data pengiriman</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input label="Nama pemesan" required value={form.buyer_name} onChange={(v) => set("buyer_name", v)} />
                <Input label="Perusahaan" value={form.company} onChange={(v) => set("company", v)} />
                <Input label="Nomor WhatsApp" required value={form.phone} onChange={(v) => set("phone", v)} />
                <Input label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
                <Input label="Kota" value={form.city} onChange={(v) => set("city", v)} />
                <div className="sm:col-span-2">
                  <Input label="Alamat pengiriman" required value={form.address} onChange={(v) => set("address", v)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="eyebrow text-ash" htmlFor="notes">
                    Catatan
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    className="mt-2 w-full border border-line bg-background px-4 py-3 text-sm text-ink outline-none focus:border-ink"
                  />
                </div>
              </div>
            </div>

            <aside className="h-fit border border-line bg-background p-8 lg:sticky lg:top-28">
              <h2 className="eyebrow text-ash">Ringkasan</h2>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm text-ash">Subtotal</span>
                <span className="font-display text-3xl text-ink">{formatIdr(subtotal)}</span>
              </div>
              {applied ? (
                <>
                  <div className="mt-3 flex items-baseline justify-between text-sm">
                    <span className="text-ash">Promo {applied.code}</span>
                    <span className="text-crimson">-{formatIdr(applied.discount)}</span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
                    <span className="text-sm text-ash">Total</span>
                    <span className="font-display text-2xl text-ink">
                      {formatIdr(Math.max(subtotal - applied.discount, 0))}
                    </span>
                  </div>
                </>
              ) : null}
              <p className="mt-2 text-xs text-ash">
                Belum termasuk ongkos kirim. Tim kami mengonfirmasi total akhir.
              </p>

              <div className="mt-6">
                <label htmlFor="coupon" className="eyebrow text-ash">
                  Kode promo
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="coupon"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="MEATLINK10"
                    className="w-full border border-line bg-background px-4 py-3 text-sm text-ink outline-none focus:border-ink"
                  />
                  <button
                    type="button"
                    onClick={() => void applyCoupon()}
                    disabled={checkingCoupon || !coupon.trim()}
                    className="eyebrow border border-ink px-4 text-ink disabled:opacity-50"
                  >
                    {checkingCoupon ? "…" : "Pakai"}
                  </button>
                </div>
              </div>

              {credit && credit.status !== "APPROVED" ? (
                <p className="mt-4 border border-line p-4 text-xs text-ash">
                  Pengajuan limit tempo Anda berstatus {credit.status.toLowerCase()}. Tim kami akan
                  mengabari setelah ditinjau.
                </p>
              ) : null}

              {!credit ? (
                <button
                  type="button"
                  onClick={() => void requestCredit()}
                  className="eyebrow mt-4 w-full border border-ink px-4 py-3 text-ink"
                >
                  Ajukan pembayaran tempo
                </button>
              ) : null}

              {credit?.status === "APPROVED" ? (
                <p className="mt-4 border border-line bg-ink/[0.03] p-4 text-xs text-ash">
                  Limit tempo tersedia {formatIdr(Number(credit.available_idr))} dari{" "}
                  {formatIdr(Number(credit.limit_idr))} · jatuh tempo {credit.term_days} hari.
                </p>
              ) : null}

              <fieldset className="mt-8">
                <legend className="eyebrow text-ash">Metode pembayaran</legend>
                <div className="mt-4 grid gap-2">
                  {PAY_METHODS.filter(
                    (m) => !m.requiresCredit || credit?.status === "APPROVED",
                  ).map((m) => (
                    <label
                      key={m.value}
                      className={`flex cursor-pointer gap-3 border p-4 text-sm ${
                        method === m.value ? "border-ink bg-ink/[0.03]" : "border-line"
                      }`}
                    >
                      <input
                        type="radio"
                        name="pay"
                        value={m.value}
                        checked={method === m.value}
                        onChange={() => setMethod(m.value)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-ink">{m.label}</span>
                        <span className="mt-1 block text-xs text-ash">{m.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={pending}
                className="eyebrow mt-8 w-full bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep disabled:opacity-60"
              >
                {pending ? "Memproses…" : "Buat pesanan"}
              </button>
            </aside>
          </form>
        )}
      </section>
    </SiteLayout>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="eyebrow text-ash">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-line bg-background px-4 py-3 text-sm text-ink outline-none focus:border-ink"
      />
    </div>
  );
}
