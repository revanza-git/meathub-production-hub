import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/site-layout";
import { Field, SelectInput, TextInput } from "@/components/site/form-kit";
import { supabase } from "@/integrations/supabase/client";
import { homeForRole, useAuth } from "@/hooks/use-auth";

function safeNext(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) }),
  head: () => ({
    meta: [
      { title: "Sign In — Meatlink.id order management" },
      {
        name: "description",
        content:
          "Sign in to your Meatlink.id account to submit orders, track status, or manage your vendor catalogue and stock.",
      },
      { property: "og:title", content: "Sign In — Meatlink.id" },
      {
        property: "og:description",
        content: "Buyer and vendor access to the Meatlink.id order management workspace.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("buyer");
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();
  const { next } = Route.useSearch();

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    if (next) {
      window.location.href = next;
      return;
    }
    void navigate({ to: homeForRole(auth.role) });
  }, [auth.loading, auth.user, auth.role, navigate, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next ?? "/auth"}`,
            data: { display_name: name, ml_role: role },
          },
        });
        if (error) throw error;
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
              Order management for buyers and suppliers.
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-bone/65">
              Buyers submit orders and follow their status without chasing anyone. Vendors keep their
              catalogue and stock current. Meatlink matches demand to supply behind the scenes.
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
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`eyebrow flex-1 border px-4 py-3 transition-colors ${
                    mode === m ? "border-crimson bg-crimson text-bone" : "border-line text-ash"
                  }`}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-6 grid gap-5">
              {mode === "register" ? (
                <>
                  <Field label="Full name" required>
                    <TextInput
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Account type" required hint="Vendor accounts are reviewed by our team.">
                    <SelectInput value={role} onChange={(e) => setRole(e.target.value)}>
                      <option value="buyer">Buyer — I want to order meat</option>
                      <option value="vendor">Vendor — I supply meat</option>
                    </SelectInput>
                  </Field>
                </>
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

              <button
                type="submit"
                disabled={pending}
                className="eyebrow bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep disabled:opacity-60"
              >
                {pending ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
