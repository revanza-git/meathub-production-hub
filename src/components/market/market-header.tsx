import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ShoppingCart, Heart, MapPin, Menu, User, LayoutGrid, Home, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/market/data";
import { useCart } from "@/lib/market/cart";
import { useDemoRole, ROLE_LABEL, type Role } from "@/lib/market/role";

export function MarketHeader() {
  const { count, wishlist } = useCart();
  const { role, setRole } = useDemoRole();
  const nav = useNavigate();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    nav({ to: "/produk", search: { q: q || undefined } });
  }

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-maroon-dark text-center text-[11px] text-white/90 sm:text-xs">
        <div className="mx-auto max-w-7xl px-4 py-1.5">
          Gratis ongkir untuk minimum pembelian 20 kg
        </div>
      </div>

      <div className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Beranda MEATHUB">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-maroon text-xs font-bold tracking-widest text-white">
              MH
            </span>
            <span className="hidden font-display text-lg font-bold text-maroon sm:block">MEATHUB</span>
          </Link>

          <form onSubmit={submit} className="min-w-0" role="search">
            <label htmlFor="market-search" className="sr-only">
              Cari produk
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="market-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari daging, potongan, brand, atau vendor"
                className="h-10 rounded-lg pl-9"
              />
            </div>
          </form>

          <div className="flex shrink-0 items-center gap-1">
            <div className="hidden items-center gap-1 lg:flex">
              <MapPin className="h-4 w-4 text-maroon" aria-hidden="true" />
              <Select value={kota} onValueChange={setKota}>
                <SelectTrigger className="h-9 w-[130px] border-none shadow-none" aria-label="Lokasi pengiriman">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KOTA.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Link to="/akun/wishlist" className="hidden sm:block">
              <Button variant="ghost" size="icon" aria-label="Wishlist" className="relative">
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-maroon px-1 text-[10px] font-bold text-white">
                    {wishlist.length}
                  </span>
                )}
              </Button>
            </Link>

            <Link to="/keranjang">
              <Button variant="ghost" size="icon" aria-label="Keranjang" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-maroon px-1 text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </Button>
            </Link>

            <div className="hidden md:block">
              <RoleSwitcher role={role} setRole={setRole} />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Menu MEATHUB</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 p-4">
                  <RoleSwitcher role={role} setRole={setRole} />
                  <nav className="grid gap-1 text-sm">
                    <Link to="/produk" className="rounded-md px-2 py-2 hover:bg-muted">
                      Semua produk
                    </Link>
                    <Link to="/akun" className="rounded-md px-2 py-2 hover:bg-muted">
                      Dasbor pembeli
                    </Link>
                    <Link to="/akun/deposit" className="rounded-md px-2 py-2 hover:bg-muted">
                      Deposit & saldo
                    </Link>
                    <Link to="/mitra" className="rounded-md px-2 py-2 hover:bg-muted">
                      Dasbor vendor (seller)
                    </Link>
                    <Link to="/mitra/gudang" className="rounded-md px-2 py-2 hover:bg-muted">
                      Dasbor gudang
                    </Link>
                    <Link to="/mitra/daftar" className="rounded-md px-2 py-2 hover:bg-muted">
                      Daftar jadi vendor
                    </Link>
                    <Link to="/kelola" className="rounded-md px-2 py-2 hover:bg-muted">
                      Dasbor admin
                    </Link>
                  </nav>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Kategori
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map((c) => (
                        <Link
                          key={c.slug}
                          to="/produk"
                          search={{ kategori: c.slug === "semua" ? undefined : c.slug }}
                          className="rounded-full border border-border px-3 py-1 text-xs"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <nav aria-label="Kategori" className="border-t border-border/60 bg-card">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to="/produk"
                search={{ kategori: c.slug === "semua" ? undefined : c.slug }}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-maroon/10 hover:text-maroon"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}

function RoleSwitcher({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-accent bg-accent/10 px-2 py-1">
      <Badge variant="outline" className="border-accent bg-card text-[10px] uppercase">
        Demo
      </Badge>
      <Select value={role} onValueChange={(v) => setRole(v as Role)}>
        <SelectTrigger className="h-7 w-[150px] border-none bg-transparent text-xs shadow-none" aria-label="Ganti peran demo">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
            <SelectItem key={r} value={r} className="text-xs">
              {ROLE_LABEL[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function MobileBottomNav() {
  const { count } = useCart();
  const items = [
    { to: "/", label: "Beranda", icon: Home },
    { to: "/produk", label: "Kategori", icon: LayoutGrid },
    { to: "/keranjang", label: "Keranjang", icon: ShoppingCart, badge: count },
    { to: "/akun/pesanan", label: "Pesanan", icon: Package },
    { to: "/akun", label: "Akun", icon: User },
  ] as const;
  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map((it) => (
          <li key={it.to} className="flex-1">
            <Link
              to={it.to}
              className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-ink-soft"
              activeProps={{ className: "text-maroon" }}
              activeOptions={{ exact: it.to === "/" }}
            >
              <span className="relative">
                <it.icon className="h-5 w-5" aria-hidden="true" />
                {"badge" in it && it.badge ? (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-maroon px-1 text-[9px] font-bold text-white">
                    {it.badge}
                  </span>
                ) : null}
              </span>
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
