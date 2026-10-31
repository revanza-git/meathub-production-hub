import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Search, RefreshCw } from "lucide-react";
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
  const bi = useBi(),
    { conversation, context } = Route.useSearch(),
    [id, setId] = useState(conversation || ""),
    [search, setSearch] = useState(context),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    list = useServerFn(adminChats),
    close = useServerFn(closeChat);
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
    <div className="grid min-h-[620px] overflow-hidden rounded-md border border-line bg-background lg:grid-cols-[340px_1fr]">
      <aside className="border-b border-line lg:border-b-0 lg:border-r">
        <div className="border-b border-line p-4">
          <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2">
            <Search className="h-4 w-4 text-ash" />
            <input
              aria-label={bi("Cari percakapan", "Search conversations")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-background text-sm outline-none"
            />
          </label>
          <select
            aria-label={bi("Filter chat", "Chat filter")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mt-3 w-full border border-input bg-background p-2 text-sm"
          >
            <option value="all">{bi("Semua", "All")}</option>
            <option value="unread">{bi("Belum dibalas", "Awaiting reply")}</option>
            <option value="active">{bi("Aktif", "Active")}</option>
            <option value="closed">{bi("Selesai", "Closed")}</option>
          </select>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
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
                onClick={() => setId(c.id)}
                className={`h-auto w-full justify-start whitespace-normal rounded-none border-b border-line px-4 py-4 text-left ${c.id === id ? "bg-accent" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{c.customer_name}</span>
                  <span className="mt-1 block truncate text-xs text-ash">
                    {c.context_label || c.customer_email}
                  </span>
                  <span className="mt-1 block truncate text-sm text-ash">{c.last_message}</span>
                  <span className="mt-2 block text-[10px] text-ash">
                    {new Date(c.last_message_at).toLocaleString("id-ID")}
                  </span>
                </span>
                {c.admin_unread > 0 ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {c.admin_unread}
                  </span>
                ) : null}
              </Button>
            ))
          )}
        </div>
      </aside>
      <div className="flex h-[680px] min-w-0 flex-col">
        {id ? (
          <>
            <div className="flex items-center justify-between border-b border-line px-4 py-2">
              <p className="min-w-0 truncate text-xs text-ash">{selected?.customer_email}</p>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void toggle()}>
                <Check />
                {selected?.status === "closed"
                  ? bi("Buka kembali", "Reopen")
                  : bi("Tandai selesai", "Mark closed")}
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
