import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { listFeatureFlags, setFeatureFlag } from "@/lib/governance.functions";

export const Route = createFileRoute("/_authenticated/partner/admin/flags")({
  head: () => ({ meta: [
    { title: "Feature flags — SBMEAT" },
    { name: "description", content: "Aktifkan / non-aktifkan fitur platform." },
    { name: "robots", content: "noindex" },
  ] }),
  component: FlagsPage,
});

function FlagsPage() {
  const listFn = useServerFn(listFeatureFlags);
  const setFn = useServerFn(setFeatureFlag);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["flags"], queryFn: () => listFn() });
  const toggle = useMutation({
    mutationFn: (v: { key: string; enabled: boolean }) => setFn({ data: v }),
    onSuccess: () => { toast.success("Flag diperbarui"); qc.invalidateQueries({ queryKey: ["flags"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Feature Flags" subtitle="Toggle fitur platform">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flags aktif</CardTitle>
            <CardDescription>Hanya platform admin yang bisa mengubah.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.map((f) => (
              <div key={f.key} className="flex items-center justify-between rounded border p-3 text-sm">
                <div>
                  <div className="font-mono">{f.key}</div>
                  {f.description && <div className="text-xs text-muted-foreground">{f.description}</div>}
                </div>
                <Switch
                  checked={f.enabled}
                  onCheckedChange={(v) => toggle.mutate({ key: f.key, enabled: v })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
