import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getMyCart, updateCartItem, removeCartItem, setCartAddress, checkoutCart } from "@/lib/cart.functions";
import { listAddresses, type Address } from "@/lib/addresses.functions";

export const Route = createFileRoute("/_authenticated/buyer/cart")({
  head: () => ({ meta: [{ title: "Keranjang — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: CartPage,
});

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

function CartPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const getCart = useServerFn(getMyCart);
  const listAddrs = useServerFn(listAddresses);
  const upd = useServerFn(updateCartItem);
  const rm = useServerFn(removeCartItem);
  const setAddr = useServerFn(setCartAddress);
  const checkout = useServerFn(checkoutCart);
  const [notes, setNotes] = useState("");

  const cartQ = useQuery({ queryKey: ["cart"], queryFn: () => getCart() });
  const addrQ = useQuery({ queryKey: ["addrs"], queryFn: () => listAddrs() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cart"] });

  const updMut = useMutation({
    mutationFn: (v: { item_id: string; qty_kg: number }) => upd({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const rmMut = useMutation({
    mutationFn: (item_id: string) => rm({ data: { item_id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const addrMut = useMutation({
    mutationFn: (v: { cart_id: string; address_id: string }) => setAddr({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const checkoutMut = useMutation({
    mutationFn: () => checkout({ data: { notes: notes || undefined } }),
    onSuccess: (r) => {
      toast.success("Order dibuat");
      qc.invalidateQueries({ queryKey: ["cart"] });
      nav({ to: "/buyer/orders/$id", params: { id: r.order_id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cart = cartQ.data?.cart;
  const items = cartQ.data?.items ?? [];
  const totals = cartQ.data?.totals;
  const addrs = addrQ.data ?? [];

  return (
    <AppShell title="SBMEAT" subtitle="Keranjang belanja">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        {cartQ.isLoading ? <div className="text-sm text-muted-foreground">Memuat…</div> : null}
        {cartQ.data && !cart ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Anda belum tergabung ke organisasi Buyer. <Link to="/onboarding" className="underline">Onboarding</Link>
          </CardContent></Card>
        ) : null}

        {cart ? (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Item ({items.length})</CardTitle></CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Keranjang kosong. <Link to="/buyer/search" className="underline">Cari produk</Link>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {items.map((it) => (
                      <li key={it.id} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{it.offer?.product?.name ?? "Produk"}</div>
                          <div className="text-xs text-muted-foreground">
                            {it.offer?.vendor?.display_name} · {it.offer?.purchase_type} · {fmt(it.unit_price_snapshot)}/kg
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Hold s/d {new Date(it.hold_expires_at).toLocaleTimeString("id-ID")}
                          </div>
                        </div>
                        <Input
                          type="number"
                          step={it.offer?.qty_step ?? 0.1}
                          min={it.offer?.min_qty ?? 0.1}
                          defaultValue={it.qty_kg}
                          className="w-24"
                          onBlur={(e) => {
                            const v = Number(e.currentTarget.value);
                            if (v > 0 && v !== Number(it.qty_kg)) updMut.mutate({ item_id: it.id, qty_kg: v });
                          }}
                        />
                        <div className="w-28 text-right font-semibold">
                          {fmt(Number(it.qty_kg) * Number(it.unit_price_snapshot))}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => rmMut.mutate(it.id)}>Hapus</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Alamat & catatan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alamat pengiriman</div>
                  {addrs.length === 0 ? (
                    <div className="text-sm">
                      Belum ada alamat. <Link to="/buyer/addresses" className="underline">Tambah alamat</Link>
                    </div>
                  ) : (
                    <Select value={cart.address_id ?? ""} onValueChange={(v) => addrMut.mutate({ cart_id: cart.id, address_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih alamat" /></SelectTrigger>
                      <SelectContent>
                        {addrs.map((a: Address) => (
                          <SelectItem key={a.id} value={a.id}>{a.label} — {a.city} ({a.service_zone ?? "?"})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Catatan (opsional)</div>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan untuk vendor / kurir" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Ringkasan</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label="Subtotal" value={fmt(totals?.subtotal ?? 0)} />
                <Row label={`Ongkir ${totals && totals.total_kg >= 20 ? "(gratis ≥ 20 kg)" : "(< 20 kg)"}`} value={fmt(totals?.shipping ?? 0)} />
                <Row label="PPN 11%" value={fmt(totals?.tax ?? 0)} />
                <Row label="Total berat" value={`${(totals?.total_kg ?? 0).toFixed(2)} kg`} />
                <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
                  <span>Total</span><span>{fmt(totals?.total ?? 0)}</span>
                </div>
                <Button
                  className="mt-3 w-full"
                  disabled={!cart.address_id || items.length === 0 || checkoutMut.isPending}
                  onClick={() => checkoutMut.mutate()}
                >
                  {checkoutMut.isPending ? "Memproses…" : "Checkout"}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>
  );
}
