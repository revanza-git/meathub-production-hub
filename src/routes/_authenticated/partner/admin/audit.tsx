import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { listAuditEvents } from "@/lib/governance.functions";

export const Route = createFileRoute("/_authenticated/partner/admin/audit")({
  head: () => ({ meta: [
    { title: "Audit log — MEATHUB" },
    { name: "description", content: "Log audit lintas modul." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AuditPage,
});

function AuditPage() {
  const listFn = useServerFn(listAuditEvents);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const { data } = useQuery({
    queryKey: ["audit", entity, action],
    queryFn: () => listFn({ data: { entity_type: entity || undefined, action: action || undefined, limit: 300 } }),
  });

  return (
    <AppShell title="Audit Log" subtitle="Semua perubahan lintas modul">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter</CardTitle>
            <CardDescription>Kosongkan untuk melihat semua.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div><Label>Entity type</Label><Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="mis. order, invoice, sp_warning" /></div>
            <div><Label>Action</Label><Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="mis. order.create" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{data?.length ?? 0} event</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {data?.map((e) => (
              <div key={e.id} className="rounded border p-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{e.action}</Badge>
                    <span className="text-muted-foreground">{e.entity_type}</span>
                  </div>
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("id-ID")}</span>
                </div>
                {e.reason && <div className="mt-1 text-muted-foreground">{e.reason}</div>}
                {e.to_state && (
                  <pre className="mt-1 overflow-x-auto rounded bg-muted p-1 text-[10px]">
                    {JSON.stringify(e.to_state, null, 0)}
                  </pre>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
