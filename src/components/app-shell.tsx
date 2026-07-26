import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Lewati ke konten utama
      </a>
      <header className="sticky top-0 z-20 border-b bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2" aria-label="Beranda MEATHUB">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-[10px] font-bold tracking-widest">
              MH
            </span>
            <div className="leading-tight">
              <div className="font-display text-sm font-bold">{title}</div>
              {subtitle ? (
                <div className="text-[10px] uppercase tracking-widest text-white/60">
                  {subtitle}
                </div>
              ) : null}
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="gap-2 text-white hover:bg-white/10 hover:text-white"
              aria-label="Keluar dari akun"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Keluar
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">{children}</main>
    </div>
  );
}
