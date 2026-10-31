import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, CheckCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBi } from "@/lib/i18n";
import { readChat, sendChat, adminReadChat, adminReplyChat } from "@/lib/meatlink/chat.functions";
import { chatMessageSchema, type ChatAccess, type ChatConversation, type ChatMessage } from "@/lib/meatlink/chat-schema";
export function ChatThread({ access, admin = false, context = "" }: { access: ChatAccess; admin?: boolean; context?: string }) {
  const bi = useBi(),
    qc = useQueryClient(),
    read = useServerFn(readChat),
    readAdmin = useServerFn(adminReadChat),
    send = useServerFn(sendChat),
    reply = useServerFn(adminReplyChat);
  const [body, setBody] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const draft = useRef<{ body: string; id: string } | null>(null),
    bottom = useRef<HTMLDivElement>(null);
  const appliedContext = useRef("");
  useEffect(() => {
    if (!admin && context && appliedContext.current !== context) {
      appliedContext.current = context;
      setBody((current) => current || `${context}\n\n`);
    }
  }, [context, admin]);
  const q = useQuery<{ conversation: ChatConversation; messages: ChatMessage[] }>({
    queryKey: ["chat-thread", admin ? "admin" : "customer", access.id, access.token || ""],
    queryFn: () => (admin ? readAdmin({ data: { id: access.id } }) : read({ data: access })),
    staleTime: 0,
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [q.data?.messages.length]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || pending) return;
    const messageId = draft.current?.body === body ? draft.current.id : crypto.randomUUID();
    draft.current = { body, id: messageId };
    const parsed = chatMessageSchema.safeParse({ messageId, body });
    if (!parsed.success) {
      setError(
        bi(
          "Pesan wajib diisi, maksimal 4.000 karakter.",
          "Enter a message up to 4,000 characters.",
        ),
      );
      return;
    }
    setPending(true);
    setError("");
    try {
      if (admin) await reply({ data: { id: access.id, ...parsed.data } });
      else await send({ data: { ...access, ...parsed.data, body: context && !parsed.data.body.includes(context) ? `${context}\n\n${parsed.data.body}` : parsed.data.body } });
      setBody("");
      draft.current = null;
      await q.refetch();
      void qc.invalidateQueries({ queryKey: ["chat-inbox"] });
    } catch {
      setError(
        bi(
          "Pesan belum terkirim. Coba lagi; isi pesan tetap tersimpan.",
          "Message not sent. Try again; your draft is preserved.",
        ),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-4 py-3">
        <p className="text-sm font-medium text-ink">
          {admin ? q.data?.conversation.customer_name : bi("Tim Meatlink", "Meatlink team")}
        </p>
        <p className="mt-1 break-words text-xs text-ash">
          {(!admin && context) || q.data?.conversation.context_label ||
            bi("Percakapan pelanggan", "Customer conversation")}
        </p>
        {q.data?.conversation.status === "closed" ? (
          <p className="mt-1 text-xs text-status-ok">{bi("Selesai", "Closed")}</p>
        ) : null}
      </div>
      <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {q.isPending ? (
          <p className="text-sm text-ash">{bi("Memuat pesan…", "Loading messages…")}</p>
        ) : q.error ? (
          <div className="text-sm text-crimson">
            {bi("Percakapan belum dapat dimuat.", "Could not load conversation.")}
            <Button variant="ghost" onClick={() => void q.refetch()}>
              <RefreshCw />
              {bi("Coba lagi", "Retry")}
            </Button>
          </div>
        ) : !q.data?.messages.length ? (
          <p className="py-10 text-center text-sm text-ash">
            {bi("Apa yang ingin Anda tanyakan?", "What would you like to ask?")}
          </p>
        ) : (
          q.data.messages.map((m) => {
            const own = admin ? m.sender_kind === "admin" : m.sender_kind === "customer";
            return (
              <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-md px-4 py-3 ${own ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                >
                  <p className="mb-1 text-xs opacity-70">
                    {m.sender_name}
                    {m.sender_kind === "admin" ? " · Meatlink" : ""}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                    {m.body}
                  </p>
                  <p className="mt-2 flex items-center justify-end gap-1 text-[10px] opacity-70">
                    {new Date(m.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {own ? <CheckCheck className="h-3 w-3" /> : null}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottom} />
      </div>
      <form onSubmit={submit} className="border-t border-line p-3">
        {error ? (
          <p role="alert" className="mb-2 text-xs text-crimson">
            {error}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            aria-label={bi("Pesan", "Message")}
            rows={2}
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={bi("Tulis pesan…", "Write a message…")}
            className="min-w-0 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <Button
            type="submit"
            size="icon"
            disabled={pending || !body.trim() || q.isPending || !!q.error}
            aria-label={bi("Kirim pesan", "Send message")}
          >
            <Send />
          </Button>
        </div>
        <p className="mt-2 text-[10px] text-ash">
          {pending
            ? bi("Mengirim…", "Sending…")
            : bi("Balasan mengikuti ketersediaan tim.", "Replies depend on team availability.")}
        </p>
      </form>
    </div>
  );
}
