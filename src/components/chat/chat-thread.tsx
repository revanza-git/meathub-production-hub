import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, Check, Clock3, RefreshCw, MessageCircle, ArrowDown, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBi } from "@/lib/i18n";
import { readChat, sendChat, adminReadChat, adminReplyChat } from "@/lib/meatlink/chat.functions";
import { chatMessageSchema, type ChatAccess, type ChatConversation, type ChatMessage } from "@/lib/meatlink/chat-schema";
import { composeChatMessage } from "@/lib/meatlink/chat-compose";
export function ChatThread({ access, admin = false, context = "", visible = true }: { access: ChatAccess; admin?: boolean; context?: string; visible?: boolean }) {
  const bi = useBi(),
    qc = useQueryClient(),
    read = useServerFn(readChat),
    readAdmin = useServerFn(adminReadChat),
    send = useServerFn(sendChat),
    reply = useServerFn(adminReplyChat);
  const [body, setBody] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [outgoing, setOutgoing] = useState<(ChatMessage & { delivery: "sending" | "sent" | "failed" }) | null>(null);
  const [nearBottom, setNearBottom] = useState(true);
  const scroll = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const draft = useRef<{ body: string; id: string } | null>(null),
    bottom = useRef<HTMLDivElement>(null);
  const appliedContext = useRef("");
  useEffect(() => {
    if (!admin && context && appliedContext.current !== context) {
      appliedContext.current = context;
      setBody((current) => current);
    }
  }, [context, admin]);
  const q = useQuery<{ conversation: ChatConversation; messages: ChatMessage[] }>({
    queryKey: ["chat-thread", admin ? "admin" : "customer", access.id, access.token || ""],
    queryFn: () => (admin ? readAdmin({ data: { id: access.id } }) : read({ data: access })),
    staleTime: 0,
    enabled: visible,
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  useEffect(() => {
    if (nearBottom || outgoing?.delivery === "sending") {
      if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
    }
  }, [q.data?.messages.length, outgoing, nearBottom, visible]);
  useEffect(() => {
    if (outgoing && q.data?.messages.some((m) => m.id === outgoing.id)) setOutgoing(null);
  }, [q.data?.messages, outgoing]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || pending) return;
    const messageId = draft.current?.body === body ? draft.current.id : crypto.randomUUID();
    draft.current = { body, id: messageId };
    const parsed = chatMessageSchema.safeParse({ messageId, body: composeChatMessage(body, admin ? "" : context) });
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
    const text = body;
    setOutgoing({ id: messageId, body: parsed.data.body, sender_kind: admin ? "admin" : "customer", sender_name: bi("Anda", "You"), created_at: new Date().toISOString(), delivery: "sending" });
    setBody("");
    setNearBottom(true);
    composer.current?.focus();
    try {
      if (admin) await reply({ data: { id: access.id, ...parsed.data } });
      else await send({ data: { ...access, ...parsed.data } });
      setOutgoing((message) => message ? { ...message, delivery: "sent" } : null);
      draft.current = null;
      void q.refetch();
      void qc.invalidateQueries({ queryKey: ["chat-inbox"] });
      void qc.invalidateQueries({ queryKey: ["chat-mine"] });
    } catch {
      setOutgoing((message) => message ? { ...message, delivery: "failed" } : null);
      setBody((current) => current || text);
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
          <MessageCircle className="mr-2 inline h-4 w-4 text-primary" />
          {admin ? q.data?.conversation.customer_name : bi("Tim Meatlink", "Meatlink team")}
        </p>
        {!admin ? <p className="mt-1 text-xs text-muted-foreground">{bi("Balasan mengikuti ketersediaan tim.", "Replies depend on team availability.")}</p> : null}
        <p className="mt-1 break-words text-xs text-ash">
          {(!admin && context) || q.data?.conversation.context_label ||
            bi("Percakapan pelanggan", "Customer conversation")}
        </p>
        {q.data?.conversation.status === "closed" ? (
          <p className="mt-1 text-xs text-status-ok">{bi("Selesai", "Closed")}</p>
        ) : null}
      </div>
      <div ref={scroll} onScroll={() => { const el = scroll.current; if (el) setNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80); }} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4 overscroll-contain">
        {q.isPending ? (
          <div role="status" className="space-y-4 motion-safe:animate-pulse"><div className="h-14 w-2/3 rounded-md bg-muted" /><div className="ml-auto h-16 w-3/4 rounded-md bg-muted" /><span className="sr-only">{bi("Memuat pesan…", "Loading messages…")}</span></div>
        ) : q.error ? (
          <div className="text-sm text-crimson">
            {bi("Percakapan belum dapat dimuat.", "Could not load conversation.")}
            <Button variant="ghost" onClick={() => void q.refetch()}>
              <RefreshCw />
              {bi("Coba lagi", "Retry")}
            </Button>
          </div>
        ) : !q.data?.messages.length && !outgoing ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center text-sm text-ash">
            <MessageCircle className="h-8 w-8 text-primary" />
            {bi("Apa yang ingin Anda tanyakan?", "What would you like to ask?")}
            <div className="flex flex-wrap justify-center gap-2">{[bi("Apakah stok tersedia?", "Is this in stock?"), bi("Informasi pengiriman", "Delivery information")].map((text) => <Button key={text} variant="outline" size="sm" onClick={() => { setBody(text); composer.current?.focus(); }}>{text}<ArrowUpRight className="h-3 w-3" /></Button>)}</div>
          </div>
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
                    {own ? <Check aria-label={bi("Terkirim", "Sent")} className="h-3 w-3" /> : null}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {outgoing && !q.data?.messages.some((m) => m.id === outgoing.id) ? <div className="flex justify-end"><div className="max-w-[88%] rounded-md bg-primary px-4 py-3 text-primary-foreground"><p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{outgoing.body}</p><p role="status" className="mt-2 flex items-center justify-end gap-1 text-[10px] opacity-80">{outgoing.delivery === "sending" ? <Clock3 className="h-3 w-3" /> : outgoing.delivery === "sent" ? <Check className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}{outgoing.delivery === "sending" ? bi("Mengirim…", "Sending…") : outgoing.delivery === "sent" ? bi("Terkirim", "Sent") : bi("Belum terkirim · coba lagi", "Not sent · retry")}</p></div></div> : null}
        <div ref={bottom} />
      </div>
      {!nearBottom ? <Button variant="secondary" size="sm" className="self-center" onClick={() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; setNearBottom(true); }}><ArrowDown className="h-4 w-4" />{bi("Pesan terbaru", "Latest messages")}</Button> : null}
      <form onSubmit={submit} className="border-t border-line p-3">
        {error ? (
          <p role="alert" className="mb-2 text-xs text-crimson">
            {error}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            ref={composer}
            aria-label={bi("Pesan", "Message")}
            rows={2}
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            placeholder={bi("Tulis pesan…", "Write a message…")}
            className="min-w-0 flex-1 resize-none rounded-md border border-input bg-background px-3 py-3 text-base text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
          <Button
            type="submit"
            size="icon"
            className="h-12 w-12 shrink-0"
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
