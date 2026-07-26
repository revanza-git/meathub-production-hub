import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_conversations")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ title: z.string().max(120).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ai_conversations")
      .insert({ user_id: context.userId, title: data.title ?? "Konsultasi baru" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversation_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ai_conversations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getFlag = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", data.key)
      .maybeSingle();
    return { enabled: !!row?.enabled };
  });

const SYSTEM_PROMPT = `Anda adalah "AI Meat Consultant" untuk platform MEATHUB (marketplace daging B2B Jakarta).
Peran Anda: membantu buyer memilih jenis, cut, dan grade daging yang tepat sesuai kebutuhan masakan, budget, dan porsi.
Aturan ketat:
- Selalu jawab dalam Bahasa Indonesia yang ringkas dan praktis.
- Fokus HANYA pada topik daging: species (sapi, ayam, kambing/domba, dsb), cut, grade, penyimpanan, thawing, teknik masak, estimasi porsi per kg, tips food-safety.
- JANGAN pernah menyebut harga spesifik vendor, membuat pesanan, memproses pembayaran, atau mengklaim ketersediaan stok. Arahkan user ke halaman "Cari produk" untuk itu.
- Jika ditanya di luar topik daging/kuliner terkait, tolak dengan sopan.
- Jika data kurang, minta klarifikasi (jumlah tamu, jenis masakan, preferensi lemak, budget kasar).`;

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      conversation_id: z.string().uuid(),
      message: z.string().min(1).max(4000),
    }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ reply: string }> => {
    // Verify feature flag + ownership
    const { data: flag } = await context.supabase
      .from("feature_flags").select("enabled").eq("key", "ai_consultant").maybeSingle();
    if (!flag?.enabled) throw new Error("Fitur AI belum diaktifkan admin");

    const { data: conv, error: cErr } = await context.supabase
      .from("ai_conversations").select("id").eq("id", data.conversation_id).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!conv) throw new Error("Percakapan tidak ditemukan");

    // Load history
    const { data: history } = await context.supabase
      .from("ai_messages").select("role, content")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: true }).limit(30);

    // Save user message
    await context.supabase.from("ai_messages").insert({
      conversation_id: data.conversation_id, role: "user", content: data.message,
    });

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY tidak tersedia");

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });
    if (res.status === 429) throw new Error("Kuota AI tercapai, coba lagi nanti.");
    if (res.status === 402) throw new Error("Kredit AI habis, hubungi admin.");
    if (!res.ok) throw new Error(`AI error: ${res.status}`);
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const reply = json.choices?.[0]?.message?.content?.trim() ?? "(tidak ada balasan)";

    await context.supabase.from("ai_messages").insert({
      conversation_id: data.conversation_id, role: "assistant", content: reply,
    });
    await context.supabase.from("ai_conversations")
      .update({ updated_at: new Date().toISOString() }).eq("id", data.conversation_id);

    return { reply };
  });

