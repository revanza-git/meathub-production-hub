import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "guest" | "buyer" | "vendor" | "admin";

const KEY = "meathub.demo.role";

type Ctx = { role: Role; setRole: (r: Role) => void; isLoggedIn: boolean };
const RoleContext = createContext<Ctx>({ role: "guest", setRole: () => {}, isLoggedIn: false });

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("guest");

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Role | null;
    if (saved) setRoleState(saved);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      role,
      isLoggedIn: role !== "guest",
      setRole: (r) => {
        setRoleState(r);
        localStorage.setItem(KEY, r);
      },
    }),
    [role],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export const useDemoRole = () => useContext(RoleContext);

export const ROLE_LABEL: Record<Role, string> = {
  guest: "Tamu (belum login)",
  buyer: "Pembeli",
  vendor: "Vendor",
  warehouse: "Gudang MEATHUB",
  admin: "Admin MEATHUB",
};

/** Halaman dasbor utama untuk tiap peran. */
export const ROLE_HOME: Record<Role, string> = {
  guest: "/",
  buyer: "/akun",
  vendor: "/mitra",
  warehouse: "/mitra/gudang",
  admin: "/kelola",
};

export type RoleNavItem = { to: string; label: string; desc: string };

/** Menu kerja tiap peran — dipakai sebagai sub-navigasi dasbor. */
export const ROLE_NAV: Record<Role, RoleNavItem[]> = {
  guest: [
    { to: "/produk", label: "Katalog", desc: "Jelajahi produk" },
    { to: "/mitra/daftar", label: "Daftar vendor", desc: "Gabung jadi mitra" },
    { to: "/auth", label: "Masuk", desc: "Login / daftar akun" },
  ],
  buyer: [
    { to: "/akun", label: "Ringkasan", desc: "KPI belanja" },
    { to: "/akun/pesanan", label: "Pesanan", desc: "Status & konfirmasi terima" },
    { to: "/akun/deposit", label: "Deposit", desc: "Saldo & top up" },
    { to: "/akun/wishlist", label: "Wishlist", desc: "Produk disimpan" },
    { to: "/keranjang", label: "Keranjang", desc: "Lanjut checkout" },
  ],
  vendor: [
    { to: "/mitra", label: "Ringkasan", desc: "Omzet & pesanan" },
    { to: "/mitra", label: "Produk", desc: "Kelola katalog toko" },
    { to: "/mitra", label: "Pencairan", desc: "Ajukan settlement" },
    { to: "/produk", label: "Katalog publik", desc: "Lihat sisi pembeli" },
  ],
  warehouse: [
    { to: "/mitra/gudang", label: "Antrian verifikasi", desc: "SLA penerimaan barang" },
    { to: "/akun/pesanan", label: "Pesanan berjalan", desc: "Pantau pengiriman" },
    { to: "/produk", label: "Katalog", desc: "Referensi produk" },
  ],
  admin: [
    { to: "/kelola", label: "Ringkasan platform", desc: "GMV, fee, SLA" },
    { to: "/kelola", label: "Vendor & KYB", desc: "Approve mitra" },
    { to: "/kelola", label: "Pesanan & refund", desc: "Intervensi manual" },
    { to: "/kelola", label: "Konfigurasi", desc: "SLA & app fee" },
    { to: "/mitra/gudang", label: "Gudang", desc: "Pantau verifikasi" },
  ],
};
