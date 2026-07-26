import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyRoles } from "@/lib/roles.functions";

/**
 * Post-login role router. Sends user to the correct surface:
 *   internal/vendor  → /partner
 *   buyer            → /buyer
 *   no membership    → /onboarding
 */
export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — MEATHUB" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardRouter,
});

function DashboardRouter() {
  const fetchRoles = useServerFn(getMyRoles);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => fetchRoles(),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Memuat akun…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center text-sm text-destructive">
          Gagal memuat akun Anda. Coba refresh.
        </div>
      </div>
    );
  }
  if (!data) return null;
  if (data.isInternal || data.isVendor) return <Navigate to="/partner" replace />;
  if (data.isBuyer) return <Navigate to="/buyer" replace />;
  return <Navigate to="/onboarding" replace />;
}
