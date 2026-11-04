import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useBi } from "@/lib/i18n";
import {
  startChat,
  listMyChats,
  requestChatRecovery,
  recoverChat,
} from "@/lib/meatlink/chat.functions";
import { chatIdentitySchema, chatPhoneSchema, type ChatAccess } from "@/lib/meatlink/chat-schema";
import { ChatThread } from "./chat-thread";
const KEY = "meatlink.support.guest";
export function CustomerChat({ context = "", visible = true, conversationId }: { context?: string; visible?: boolean; conversationId?: string }) {
  const { user, displayName, phone: authPhone, loading } = useAuth(),
    bi = useBi(),
    start = useServerFn(startChat),
    list = useServerFn(listMyChats),
    requestRecovery = useServerFn(requestChatRecovery),
    recover = useServerFn(recoverChat);
  const [guest, setGuest] = useState<ChatAccess | null>(null),
    [selected, setSelected] = useState<ChatAccess | null>(null),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [phone, setPhone] = useState(""),
    [website, setWebsite] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [recovering, setRecovering] = useState(!!conversationId),
    [notice, setNotice] = useState("");
  const q = useQuery({
    queryKey: ["chat-mine", user?.id],
    enabled: !!user && visible,
    queryFn: () => list(),
    staleTime: 0,
  });
  useEffect(() => {
    setSelected(null);
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const a = JSON.parse(saved) as ChatAccess;
        if (a.id && a.token) setGuest(a);
      }
    } catch {
      localStorage.removeItem(KEY);
    }
  }, [user?.id]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const secret = params.get("recover");
    if (!secret) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setBusy(true);
    void recover({ data: { token: secret } })
      .then((a) => {
        localStorage.setItem(KEY, JSON.stringify(a));
        setGuest(a);
      })
      .catch(() => setError(bi("Tautan tidak valid atau kedaluwarsa.", "Link invalid or expired.")))
      .finally(() => setBusy(false));
  }, [recover, bi]);
  useEffect(() => {
    if (!conversationId) return;
    if (user && q.data?.some((c) => c.id === conversationId)) {
      setSelected({ id: conversationId });
    } else if (!user) {
      setRecovering(true);
    }
  }, [conversationId, user, q.data]);
  const active = selected || (!user && (!conversationId || guest?.id === conversationId) ? guest : null);
  async function begin(e: React.FormEvent) {
    e.preventDefault();
    const parsed = chatIdentitySchema.safeParse({
      name: user ? displayName || user.email : name,
      email: user ? user.email : email,
      phone: user ? authPhone : phone,
      website,
    });
    if (!parsed.success) {
      setError(
        user && !authPhone
          ? bi(
              "Lengkapi nomor telepon di akun Anda sebelum chat.",
              "Complete your account phone number before chatting.",
            )
          : bi(
              "Isi nama minimal 2 karakter, email, dan nomor telepon yang valid.",
              "Enter a name of at least 2 characters, a valid email, and a valid phone number.",
            ),
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const a = await start({ data: { ...parsed.data, id: crypto.randomUUID(), context } });
      if (!user) {
        localStorage.setItem(KEY, JSON.stringify(a));
        setGuest(a);
      } else {
        setSelected(a);
        void q.refetch();
      }
    } catch {
      setError(
        bi(
          "Chat belum dapat dibuat. Tunggu sebentar lalu coba lagi.",
          "Could not start chat. Please wait and retry.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function restore(e: React.FormEvent) {
    e.preventDefault();
    if (!chatIdentitySchema.shape.email.safeParse(email).success) {
      setError(bi("Isi email yang valid.", "Enter a valid email."));
      return;
    }
    setBusy(true);
    try {
      await requestRecovery({ data: { email, website, conversation: conversationId } });
      setNotice(
        bi(
          "Jika ada percakapan untuk email ini, tautan pemulihan akan dikirim.",
          "If a conversation exists for this email, a recovery link will be sent.",
        ),
      );
    } catch {
      setError(bi("Tunggu sebentar sebelum mencoba lagi.", "Please wait before trying again."));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return <p className="p-5 text-sm text-ash">{bi("Memuat…", "Loading…")}</p>;
  if (active)
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex justify-between border-b border-line p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelected(null);
              if (!user) {
                setGuest(null);
                localStorage.removeItem(KEY);
              }
            }}
          >
            {bi("Percakapan lain", "Other conversation")}
          </Button>
        </div>
        <ChatThread key={active.id} access={active} context={context} visible={visible} />
      </div>
    );
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      {context ? <p className="mb-4 break-words text-xs text-ash">{context}</p> : null}
      {user && q.data?.length ? (
        <div className="mb-6 space-y-2">
          {q.data.map((c) => (
            <Button
              key={c.id}
              variant="outline"
              onClick={() => setSelected({ id: c.id })}
              className="h-auto w-full justify-start whitespace-normal p-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm">
                  {c.context_label || bi("Chat Meatlink", "Meatlink chat")}
                </span>
                <span className="mt-1 block truncate text-xs text-ash">
                  {c.last_message || bi("Belum ada pesan", "No messages yet")}
                </span>
              </span>
              {c.customer_unread > 0 ? (
                <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">
                  {c.customer_unread}
                </span>
              ) : null}
            </Button>
          ))}
        </div>
      ) : null}
      <h2 className="font-display text-xl text-ink">
        {recovering
          ? bi("Pulihkan chat", "Recover chat")
          : bi("Hubungi Meatlink", "Contact Meatlink")}
      </h2>
      {conversationId && !user ? (
        <Button asChild variant="link" className="mt-3 px-0">
          <Link to="/auth">{bi("Punya akun? Masuk", "Have an account? Sign in")}</Link>
        </Button>
      ) : null}
      <form onSubmit={recovering ? restore : begin} className="mt-5 space-y-4">
        {!user && !recovering ? (
          <label className="block text-sm text-ink">
            {bi("Nama", "Name")}
            <input
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
        ) : null}
        {!user ? (
          <label className="block text-sm text-ink">
            Email
            <input
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
        ) : null}
        <input
          aria-hidden="true"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="hidden"
          name="website"
        />
        {error ? (
          <p role="alert" className="text-xs text-crimson">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-xs text-status-ok">
            {notice}
          </p>
        ) : null}
        <Button type="submit" disabled={busy} className="h-12 w-full">
          {busy ? bi("Menghubungkan…", "Connecting…") : recovering
            ? bi("Kirim tautan pemulihan", "Send recovery link")
            : bi("Mulai percakapan", "Start conversation")}
        </Button>
      </form>
      {!user ? (
        <Button
          variant="link"
          className="mt-3 h-auto whitespace-normal px-0 text-xs"
          onClick={() => {
            setRecovering((v) => !v);
            setError("");
            setNotice("");
          }}
        >
          {recovering
            ? bi("Kembali", "Back")
            : bi("Sudah pernah chat? Pulihkan akses", "Already chatted? Recover access")}
        </Button>
      ) : null}
    </div>
  );
}
