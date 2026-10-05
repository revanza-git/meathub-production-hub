import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteLayout } from "@/components/site/site-layout";
import { Field, TextInput } from "@/components/site/form-kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { notifyNewRegistration } from "@/lib/meatlink/account.functions";

import { homeForRole, useAuth } from "@/hooks/use-auth";

function safeNext(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({ next: safeNext(s.next) }),
  head: () => ({
    meta: [
      { title: "Sign In — Meatlink.id order management" },
      {
        name: "description",
        content:
          "Sign in to your Meatlink.id account to submit orders, track delivery status, and reorder in a few clicks.",
      },
      { property: "og:title", content: "Sign In — Meatlink.id" },
      {
        property: "og:description",
        content: "Buyer access to the Meatlink.id order management workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();
  const { next } = Route.useSearch();

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    if (auth.role === "buyer" && !auth.contactComplete) {
      void navigate({ to: "/app/profil" });
      return;
    }
    if (next) {
      window.location.href = next;
      return;
    }
    void navigate({ to: homeForRole(auth.role) });
  }, [auth.loading, auth.user, auth.role, auth.contactComplete, navigate, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      if (mode === "register") {
        const contact = z.object({
          email: z.email().max(255),
          phone: z.string().trim().regex(/^\+?[0-9][0-9 ()-]{6,28}$/, "Masukkan nomor telepon yang valid.").min(8).max(30),
        }).safeParse({ email: email.trim(), phone: phone.trim() });
        if (!contact.success) throw new Error(contact.error.issues[0]?.message ?? "Periksa email dan nomor telepon.");
        const { error } = await supabase.auth.signUp({
          email: contact.data.email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next ?? "/auth"}`,
            data: { display_name: name.trim(), phone: contact.data.phone, ml_role: "buyer" },
          },
        });
        if (error) throw error;
        void notifyNewRegistration({ data: { email } }).catch(() => undefined);
        toast.success("Account created. You can sign in now.");

        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <SiteLayout>
      <section className="bg-noir text-bone">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <p className="eyebrow text-crimson">Account access</p>
            <h1 className="mt-5 font-display text-4xl leading-tight lg:text-5xl">
              Order management for every buyer.
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-bone/65">
              Submit orders and follow their status without chasing anyone — from resto, hotel, katering,
              toko daging, sampai reseller. Meatlink matches your demand to verified supply behind the scenes.
            </p>
            <p className="mt-8 text-sm text-bone/50">
              Not ready for an account?{" "}
              <Link to="/request-quote" className="underline underline-offset-4 hover:text-bone">
                Send a quote request instead
              </Link>
              .
            </p>
          </div>

          <div className="bg-bone p-6 text-ink lg:p-8">
            <div className="flex gap-2">
              {(["signin", "register"] as const).map((m) => (
                <Button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`eyebrow flex-1 border px-4 py-3 transition-colors ${
                    mode === m ? "border-crimson bg-crimson text-bone" : "border-line text-ash"
                  }`}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </Button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-6 grid gap-5">
              {mode === "register" ? (
                <Field label="Full name" required>
                  <TextInput
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </Field>
              ) : null}

              {mode === "register" ? (
                <Field label="Nomor telepon / WhatsApp" required>
                  <TextInput type="tel" required minLength={8} maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="08xxxxxxxxxx" />
                </Field>
              ) : null}

              <Field label="Email" required>
                <TextInput
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>
              <Field label="Password" required hint="Minimum 8 characters.">
                <TextInput
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </Field>

              <Button
                type="submit"
                disabled={pending}
                className="eyebrow bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep disabled:opacity-60"
              >
                {pending ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
