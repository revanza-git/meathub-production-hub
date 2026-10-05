import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/app/app-shell";
import { Field, TextInput } from "@/components/site/form-kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBi } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/profil")({
  head: () => ({ meta: [
    { title: "Lengkapi Kontak Pembeli — Meatlink.id" },
    { name: "description", content: "Lengkapi email dan nomor telepon akun Pembeli Meatlink.id." },
    { property: "og:title", content: "Kontak Pembeli — Meatlink.id" },
    { property: "og:description", content: "Lengkapi informasi kontak akun Pembeli Meatlink.id." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BuyerProfilePage,
});

const phoneSchema = z.string().trim().min(8).max(30).regex(/^\+?[0-9][0-9 ()-]{6,28}$/);

function BuyerProfilePage() {
  const { user, role, loading } = useAuth();
  const bi = useBi();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) toast.error(bi("Kontak belum dapat dimuat. Coba lagi.", "Could not load your contact details. Try again."));
      setPhone(data?.phone ?? "");
      setLoadingProfile(false);
    });
    return () => { active = false; };
  }, [user?.id, bi]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!user.email || !z.email().safeParse(user.email).success) {
      toast.error(bi("Email akun tidak tersedia. Hubungi tim Meatlink.", "Account email is unavailable. Contact Meatlink."));
      return;
    }
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      toast.error(bi("Masukkan nomor telepon yang valid (8–30 karakter).", "Enter a valid phone number (8–30 characters)."));
      return;
    }
    setPending(true);
    const { data, error } = await supabase.from("profiles")
      .update({ email: user.email, phone: parsed.data })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();
    setPending(false);
    if (error || !data) {
      toast.error(bi("Kontak gagal disimpan. Coba lagi.", "Could not save your contact details. Try again."));
      return;
    }
    toast.success(bi("Kontak tersimpan.", "Contact details saved."));
    void navigate({ to: "/app/orders" });
  }

  return (
    <AppShell title={bi("Kontak Pembeli", "Buyer contact details")} intro={bi("Pastikan kami dapat menghubungi Anda mengenai pesanan.", "Make sure we can reach you about your orders.")}>
      {loading || loadingProfile ? <p className="text-sm text-ash">{bi("Memuat…", "Loading…")}</p> : role !== "buyer" ? (
        <p className="text-sm text-ash">{bi("Halaman ini khusus akun Pembeli.", "This page is for buyer accounts only.")}</p>
      ) : (
        <Panel className="max-w-xl p-6 sm:p-8">
          <form onSubmit={(event) => void save(event)} className="grid gap-5">
            <Field label={bi("Email akun", "Account email")} required hint={bi("Email mengikuti alamat yang digunakan untuk masuk.", "This is the email you use to sign in.")}>
              <TextInput type="email" value={user?.email ?? ""} readOnly aria-label={bi("Email akun", "Account email")} />
            </Field>
            <Field label={bi("Nomor telepon / WhatsApp", "Phone / WhatsApp number")} required>
              <TextInput type="tel" autoComplete="tel" inputMode="tel" minLength={8} maxLength={30} required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="08xxxxxxxxxx" />
            </Field>
            <Button type="submit" disabled={pending || !user?.email} className="w-fit rounded-none bg-crimson px-6 py-3 text-bone hover:bg-crimson-deep">
              {pending ? bi("Menyimpan…", "Saving…") : bi("Simpan dan lanjutkan", "Save and continue")}
            </Button>
          </form>
        </Panel>
      )}
    </AppShell>
  );
}