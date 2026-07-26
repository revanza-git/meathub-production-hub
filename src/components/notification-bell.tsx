import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  url: string | null;
  severity: "info" | "success" | "warning" | "critical";
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}d lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  const d = Math.floor(h / 24);
  return `${d}h lalu`;
}

const dotColor: Record<Notif["severity"], string> = {
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-600",
};

export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, title, body, url, severity, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setItems(data as Notif[]);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as Notif;
          setItems((prev) => [n, ...prev].slice(0, 30));
          toast(n.title, { description: n.body ?? undefined });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as Notif;
          setItems((prev) => prev.map((x) => (x.id === n.id ? n : x)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const unread = items.filter((n) => !n.read_at).length;

  async function markOne(id: string) {
    await supabase.rpc("mark_notification_read", { _id: id });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
  }
  async function markAll() {
    await supabase.rpc("mark_all_notifications_read");
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-white hover:bg-white/10 hover:text-white"
          aria-label="Notifikasi"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <div className="text-sm font-semibold">Notifikasi</div>
          <Button variant="ghost" size="sm" onClick={markAll} disabled={!unread} className="gap-1 text-xs">
            <CheckCheck className="h-3.5 w-3.5" /> Tandai semua
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Belum ada notifikasi</div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const body = (
                  <div className="flex gap-3 p-3">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotColor[n.severity])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className={cn("text-sm", !n.read_at && "font-semibold")}>{n.title}</div>
                        <div className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</div>
                      </div>
                      {n.body && <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>}
                    </div>
                    {!n.read_at && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markOne(n.id);
                        }}
                        className="shrink-0 self-start rounded p-1 text-muted-foreground hover:bg-accent"
                        aria-label="Tandai dibaca"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
                return (
                  <li key={n.id} className={cn("hover:bg-accent/50", !n.read_at && "bg-accent/30")}>
                    {n.url ? (
                      <Link
                        to={n.url}
                        onClick={() => {
                          if (!n.read_at) markOne(n.id);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
