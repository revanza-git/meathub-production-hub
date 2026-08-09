import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MarketHeader, MobileBottomNav } from "./market-header";

export function MarketFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-ink text-white/80">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-maroon text-[10px] font-bold tracking-widest text-white">
              MH
            </span>
            <span className="font-display text-base font-bold text-white">MEATHUB</span>
          </div>
          <p className="text-xs leading-relaxed">
            Marketplace daging sapi B2B untuk restoran, hotel, katering, dan pelaku usaha kuliner di
            Jabodetabek. Vendor terverifikasi, rantai dingin terjaga.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            Bantuan Pembeli
          </h2>
          <ul className="space-y-1.5 text-xs">
            <li><Link to="/produk" className="hover:text-white">Cara belanja</Link></li>
            <li><Link to="/akun/pesanan" className="hover:text-white">Lacak pesanan</Link></li>
            <li><Link to="/keranjang" className="hover:text-white">Keranjang saya</Link></li>
            <li><Link to="/akun/deposit" className="hover:text-white">Deposit & saldo</Link></li>
            <li><span className="text-white/60">Pengajuan komplain</span></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">Vendor</h2>
          <ul className="space-y-1.5 text-xs">
            <li><Link to="/mitra/daftar" className="hover:text-white">Daftar jadi vendor</Link></li>
            <li><Link to="/mitra" className="hover:text-white">Dasbor vendor</Link></li>
            <li><Link to="/mitra/gudang" className="hover:text-white">Dasbor gudang</Link></li>
            <li><span className="text-white/60">Ketentuan penjual</span></li>
            <li><span className="text-white/60">Panduan settlement</span></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">Kontak</h2>
          <ul className="space-y-1.5 text-xs">
            <li>Hub MEATHUB, Jakarta Utara</li>
            <li>halo@meathub.id</li>
            <li>+62 21 5000 8899</li>
            <li className="pt-2 text-white/50">Instagram · LinkedIn · WhatsApp</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-white/50">
          <span>© 2026 MEATHUB. Prototipe demo — data dan pembayaran bersifat simulasi.</span>
          <span>Syarat & Ketentuan · Kebijakan Privasi</span>
        </div>
      </div>
    </footer>
  );
}

export function MarketLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Lewati ke konten utama
      </a>
      <MarketHeader />
      <main id="konten" className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <MarketFooter />
      <MobileBottomNav />
    </div>
  );
}
