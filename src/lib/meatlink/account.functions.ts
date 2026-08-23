import { createServerFn } from "@tanstack/react-start";

type Input = { email: string };

/**
 * Notifies the ops team about a brand-new account. Public by necessity
 * (it runs right after sign-up, before a session exists), but it only ever
 * emails when a matching profile was actually created in the last 15 minutes,
 * and it never returns account data to the caller.
 */
export const notifyNewRegistration = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email tidak valid.");
    return { email };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, display_name, created_at")
      .eq("email", data.email)
      .maybeSingle();

    if (!profile) return { sent: false };
    const ageMs = Date.now() - new Date(profile.created_at).getTime();
    if (ageMs > 15 * 60 * 1000) return { sent: false };

    const { data: roles } = await supabaseAdmin
      .from("ml_user_roles")
      .select("role")
      .eq("user_id", profile.id);

    const { sendOpsAlert } = await import("./ops-notify.server");
    await sendOpsAlert(
      {
        subject: `Pendaftaran baru: ${profile.email} — Meatlink`,
        heading: "Akun baru terdaftar",
        intro: `${profile.display_name || profile.email} baru saja membuat akun di Meatlink.`,
        stats: [
          { label: "Nama", value: profile.display_name || "-" },
          { label: "Email", value: profile.email },
          { label: "Role", value: (roles ?? []).map((r) => String(r.role)).join(", ") || "buyer" },
          {
            label: "Waktu",
            value: new Intl.DateTimeFormat("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Jakarta",
            }).format(new Date(profile.created_at)),
          },
        ],
        ctaUrl: "https://meatlink.id/admin/users",
        ctaLabel: "Buka daftar pengguna",
      },
      `ops-registration-${profile.id}`,
    ).catch(() => undefined);

    return { sent: true };
  });
