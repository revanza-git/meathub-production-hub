import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const authSearch = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: authSearch,
  head: () => ({
    meta: [
      { title: "Masuk — MEATHUB Meat Hub" },
      {
        name: "description",
        content:
          "Masuk atau daftar akun bisnis MEATHUB Meat Hub untuk pemesanan daging premium di seluruh Indonesia.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const router = useRouter();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  // Redirect away if already signed in.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const target = sanitizeNext(search.next) ?? "/dashboard";
        navigate({ to: target, replace: true });
      } else {
        setChecking(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.invalidate();
        const target = sanitizeNext(search.next) ?? "/dashboard";
        navigate({ to: target, replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, router, search.next]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Memuat…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-ink text-[10px] font-bold tracking-widest text-white">
              SB
            </span>
            <span className="font-display text-xl font-bold text-ink">MEATHUB</span>
          </Link>
          <p className="mt-2 text-xs uppercase tracking-widest text-ink-soft">
            Meat Hub • Nasional
          </p>
        </div>

        <Card>
          <Tabs defaultValue="signin">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Masuk</TabsTrigger>
                <TabsTrigger value="signup">Daftar</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="space-y-4">
              <TabsContent value="signin" className="mt-0">
                <SignInForm />
              </TabsContent>
              <TabsContent value="signup" className="mt-0">
                <SignUpForm />
              </TabsContent>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Atau</span>
                </div>
              </div>

              <GoogleButton nextPath={sanitizeNext(search.next)} />

              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Dengan melanjutkan, Anda menyetujui{" "}
                <Link to="/" className="underline">
                  Syarat Layanan
                </Link>{" "}
                dan{" "}
                <Link to="/" className="underline">
                  Kebijakan Privasi
                </Link>{" "}
                MEATHUB.
              </p>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function sanitizeNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  // Only allow same-origin relative paths.
  if (!next.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signin-password">Kata sandi</Label>
        <Input
          id="signin-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Memproses…" : "Masuk"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Akun dibuat. Silakan masuk.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="signup-name">Nama Anda</Label>
        <Input
          id="signup-name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-email">Email kerja</Label>
        <Input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-password">Kata sandi (min. 8 karakter)</Label>
        <Input
          id="signup-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Memproses…" : "Buat akun"}
      </Button>
    </form>
  );
}

function GoogleButton({ nextPath }: { nextPath: string | undefined }) {
  const [loading, setLoading] = useState(false);
  async function onClick() {
    setLoading(true);
    try {
      if (nextPath) sessionStorage.setItem("meathub.next", nextPath);
    } catch {}
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error(
        result.error instanceof Error ? result.error.message : "Gagal masuk dengan Google",
      );
    }
    // If result.redirected, browser navigates away.
  }
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick} disabled={loading}>
      {loading ? "Menghubungkan…" : "Lanjutkan dengan Google"}
    </Button>
  );
}
