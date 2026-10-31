import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Search, RefreshCw, ArrowLeft, MessageCircle, RotateCcw, ChevronRight } from "lucide-react";
import { AppShell, RoleGate } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { ChatThread } from "@/components/chat/chat-thread";
import { adminChats, closeChat } from "@/lib/meatlink/chat.functions";
import { useBi } from "@/lib/i18n";
export const Route = createFileRoute("/_authenticated/admin/chat")({
  validateSearch: z.object({
    conversation: z.string().uuid().optional().catch(undefined),
    context: z.string().max(300).catch(""),
  }),
  head: () => ({
    meta: [
      { title: "Chat pelanggan — Admin Meatlink" },
      { name: "description", content: "Kotak masuk percakapan pelanggan Meatlink." },
      { property: "og:title", content: "Kotak masuk chat — Meatlink" },
      { property: "og:description", content: "Kelola dan balas percakapan pelanggan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});
function Page() {
  const bi = useBi();
  return (
    <AppShell title={bi("Chat pelanggan", "Customer chat")}>
      <RoleGate allow="admin">
        <Inbox />
      </RoleGate>
    </AppShell>
  );
}
function Inbox() {
  const navigate = Route.useNavigate();
  const bi = useBi(),
    { conversation, context } = Route.useSearch(),
    [id, setId] = useState(conversation || ""),
    [search, setSearch] = useState(context),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    list = useServerFn(adminChats),
    close = useServerFn(closeChat);
  useEffect(() => { setId(conversation || ""); }, [conversation]);
  function openConversation(next: string) {
    setId(next);
    setError("");
    void navigate({ search: { conversation: next || undefined, context }, replace: false });
  }
  const q = useQuery({
    queryKey: ["chat-inbox"],
    queryFn: () => list(),
    staleTime: 0,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });
  const selected = q.data?.find((c) => c.id === id),
    rows = (q.data || []).filter(
      (c) =>
        `${c.customer_name} ${c.customer_email} ${c.context_label} ${c.last_message}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (filter === "all" ||
          (filter === "unread" && c.last_sender_kind === "customer" && c.status !== "closed") ||
          (filter === "closed" && c.status === "closed") ||
          (filter === "active" && c.status === "active")),
    );
  async function toggle() {
    if (!id || busy) return;
    setBusy(true);
    try {
      await close({ data: { id, closed: selected?.status !== "closed" } });
      await q.refetch();
    } catch {
      setError(bi("Status belum diperbarui.", "Could not update status."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid min-w-0 overflow-hidden rounded-md border border-line bg-background lg:h-[720px] lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="flex min-h-0 min-w-0 flex-col border-line lg:border-r">
        <div className="border-b border-line p-4">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0"><p className="text-base font-semibold text-foreground">{bi("Kotak masuk", "Inbox")}</p><p className="mt-1 text-xs text-muted-foreground">{q.data?.filter((c) => c.last_sender_kind === "customer" && c.status !== "closed").length || 0} {bi("menunggu balasan", "awaiting reply")}</p></div>
            <Button variant="ghost" size="icon" aria-label={bi("Segarkan percakapan", "Refresh conversations")} onClick={() => void q.refetch()}><RefreshCw className={`h-4 w-4 ${q.isFetching ? "motion-safe:animate-spin" : ""}`} /></Button>
          </div>
          <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2">
            <Search className="h-4 w-4 text-ash" />
            <input
              aria-label={bi("Cari percakapan", "Search conversations")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={bi("Nama, email, produk…", "Name, email, product…")}
              className="min-w-0 flex-1 bg-background py-1 text-base outline-none"
            />
          </label>
          <div role="group" aria-label={bi("Filter chat", "Chat filter")} className="mt-3 grid grid-cols-2 gap-2">{[
            ["all",bi("Semua", "All")], ["unread",bi("Belum dibalas", "Awaiting reply")], ["active",bi("Aktif", "Active")], ["closed",bi("Selesai", "Closed")],
          ].map(([value,label]) => <Button key={value} size="sm" variant={filter === value ? "secondary" : "ghost"} aria-pressed={filter === value} onClick={() => setFilter(value)} className="min-w-0 whitespace-normal">{label}</Button>)}</div>
        </div>
        <div className="min-h-0 max-h-[65dvh] flex-1 overflow-y-auto overscroll-contain lg:max-h-none">
          {q.isPending ? (
            <p className="p-4 text-sm text-ash">{bi("Memuat…", "Loading…")}</p>
          ) : q.error ? (
            <Button variant="ghost" onClick={() => void q.refetch()}>
              <RefreshCw />
              {bi("Coba lagi", "Retry")}
            </Button>
          ) : !rows.length ? (
            <p className="p-6 text-sm text-ash">
              {bi("Belum ada percakapan yang cocok.", "No matching conversations.")}
            </p>
          ) : (
            rows.map((c) => (
              <Button
                key={c.id}
                variant="ghost"
                onClick={() => openConversation(c.id)}
                className={`grid h-auto w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 whitespace-normal rounded-none border-b border-line px-4 py-4 text-left ${c.id === id ? "bg-accent" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-foreground">{c.customer_name}</span>
                  <span className="mt-1 block truncate text-xs text-ash">
                    {c.context_label || c.customer_email}
                  </span>
                  <span className="mt-2 line-clamp-2 break-words text-sm font-normal leading-relaxed text-foreground">{c.last_message || bi("Belum ada pesan", "No messages yet")}</span>
                  <span className={`mt-2 inline-flex items-center gap-1 text-xs ${c.status === "closed" ? "text-status-ok" : c.last_sender_kind === "customer" ? "text-primary" : "text-muted-foreground"}`}>
                    {c.status === "closed" ? <Check className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                    {c.status === "closed" ? bi("Selesai", "Closed") : c.last_sender_kind === "customer" ? bi("Menunggu balasan", "Awaiting reply") : bi("Sudah dibalas", "Replied")}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-3"><span className="text-[11px] font-normal text-muted-foreground">{new Date(c.last_message_at).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}<span className="mt-1 block">{new Date(c.last_message_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</span></span>
                {c.admin_unread > 0 ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {c.admin_unread}
                  </span>
                ) : null}
                <ChevronRight className="h-4 w-4 text-muted-foreground" /></span>
              </Button>
            ))
          )}
        </div>
      </aside>
      <div className={`${id ? "fixed inset-0 z-[80] flex h-dvh bg-background lg:relative lg:inset-auto lg:z-auto lg:h-full" : "hidden lg:flex"} min-h-0 min-w-0 flex-col`}>
        {id ? (
          <>
            <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-line px-3 py-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={bi("Kembali ke percakapan", "Back to conversations")} onClick={() => openConversation("")}><ArrowLeft className="h-5 w-5" /></Button>
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{selected?.customer_name || bi("Percakapan", "Conversation")}</p><p className="mt-1 truncate text-xs text-muted-foreground">{selected?.customer_email}</p></div>
              <Button variant={selected?.status === "closed" ? "outline" : "secondary"} size="sm" disabled={busy || !selected} onClick={() => void toggle()} className="shrink-0">
                {selected?.status === "closed" ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {selected?.status === "closed"
                  ? bi("Buka kembali", "Reopen")
                  : bi("Selesai", "Close")}
              </Button>
            </div>
            {error ? <p className="px-4 text-xs text-crimson">{error}</p> : null}
            <ChatThread key={id} access={{ id }} admin />
          </>
        ) : (
          <p className="m-auto text-sm text-ash">
            {bi("Pilih percakapan", "Select a conversation")}
          </p>
        )}
      </div>
    </div>
  );
}
