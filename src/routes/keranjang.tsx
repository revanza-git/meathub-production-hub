import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/site-layout";

import { PAY_METHODS, useCart, type PayMethod } from "@/lib/meatlink/cart";
import { useBi, useLabel, useFormat, PAY_METHOD_LABEL_I18N } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { notifyOrderEventPublic } from "@/lib/meatlink/notify.functions";
import { listAddresses, saveAddress, type BuyerAddress } from "@/lib/meatlink/addresses";

const PAY_METHOD_HINT_EN: Record<string, string> = {
  BANK_TRANSFER: "Midtrans sandbox VA details are shown after placing the order.",
  QRIS: "Midtrans sandbox QR code is shown after placing the order.",
  WHATSAPP: "Our team will contact you to finalize the order.",
  CBD: "Pay in cash before the goods are delivered.",
  TOP: "Pay according to your credit limit due date.",
};

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

/** Quantity field that tolerates a temporarily empty value without dropping the line. */
function QtyInput({
  qty,
  label,
  onCommit,
}: {
  qty: number;
  label: string;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(qty));

  useEffect(() => {
    setDraft(String(qty));
  }, [qty]);

  return (
    <div className="flex items-center border border-line">
      <input
        type="number"
        min="1"
        step="0.5"
        inputMode="decimal"
        value={draft}
        aria-label={label}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          const n = Number(v);
          if (v.trim() !== "" && Number.isFinite(n) && n >= 1) onCommit(n);
        }}
        onBlur={() => {
          const n = Number(draft);
          if (draft.trim() === "" || !Number.isFinite(n) || n < 1) {
            setDraft(String(qty >= 1 ? qty : 1));
            if (qty < 1) onCommit(1);
          }
        }}
        className="w-24 bg-background px-3 py-2 text-sm text-ink outline-none"
      />
      <span className="px-3 text-xs text-ash">kg</span>
    </div>
  );
}

