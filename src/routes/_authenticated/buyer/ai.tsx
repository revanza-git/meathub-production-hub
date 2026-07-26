import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, Send, Plus, Trash2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  listConversations, createConversation, listMessages, sendChatMessage,
  deleteConversation, getFlag,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/buyer/ai")({
  head: () => ({ meta: [
    { title: "AI Meat Consultant — MEATHUB" },
    { name: "description", content: "Tanya AI konsultan daging untuk rekomendasi cut, grade, dan porsi." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AIPage,
});

function AIPage() {
  const flagFn = useServerFn(getFlag);
  const { data: flag, isLoading: flagLoading } = useQuery({
    queryKey: ["flag", "ai_consultant"],
    queryFn: () => flagFn({ data: { key: "ai_consultant" } }),
  });

  if (flagLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Memuat…</div>;
  }
  if (!flag?.enabled) {
    return (
      <AppShell title="AI Meat Consultant" subtitle="Fitur P1">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Belum tersedia</CardTitle>
              <CardDescription>
                Fitur AI Meat Consultant sedang dinonaktifkan oleh admin. Hubungi tim platform bila Anda ingin mengakses uji coba.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppShell>
    );
  }
  return <AIChat />;
}

function AIChat() {
  const qc = useQueryClient();
  const listFn = useServerFn(listConversations);
  const createFn = useServerFn(createConversation);
  const delFn = useServerFn(deleteConversation);

  const [activeId, setActiveId] = useState<string | null>(null);
  const convs = useQuery({ queryKey: ["ai-convs"], queryFn: () => listFn() });

  useEffect(() => {
    if (!activeId && convs.data && convs.data.length > 0) setActiveId(convs.data[0].id);
  }, [convs.data, activeId]);

  const create = useMutation({
    mutationFn: () => createFn({ data: {} }),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["ai-convs"] });
      setActiveId(r.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: async (_r, id) => {
      await qc.invalidateQueries({ queryKey: ["ai-convs"] });
      if (activeId === id) setActiveId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="AI Meat Consultant" subtitle="Rekomendasi cut & porsi">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Percakapan</CardTitle>
            <Button size="sm" variant="outline" onClick={() => create.mutate()} disabled={create.isPending}>
              <Plus className="mr-1 h-3 w-3" /> Baru
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {(convs.data ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground">Belum ada percakapan.</div>
            )}
            {(convs.data ?? []).map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between rounded border p-2 text-xs ${
                  activeId === c.id ? "border-primary bg-primary/5" : ""
                }`}
              >
                <button className="flex-1 text-left" onClick={() => setActiveId(c.id)}>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(c.updated_at).toLocaleString("id-ID")}
                  </div>
                </button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="flex min-h-[70vh] flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" /> Konsultan daging
            </CardTitle>
            <CardDescription>
              Ceritakan kebutuhan Anda — jenis masakan, jumlah tamu, budget kasar — dan dapatkan rekomendasi cut & grade.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {activeId ? (
              <ChatWindow conversationId={activeId} />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Buat percakapan baru untuk mulai.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function ChatWindow({ conversationId }: { conversationId: string }) {
  const qc = useQueryClient();
  const msgsFn = useServerFn(listMessages);
  const sendFn = useServerFn(sendChatMessage);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const msgs = useQuery({
    queryKey: ["ai-msgs", conversationId],
    queryFn: () => msgsFn({ data: { conversation_id: conversationId } }),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.data]);

  const send = useMutation({
    mutationFn: (message: string) =>
      sendFn({ data: { conversation_id: conversationId, message } }),
    onSuccess: async () => {
      setInput("");
      await qc.invalidateQueries({ queryKey: ["ai-msgs", conversationId] });
      await qc.invalidateQueries({ queryKey: ["ai-convs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t || send.isPending) return;
    send.mutate(t);
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex-1 space-y-3 overflow-y-auto rounded border bg-muted/20 p-3">
        {(msgs.data ?? []).length === 0 && (
          <div className="text-xs text-muted-foreground">
            Coba tanya: “Rekomendasi cut sapi untuk BBQ 20 orang, budget 3 juta?”
          </div>
        )}
        {(msgs.data ?? []).map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
              m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-background"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {send.isPending && (
          <div className="flex justify-start">
            <div className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              Sedang berpikir…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis pertanyaan Anda…"
          rows={2}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); }
          }}
        />
        <Button type="submit" disabled={send.isPending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
