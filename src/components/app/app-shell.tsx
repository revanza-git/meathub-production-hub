import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Wordmark } from "@/components/site/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { MlRole } from "@/lib/meatlink/orders";

type NavItem = { to: string; label: string };

const NAV: Record<MlRole, NavItem[]> = {
  buyer: [
    { to: "/app/orders", label: "My Orders" },
    { to: "/app/orders/new", label: "New Order" },
    { to: "/app/rfq", label: "My RFQs" },
    { to: "/app/stock", label: "Available Stock" },
  ],
  vendor: [
    { to: "/vendor/catalog", label: "Catalogue & Stock" },
    { to: "/vendor/import", label: "Bulk Import" },
  ],
  admin: [
    { to: "/admin/orders", label: "Orders" },
    { to: "/admin/rfq", label: "RFQ Inbox" },
    { to: "/admin/storefront-orders", label: "Storefront Orders" },
    { to: "/admin/inventory", label: "Inventory" },
    { to: "/admin/insights", label: "Insights" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/settings", label: "Settings" },

  ],

};

const ROLE_LABEL: Record<MlRole, string> = {
  buyer: "Buyer workspace",
  vendor: "Vendor workspace",
  admin: "Admin console",
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
  const { role, user, loading } = useAuth();
  const navigate = useNavigate();
  const items = role ? NAV[role] : [];

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
            <button
              type="button"
              onClick={() => void signOut()}
              className="eyebrow border border-white/25 px-4 py-2 text-bone transition-colors hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="border-t border-white/10">
          <nav
            aria-label="Workspace"
            className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-5 py-3 lg:px-8"
          >
            <span className="eyebrow text-crimson">{role ? ROLE_LABEL[role] : "Workspace"}</span>
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="eyebrow text-bone/65 transition-colors hover:text-bone"
                activeProps={{ className: "text-bone" }}
                activeOptions={{ exact: item.to === "/app/orders" }}
              >
                {item.label}
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
          {actions}
        </div>
        <div className="mt-8">{loading ? <p className="text-sm text-ash">Loading…</p> : children}</div>
      </main>
    </div>
  );
}

export function RoleGate({ allow, children }: { allow: MlRole; children: ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) return <p className="text-sm text-ash">Loading…</p>;
  if (role !== allow) {
    return (
      <div className="border border-line bg-card p-8">
        <h2 className="font-display text-xl text-ink">Not available for your account</h2>
        <p className="mt-2 text-sm text-ash">
          This area is limited to {allow} accounts. Contact Meatlink if you believe this is wrong.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-line bg-card ${className}`}>{children}</div>;
}
