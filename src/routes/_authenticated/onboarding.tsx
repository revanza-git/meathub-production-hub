import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  createOrganization,
  listMyOrganizations,
  submitOrganization,
  getOrganizationDetail,
  type OrgSummary,
} from "@/lib/orgs.functions";
import { registerKybDocument, deleteKybDocument } from "@/lib/kyb.functions";
import { Trash2, UploadCloud } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [{ title: "Onboarding — SBMEAT" }, { name: "robots", content: "noindex" }],
  }),
  component: OnboardingPage,
});

const DOC_TYPES = [
  { value: "NPWP", label: "NPWP" },
  { value: "NIB", label: "NIB" },
  { value: "KTP_DIREKTUR", label: "KTP Direktur" },
  { value: "REKENING_KORAN", label: "Rekening Koran" },
  { value: "SIUP", label: "SIUP" },
  { value: "OTHER", label: "Dokumen lain" },
] as const;

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-muted text-foreground",
  SUBMITTED: "bg-gold/20 text-ink",
  UNDER_REVIEW: "bg-gold/40 text-ink",
  APPROVED: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-destructive/15 text-destructive",
  SUSPENDED: "bg-destructive/20 text-destructive",
};

function OnboardingPage() {
  const listFn = useServerFn(listMyOrganizations);
  const { data: orgs, isLoading } = useQuery({
    queryKey: ["my-orgs"],
    queryFn: () => listFn(),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId ?? orgs?.[0]?.id ?? null;

  return (
    <AppShell title="SBMEAT" subtitle="Onboarding organisasi">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Organisasi Anda</CardTitle>
              <CardDescription>Pilih atau buat organisasi baru.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Memuat…</div>
              ) : orgs && orgs.length > 0 ? (
                orgs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className={`w-full rounded-md border p-3 text-left transition ${
                      activeId === o.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                    }`}
                  >
                    <div className="text-sm font-semibold">{o.display_name}</div>
                    <div className="text-xs text-muted-foreground">{o.type}</div>
                    <Badge className={`mt-1 ${STATUS_TONE[o.status] ?? ""}`}>{o.status}</Badge>
                  </button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  Belum ada organisasi. Buat di sebelah kanan.
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          {activeId ? <OrgPanel orgId={activeId} /> : <CreateOrgCard onCreated={setSelectedId} />}
          {activeId ? <CreateOrgCard onCreated={setSelectedId} compact /> : null}
        </div>
      </div>
    </AppShell>
  );
}

function CreateOrgCard({
  onCreated,
  compact,
}: {
  onCreated: (id: string) => void;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createOrganization);
  const [display, setDisplay] = useState("");
  const [legal, setLegal] = useState("");
  const [type, setType] = useState<"BUYER" | "VENDOR">("BUYER");
  const m = useMutation({
    mutationFn: () => createFn({ data: { display_name: display, legal_name: legal, type } }),
    onSuccess: async (r) => {
      toast.success("Organisasi dibuat (DRAFT)");
      setDisplay("");
      setLegal("");
      await qc.invalidateQueries({ queryKey: ["my-orgs"] });
      onCreated(r.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {compact ? "Daftarkan organisasi lain" : "Daftarkan organisasi Anda"}
        </CardTitle>
        <CardDescription>
          Pilih tipe (pembeli atau vendor), isi nama legal & tampilan. Organisasi akan berstatus
          DRAFT hingga Anda submit untuk review admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipe organisasi</Label>
            <Select value={type} onValueChange={(v) => setType(v as "BUYER" | "VENDOR")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BUYER">Pembeli (Buyer)</SelectItem>
                <SelectItem value="VENDOR">Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nama tampilan</Label>
            <Input value={display} onChange={(e) => setDisplay(e.target.value)} placeholder="Warung Nasi Padang Kito" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Nama legal (sesuai akta / KTP usaha)</Label>
          <Input value={legal} onChange={(e) => setLegal(e.target.value)} placeholder="PT Kito Sejahtera Utama" />
        </div>
        <Button
          onClick={() => m.mutate()}
          disabled={m.isPending || display.length < 2 || legal.length < 2}
        >
          {m.isPending ? "Menyimpan…" : "Buat organisasi"}
        </Button>
      </CardContent>
    </Card>
  );
}

function OrgPanel({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const getDetail = useServerFn(getOrganizationDetail);
  const submitFn = useServerFn(submitOrganization);
  const registerFn = useServerFn(registerKybDocument);
  const deleteFn = useServerFn(deleteKybDocument);

  const { data, isLoading } = useQuery({
    queryKey: ["org-detail", orgId],
    queryFn: () => getDetail({ data: { org_id: orgId } }),
  });

  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]["value"]>("NPWP");
  const [uploading, setUploading] = useState(false);

  const submitM = useMutation({
    mutationFn: () => submitFn({ data: { org_id: orgId } }),
    onSuccess: async () => {
      toast.success("Organisasi disubmit untuk review");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["org-detail", orgId] }),
        qc.invalidateQueries({ queryKey: ["my-orgs"] }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: async () => {
      toast.success("Dokumen dihapus");
      await qc.invalidateQueries({ queryKey: ["org-detail", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Ukuran file maksimum 15 MB");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${orgId}/${docType}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("kyb")
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (upErr) throw upErr;
      await registerFn({
        data: {
          organization_id: orgId,
          doc_type: docType,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        },
      });
      toast.success("Dokumen terunggah");
      await qc.invalidateQueries({ queryKey: ["org-detail", orgId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload gagal";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  const canSubmit = useMemo(
    () => data?.status === "DRAFT" && (data?.documents.length ?? 0) > 0,
    [data],
  );

  if (isLoading || !data) {
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground">Memuat…</CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{data.display_name}</CardTitle>
            <CardDescription>
              {data.legal_name} · {data.type}
            </CardDescription>
          </div>
          <Badge className={STATUS_TONE[data.status] ?? ""}>{data.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.status === "APPROVED" ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Organisasi Anda telah disetujui. Silakan menuju{" "}
            <Link className="font-semibold underline" to={data.type === "VENDOR" ? "/partner" : "/buyer"}>
              {data.type === "VENDOR" ? "Partner Portal" : "Buyer Hub"}
            </Link>
            .
          </div>
        ) : null}
        {data.status === "REJECTED" ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Ditolak: {data.suspended_reason ?? "tanpa catatan"}
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Dokumen KYB
            </h3>
            <div className="text-xs text-muted-foreground">
              PDF/JPG/PNG · maks 15 MB per file
            </div>
          </div>

          {data.status === "DRAFT" ? (
            <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
              <div className="min-w-[180px] flex-1 space-y-1.5">
                <Label>Jenis dokumen</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as typeof docType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[220px] flex-1 space-y-1.5">
                <Label>Pilih file</Label>
                <Input type="file" accept=".pdf,image/*" onChange={onFile} disabled={uploading} />
              </div>
              <div className="flex items-center gap-2 pb-1 text-xs text-muted-foreground">
                <UploadCloud className="h-4 w-4" /> {uploading ? "Mengunggah…" : "Otomatis simpan setelah pilih file"}
              </div>
            </div>
          ) : null}

          {data.documents.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Belum ada dokumen. Unggah minimal satu dokumen sebelum submit.
            </div>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{d.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.doc_type} · {new Date(d.created_at).toLocaleString("id-ID")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{d.status}</Badge>
                    {data.status === "DRAFT" && d.status === "PENDING" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteM.mutate(d.id)}
                        disabled={deleteM.isPending}
                        aria-label="Hapus dokumen"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Riwayat status
          </h3>
          <ol className="space-y-2 text-sm">
            {data.history.map((h, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleString("id-ID")}
                </span>
                <span>
                  {h.from_state ? `${h.from_state} → ` : ""}
                  <strong>{h.to_state}</strong>
                  {h.reason ? ` · ${h.reason}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {data.status === "DRAFT" ? (
          <div className="flex items-center justify-end">
            <Button onClick={() => submitM.mutate()} disabled={!canSubmit || submitM.isPending}>
              {submitM.isPending ? "Mengirim…" : "Submit untuk review"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Ensure the OrgSummary type is used to keep imports lean if tree-shaken
export type _OrgSummary = OrgSummary;