function CartPage() {

  const bi = useBi();
  const fmt = useFormat();
  const label = useLabel();
  const { lines, setQty, remove, clear, subtotal } = useCart();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [method, setMethod] = useState<PayMethod>("BANK_TRANSFER");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [credit, setCredit] = useState<CreditSummary | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [pickedAddress, setPickedAddress] = useState<string | null>(null);
  const [saveNewAddress, setSaveNewAddress] = useState(false);
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

  function applyAddress(a: BuyerAddress) {
    setPickedAddress(a.id);
    setForm((f) => ({
      ...f,
      buyer_name: a.buyer_name,
      company: a.company ?? "",
      phone: a.phone,
      email: a.email ?? "",
      address: a.address,
      city: a.city ?? "",
      notes: a.notes ?? f.notes,
    }));
  }

  // Signed-in buyers: prefill from the saved address book, else the latest order.
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      if (active) setSignedIn(true);

      const saved = await listAddresses().catch(() => [] as BuyerAddress[]);
      if (active) setAddresses(saved);

      const { data: creditRow } = await supabase.rpc("ml_my_credit");
      if (active && creditRow) setCredit(creditRow as unknown as CreditSummary);
      if (!active) return;

      const preferred = saved.find((a) => a.is_default) ?? saved[0];
      if (preferred) {
        applyAddress(preferred);
        return;
      }

      const { data } = await supabase
        .from("storefront_orders")
        .select("buyer_name, company, phone, email, address, city")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      toast.error(error?.message ?? bi("Kode promo tidak dapat diperiksa.", "The promo code could not be checked."));
      return;
    }
    if (!res.valid) {
      setApplied(null);
      toast.error(res.reason ?? bi("Kode promo tidak berlaku.", "This promo code is not valid."));
      return;
    }
    setApplied({ code: res.code ?? code, discount: Number(res.discount_idr ?? 0) });
    toast.success(bi("Kode promo diterapkan.", "Promo code applied."));
  }

  async function requestCredit() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error(bi("Masuk terlebih dahulu untuk mengajukan pembayaran tempo.", "Sign in first to request payment terms."));
      return;
    }
    const raw = window.prompt(bi("Berapa limit tempo yang Anda ajukan (Rp)?", "What credit limit are you requesting (IDR)?"), "50000000");
    const limit = Number((raw ?? "").replace(/\D/g, ""));
    if (!limit) return;
    const { error } = await supabase.rpc("ml_request_credit", { _limit: limit });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(bi("Pengajuan limit tempo terkirim.", "Credit limit request submitted."));
    const { data: creditRow } = await supabase.rpc("ml_my_credit");
    if (creditRow) setCredit(creditRow as unknown as CreditSummary);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error(bi("Keranjang masih kosong.", "Your cart is still empty."));
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
      if (!row) throw new Error(bi("Pesanan gagal dibuat", "Order could not be created"));
      clear();
      if (signedIn && saveNewAddress) {
        await saveAddress(
          {
            label: form.company?.trim() || form.city?.trim() || bi("Alamat pengiriman", "Shipping address"),
            buyer_name: form.buyer_name,
            company: form.company,
            phone: form.phone,
            email: form.email,
            address: form.address,
            city: form.city,
            is_default: addresses.length === 0,
          },
        ).catch(() => undefined);
      }
      toast.success(bi(`Pesanan ${row.order_no} berhasil dibuat.`, `Order ${row.order_no} created successfully.`));
      void notifyOrderEventPublic({
        data: { orderNo: row.order_no, token: row.access_token, event: "placed" },
      }).catch(() => undefined);
      navigate({
        to: "/pesanan/$orderNo",
        params: { orderNo: row.order_no },
        search: { t: row.access_token },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : bi("Pesanan gagal dibuat.", "Order could not be created."));
    } finally {
      setPending(false);
    }
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow={bi("Keranjang", "Cart")}
        title={bi("Selesaikan pesanan Anda", "Complete your order")}
        intro={bi(
          "Harga final mengikuti volume dan lokasi pengiriman. Tim kami mengonfirmasi setiap pesanan sebelum diproses.",
          "Final pricing follows volume and delivery location. Our team confirms every order before processing.",
        )}
      />

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        {lines.length === 0 ? (
          <p className="text-sm text-ash">
            {bi("Keranjang masih kosong.", "Your cart is still empty.")}{" "}
            <Link to="/produk" className="underline">
              {bi("Lihat katalog", "View catalog")}
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <h2 className="font-display text-2xl text-ink">{bi("Item pesanan", "Order items")}</h2>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {lines.map((l) => (
                  <li key={l.slug} className="flex flex-wrap items-center gap-4 py-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{l.name}</p>
                      <p className="mt-1 text-xs text-ash">{fmt.money(l.price)} /kg</p>
                    </div>
                    <QtyInput
                      qty={l.qty}
                      label={bi(`Jumlah kg untuk ${l.name}`, `Quantity in kg for ${l.name}`)}
                      onCommit={(n) => setQty(l.slug, n)}
                    />

                    <p className="w-32 text-right text-sm text-ink">
                      {fmt.money(l.price * l.qty)}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(l.slug)}
                      aria-label={bi(`Hapus ${l.name}`, `Remove ${l.name}`)}
                      className="text-ash hover:text-crimson"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <h2 className="mt-12 font-display text-2xl text-ink">{bi("Data pengiriman", "Shipping details")}</h2>

              {signedIn && addresses.length > 0 ? (
                <div className="mt-6 border border-line p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="eyebrow text-ash">{bi("Alamat tersimpan", "Saved addresses")}</h3>
                    <Link to="/app/alamat" className="text-xs text-ash underline">
                      {bi("Kelola alamat", "Manage addresses")}
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => applyAddress(a)}
                        aria-pressed={pickedAddress === a.id}
                        className={`border p-4 text-left text-sm transition-colors ${
                          pickedAddress === a.id
                            ? "border-crimson text-ink"
                            : "border-line text-ash hover:border-ink/40"
                        }`}
                      >
                        <span className="block text-ink">{a.label}</span>
                        <span className="mt-1 block text-xs">
                          {a.buyer_name} · {a.phone}
                        </span>
                        <span className="mt-1 block text-xs">
                          {a.address}
                          {a.city ? `, ${a.city}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input label={bi("Nama pemesan", "Buyer name")} required value={form.buyer_name} onChange={(v) => set("buyer_name", v)} />
                <Input label={bi("Perusahaan", "Company")} value={form.company} onChange={(v) => set("company", v)} />
                <Input label={bi("Nomor WhatsApp", "WhatsApp number")} required value={form.phone} onChange={(v) => set("phone", v)} />
                <Input label={bi("Email", "Email")} type="email" value={form.email} onChange={(v) => set("email", v)} />
                <Input label={bi("Kota", "City")} value={form.city} onChange={(v) => set("city", v)} />
                <div className="sm:col-span-2">
                  <Input label={bi("Alamat pengiriman", "Shipping address")} required value={form.address} onChange={(v) => set("address", v)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="eyebrow text-ash" htmlFor="notes">
                    {bi("Catatan", "Notes")}
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    className="mt-2 w-full border border-line bg-background px-4 py-3 text-sm text-ink outline-none focus:border-ink"
                  />
                </div>
                {signedIn ? (
                  <label className="flex items-center gap-3 text-sm text-ink sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={saveNewAddress}
                      onChange={(e) => setSaveNewAddress(e.target.checked)}
                      className="h-4 w-4"
                    />
                    {bi("Simpan alamat ini ke buku alamat saya", "Save this address to my address book")}
                  </label>
                ) : null}
              </div>
            </div>


            <aside className="h-fit border border-line bg-background p-8 lg:sticky lg:top-28">
              <h2 className="eyebrow text-ash">{bi("Ringkasan", "Summary")}</h2>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm text-ash">{bi("Subtotal", "Subtotal")}</span>
                <span className="font-display text-3xl text-ink">{fmt.money(subtotal)}</span>
              </div>
              {applied ? (
                <>
                  <div className="mt-3 flex items-baseline justify-between text-sm">
                    <span className="text-ash">{bi("Promo", "Promo")} {applied.code}</span>
                    <span className="text-crimson">-{fmt.money(applied.discount)}</span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
                    <span className="text-sm text-ash">{bi("Total", "Total")}</span>
                    <span className="font-display text-2xl text-ink">
                      {fmt.money(Math.max(subtotal - applied.discount, 0))}
                    </span>
                  </div>
                </>
              ) : null}
              <p className="mt-2 text-xs text-ash">
                {bi(
                  "Belum termasuk ongkos kirim. Tim kami mengonfirmasi total akhir.",
                  "Excludes shipping cost. Our team confirms the final total.",
                )}
              </p>

              <div className="mt-6">
                <label htmlFor="coupon" className="eyebrow text-ash">
                  {bi("Kode promo", "Promo code")}
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
                    {checkingCoupon ? "…" : bi("Pakai", "Apply")}
                  </button>
                </div>
              </div>

              {credit && credit.status !== "APPROVED" ? (
                <p className="mt-4 border border-line p-4 text-xs text-ash">
                  {bi(
                    `Pengajuan limit tempo Anda berstatus ${credit.status.toLowerCase()}. Tim kami akan mengabari setelah ditinjau.`,
                    `Your credit limit request is ${credit.status.toLowerCase()}. Our team will notify you once reviewed.`,
                  )}
                </p>
              ) : null}

              {!credit ? (
                <button
                  type="button"
                  onClick={() => void requestCredit()}
                  className="eyebrow mt-4 w-full border border-ink px-4 py-3 text-ink"
                >
                  {bi("Ajukan pembayaran tempo", "Request payment terms")}
                </button>
              ) : null}

              {credit?.status === "APPROVED" ? (
                <p className="mt-4 border border-line bg-ink/[0.03] p-4 text-xs text-ash">
                  {bi(
                    `Limit tempo tersedia ${fmt.money(Number(credit.available_idr))} dari ${fmt.money(Number(credit.limit_idr))} · jatuh tempo ${credit.term_days} hari.`,
                    `Available credit ${fmt.money(Number(credit.available_idr))} of ${fmt.money(Number(credit.limit_idr))} · due in ${credit.term_days} days.`,
                  )}
                </p>
              ) : null}

              <fieldset className="mt-8">
                <legend className="eyebrow text-ash">{bi("Metode pembayaran", "Payment method")}</legend>
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
                        <span className="block text-ink">{label(PAY_METHOD_LABEL_I18N, m.value)}</span>
                        <span className="mt-1 block text-xs text-ash">
                          {bi(m.hint, PAY_METHOD_HINT_EN[m.value] ?? m.hint)}
                        </span>
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
                {pending ? bi("Memproses…", "Processing…") : bi("Buat pesanan", "Place order")}
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
