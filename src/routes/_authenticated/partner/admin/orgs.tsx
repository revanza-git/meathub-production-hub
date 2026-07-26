import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getMyRoles } from "@/lib/roles.functions";
import {
  getOrganizationDetail,
  listOrganizationsForReview,
  reviewOrganization,
  signKybDocument,
} from "@/lib/orgs.functions";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partner/admin/orgs")({
  head: () => ({
    meta: [{ title: "Review Organisasi — SBMEAT" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminOrgsPage,
});

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-muted text-foreground",
  SUBMITTED: "bg-gold/30 text-ink",
  UNDER_REVIEW: "bg-gold/50 text-ink",
  APPROVED: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-destructive/15 text-destructive",
};

function AdminOrgsPage() {
  const rolesFn = useServerFn(getMyRoles);
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => rolesFn(),
  });

  if (rolesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Memuat…</div>
      </div>
    );
  }
  const isAdmin = roles?.memberships.some((m) => m.role === "platform_admin");
  if (!isAdmin) return <Navigate to="/partner" replace />;

  return (
    <AppShell title="SBMEAT Admin" subtitle="Review organisasi (KYB)">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="PENDING" className="space-y-4">
          <TabsList>
            <TabsTrigger value="PENDING">Menunggu review</TabsTrigger>
            <TabsTrigger value="APPROVED">Disetujui</TabsTrigger>
            <TabsTrigger value="REJECTED">Ditolak</TabsTrigger>
            <TabsTrigger value="ALL">Semua</TabsTrigger>
          </TabsList>
          {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((s) => (
            <TabsContent key={s} value={s} className="space-y-3">
              <OrgList status={s} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
}

function OrgList({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" | "ALL" }) {
  const listFn = useServerFn(listOrganizationsForReview);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-orgs", status],
    queryFn: () => listFn({ data: { status } }),
  });
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) return <div className="text-sm text-muted-foreground">Memuat…</div>;
  if (!data || data.length === 0)
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Tidak ada organisasi pada kategori ini.
      </div>
    );

  return (
    <div className="grid gap-3">
      {data.map((o) => (
        <Card key={o.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{o.display_name}</CardTitle>
                <CardDescription>
                  {o.legal_name} · {o.type} · dibuat{" "}
                  {new Date(o.created_at).toLocaleString("id-ID")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_TONE[o.status] ?? ""}>{o.status}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenId(openId === o.id ? null : o.id)}
                >
                  {openId === o.id ? "Tutup" : "Lihat detail"}
                </Button>
              </div>
            </div>
          </CardHeader>
          {openId === o.id ? (
            <CardContent>
              <AdminOrgDetail orgId={o.id} />
            </CardContent>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function AdminOrgDetail({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const getDetail = useServerFn(getOrganizationDetail);
  const reviewFn = useServerFn(reviewOrganization);
  const signFn = useServerFn(signKybDocument);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-org-detail", orgId],
    queryFn: () => getDetail({ data: { org_id: orgId } }),
  });

  const decide = useMutation({
    mutationFn: (decision: "START_REVIEW" | "APPROVE" | "REJECT") =>
      reviewFn({ data: { org_id: orgId, decision, reason: reason || undefined } }),
    onSuccess: async () => {
      toast.success("Keputusan tercatat");
      setReason("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-orgs"] }),
        qc.invalidateQueries({ queryKey: ["admin-org-detail", orgId] }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openDoc(path: string) {
    try {
      const { url } = await signFn({ data: { storage_path: path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuka dokumen");
    }
  }

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Memuat detail…</div>;

  const canStart = data.status === "SUBMITTED";
  const canDecide = data.status === "SUBMITTED" || data.status === "UNDER_REVIEW";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Dokumen KYB
        </h4>
        {data.documents.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Tidak ada dokumen.
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {data.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.doc_type} · {new Date(d.created_at).toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{d.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => openDoc(d.storage_path)}>
                    <FileText className="mr-1 h-4 w-4" /> Buka
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Keputusan review
        </h4>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Catatan (wajib untuk penolakan)</div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan penolakan atau catatan internal…"
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!canStart || decide.isPending}
              onClick={() => decide.mutate("START_REVIEW")}
            >
              Mulai review
            </Button>
            <Button
              size="sm"
              disabled={!canDecide || decide.isPending}
              onClick={() => decide.mutate("APPROVE")}
            >
              Setujui
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!canDecide || decide.isPending || reason.trim().length < 3}
              onClick={() => decide.mutate("REJECT")}
            >
              Tolak
            </Button>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Riwayat
          </h4>
          <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
            {data.history.map((h, i) => (
              <li key={i}>
                {new Date(h.created_at).toLocaleString("id-ID")} · {h.from_state ?? "—"} →{" "}
                <strong className="text-foreground">{h.to_state}</strong>
                {h.reason ? ` · ${h.reason}` : ""}
              </li>
            ))}
          </ol>
        </div>

        <div className="pt-2">
          <div className="text-xs text-muted-foreground">Filter cepat</div>
          <Input readOnly value={orgId} className="mt-1 font-mono text-[11px]" />
        </div>
      </section>
    </div>
  );
}
