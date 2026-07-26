import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-[10px] font-bold tracking-widest">
              SB
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
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="gap-2 text-white hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
