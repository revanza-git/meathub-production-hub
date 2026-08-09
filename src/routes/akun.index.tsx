import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Heart, MapPin, Receipt, User, LogOut } from "lucide-react";
import { MarketLayout } from "@/components/market/market-layout";
import { RoleNav } from "@/components/market/role-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDemoRole, ROLE_LABEL } from "@/lib/market/role";
import { useCart } from "@/lib/market/cart";
import { listOrders, STATUS_TONE } from "@/lib/market/orders-store";
import { rupiah, tanggal } from "@/lib/market/format";

export const Route = createFileRoute("/akun/")({
  head: () => ({
    meta: [
      { title: "Akun Saya — MEATHUB" },
      { name: "description", content: "Kelola profil, pesanan, wishlist, dan alamat pengiriman MEATHUB Anda." },
      { property: "og:title", content: "Akun Saya — MEATHUB" },
      { property: "og:description", content: "Kelola profil, pesanan, dan wishlist Anda." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { role, setRole } = useDemoRole();
  const { wishlist } = useCart();
  const orders = listOrders();
  const aktif = orders.filter((o) => !["Selesai", "Dibatalkan"].includes(o.status));
  const belanja = orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0);

  return (
    <MarketLayout>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <RoleNav current="buyer" />
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-maroon/10 text-maroon">
                <User className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-bold text-ink">Rizky Pratama</h1>
                <p className="truncate text-sm text-muted-foreground">
                  PT Boga Rasa Nusantara · {ROLE_LABEL[role]}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => setRole("guest")}>
              <LogOut className="h-4 w-4" aria-hidden="true" /> Keluar demo
            </Button>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total pesanan" value={String(orders.length)} />
            <Stat label="Pesanan aktif" value={String(aktif.length)} />
            <Stat label="Total belanja" value={rupiah(belanja)} />
            <Stat label="Wishlist" value={String(wishlist.length)} />
          </dl>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <NavCard to="/akun/pesanan" icon={Package} title="Pesanan saya" desc="Lacak status & riwayat" />
          <NavCard to="/akun/wishlist" icon={Heart} title="Wishlist" desc={`${wishlist.length} produk disimpan`} />
          <NavCard to="/buyer/addresses" icon={MapPin} title="Alamat" desc="Kelola alamat pengiriman" />
        </div>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink">Pesanan terbaru</h2>
            <Link to="/akun/pesanan" className="text-sm text-maroon underline">Lihat semua</Link>
          </div>
          <ul className="space-y-2">
            {orders.slice(0, 4).map((o) => (
              <li key={o.id}>
                <Link
                  to="/akun/pesanan/$id"
                  params={{ id: o.id }}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-maroon/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate font-semibold text-ink">{o.id}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {tanggal(o.createdAt)} · {o.subOrders.length} vendor
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="outline" className={STATUS_TONE[o.status] ?? ""}>{o.status}</Badge>
                    <div className="mt-1 font-display font-bold text-maroon">{rupiah(o.total)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </MarketLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-bold text-ink">{value}</dd>
    </div>
  );
}

function NavCard({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: "/akun/pesanan" | "/akun/wishlist" | "/buyer/addresses";
  icon: typeof Package;
  title: string;
  desc: string;
}) {
  return (
    <Link to={to} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-maroon/40">
      <Icon className="h-5 w-5 text-maroon" aria-hidden="true" />
      <div className="mt-2 font-semibold text-ink">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}
