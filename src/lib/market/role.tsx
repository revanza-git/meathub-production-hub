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
  admin: "Admin MEATHUB",
};

/** Halaman dasbor utama untuk tiap peran. */
export const ROLE_HOME: Record<Role, string> = {
  guest: "/",
  buyer: "/akun",
  vendor: "/mitra",
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
    { to: "/akun/wishlist", label: "Wishlist", desc: "Produk disimpan" },
    { to: "/keranjang", label: "Keranjang", desc: "Lanjut checkout" },
  ],
  vendor: [
    { to: "/mitra", label: "Ringkasan", desc: "Omzet & antrean PO" },
    { to: "/mitra", label: "Konfirmasi PO", desc: "Stok, gramasi, expired" },
    { to: "/mitra", label: "Pengiriman", desc: "Kirim dari cold storage" },
    { to: "/mitra", label: "Pencairan", desc: "Dana vendor & penarikan" },
    { to: "/produk", label: "Katalog publik", desc: "Lihat sisi pembeli" },
  ],
  admin: [
    { to: "/kelola", label: "Ringkasan platform", desc: "GMV, fee, SLA" },
    { to: "/kelola", label: "Vendor & KYB", desc: "Approve mitra" },
    { to: "/kelola", label: "Pesanan & refund", desc: "Intervensi manual" },
    { to: "/kelola", label: "Konfigurasi", desc: "SLA & app fee" },
  ],
};
