import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [{ title: "Onboarding — SBMEAT" }, { name: "robots", content: "noindex" }],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <AppShell title="Selamat datang di SBMEAT" subtitle="Onboarding organisasi">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Buat organisasi Anda</CardTitle>
            <CardDescription>
              SBMEAT bekerja per organisasi (perusahaan pembeli atau vendor). Sebelum bisa
              bertransaksi, Anda harus mendaftarkan organisasi dan melewati review admin (KYB).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Fitur pendaftaran organisasi dan upload dokumen KYB (NPWP, NIB, KTP direktur,
              rekening koran) akan tersedia di Phase 1. Untuk sekarang, hubungi tim SBMEAT untuk
              provisioning manual.
            </p>
            <div className="rounded-md border border-dashed p-4 text-xs">
              <div className="font-semibold uppercase tracking-widest text-ink">
                Phase 0 build
              </div>
              <div className="mt-1">
                Foundations: auth, tenancy schema, RLS, config versioning, jobs runner, audit
                log — semua sudah aktif. Layar buyer & partner akan diisi di phase berikutnya.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
