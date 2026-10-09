import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Wordmark } from "@/components/site/site-header";
import { LanguageToggle } from "@/components/site/language-toggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBi } from "@/lib/i18n";
import type { MlRole } from "@/lib/meatlink/orders";

type NavItem = { to: string; label: { id: string; en: string } };

const NAV: Record<MlRole, NavItem[]> = {
  buyer: [
    { to: "/app/orders", label: { id: "Pesanan", en: "Orders" } },
    { to: "/app/alamat", label: { id: "Alamat Kirim", en: "Delivery Addresses" } },
    { to: "/app/rfq", label: { id: "Penawaran Saya", en: "My Quotes" } },
    { to: "/app/stock", label: { id: "Stok Tersedia", en: "Available Stock" } },
  ],
  vendor: [
    { to: "/vendor/catalog", label: { id: "Katalog & Stok", en: "Catalogue & Stock" } },
    { to: "/vendor/import", label: { id: "Impor Massal", en: "Bulk Import" } },
  ],
  admin: [
    { to: "/admin/dashboard", label: { id: "Dasbor", en: "Dashboard" } },
    { to: "/admin/orders", label: { id: "Pesanan", en: "Orders" } },
    { to: "/admin/rfq", label: { id: "Permintaan Penawaran", en: "Quote Requests" } },
    { to: "/admin/inventory", label: { id: "Inventaris", en: "Inventory" } },
    { to: "/admin/commerce", label: { id: "Promo & Kredit", en: "Promo & Credit" } },
    { to: "/admin/reports", label: { id: "Laporan", en: "Reports" } },
    { to: "/admin/insights", label: { id: "Insight", en: "Insights" } },
    { to: "/admin/users", label: { id: "Pengguna", en: "Users" } },
    { to: "/admin/settings", label: { id: "Pengaturan", en: "Settings" } },

  ],

};

const ROLE_LABEL: Record<MlRole, { id: string; en: string }> = {
  buyer: { id: "Ruang kerja Pembeli", en: "Buyer workspace" },
  vendor: { id: "Ruang kerja Pemasok", en: "Vendor workspace" },
  admin: { id: "Konsol Admin", en: "Admin console" },
};

export function AppShell({
  title,
  intro,
  actions,
  children,
}: {
  title: string;
  intro?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { role, user, loading, contactComplete } = useAuth();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const bi = useBi();
  const items = role ? NAV[role] : [];
  const contactIncomplete = !loading && role === "buyer" && !contactComplete;
  const needsContact = contactIncomplete && pathname !== "/app/profil";

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bone">
      <header className="border-b border-white/10 bg-noir">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Wordmark tone="dark" />
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-bone/55 sm:block">{user?.email}</span>
            <LanguageToggle dark />
            <button
              type="button"
              onClick={() => void signOut()}
              className="eyebrow border border-white/25 px-4 py-2 text-bone transition-colors hover:bg-white/10"
            >
              {bi("Keluar", "Sign out")}
            </button>
          </div>
        </div>
        <div className="border-t border-white/10">
          <nav
            aria-label="Workspace"
            className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-5 py-3 lg:px-8"
          >
            <span className="eyebrow text-crimson">
              {role ? bi(ROLE_LABEL[role].id, ROLE_LABEL[role].en) : bi("Ruang Kerja", "Workspace")}
            </span>
            {(contactIncomplete ? [] : items).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="eyebrow text-bone/65 transition-colors hover:text-bone"
                activeProps={{ className: "text-bone" }}
                activeOptions={{ exact: item.to === "/app/orders" }}
              >
                {bi(item.label.id, item.label.en)}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-ink">{title}</h1>
            {intro ? <p className="mt-2 max-w-2xl text-sm text-ash">{intro}</p> : null}
          </div>
          {!needsContact ? actions : null}
        </div>
        <div className="mt-8">
          {loading ? <p className="text-sm text-ash">{bi("Memuat…", "Loading…")}</p> : needsContact ? (
            <Panel className="max-w-xl p-8">
              <h2 className="font-display text-xl text-ink">{bi("Lengkapi kontak akun Anda", "Complete your account contact details")}</h2>
              <p className="mt-2 text-sm text-ash">{bi("Email dan nomor telepon wajib diisi sebelum melanjutkan.", "Email and phone number are required before continuing.")}</p>
              <Link to="/app/profil" className="eyebrow mt-6 inline-flex bg-crimson px-5 py-3 text-bone">{bi("Lengkapi sekarang", "Complete now")}</Link>
            </Panel>
          ) : children}
        </div>
      </main>
    </div>
  );
}

export function RoleGate({ allow, children }: { allow: MlRole; children: ReactNode }) {
  const { role, loading } = useAuth();
  const bi = useBi();
  if (loading) return <p className="text-sm text-ash">{bi("Memuat…", "Loading…")}</p>;
  if (role !== allow) {
    return (
      <div className="border border-line bg-card p-8">
        <h2 className="font-display text-xl text-ink">
          {bi("Tidak tersedia untuk akun Anda", "Not available for your account")}
        </h2>
        <p className="mt-2 text-sm text-ash">
          {bi(
            `Area ini hanya untuk akun ${allow}. Hubungi Meatlink jika menurut Anda ini keliru.`,
            `This area is limited to ${allow} accounts. Contact Meatlink if you believe this is wrong.`,
          )}
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-line bg-card ${className}`}>{children}</div>;
}
