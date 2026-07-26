import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMyRoles } from "@/lib/roles.functions";
import {
  addEvidence,
  decideEvidence,
  listEvidence,
  listMasters,
  listProducts,
  transitionProduct,
  upsertCut,
  upsertMaster,
  upsertProduct,
  type ProductRow,
  type ProductTier,
} from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/partner/admin/catalog")({
  head: () => ({ meta: [{ title: "Katalog Admin — SBMEAT" }, { name: "robots", content: "noindex" }] }),
  component: AdminCatalogPage,
});

const TIERS: ProductTier[] = ["COMMODITY_PREMIUM", "SUPER_PREMIUM", "UNDERVALUED_QC", "SBMEAT_HOUSE"];
const STATUSES = ["DRAFT", "REVIEW", "ACTIVE", "SUSPENDED", "ARCHIVED"] as const;

function AdminCatalogPage() {
  const rolesFn = useServerFn(getMyRoles);
  const { data: roles, isLoading } = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });
  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Memuat…</div>;
  const isAdmin = roles?.memberships.some((m) => m.role === "platform_admin");
  if (!isAdmin) return <Navigate to="/partner" replace />;

  return (
    <AppShell title="SBMEAT Admin" subtitle="Katalog & master data">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Produk</TabsTrigger>
            <TabsTrigger value="masters">Master data</TabsTrigger>
          </TabsList>
          <TabsContent value="products"><ProductsTab /></TabsContent>
          <TabsContent value="masters"><MastersTab /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ---------------- Products ---------------- */

function ProductsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listProducts);
  const upsertFn = useServerFn(upsertProduct);
  const transFn = useServerFn(transitionProduct);
  const mastersFn = useServerFn(listMasters);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const products = useQuery({ queryKey: ["products", q], queryFn: () => listFn({ data: { status: "ALL", q } }) });
  const masters = useQuery({ queryKey: ["masters"], queryFn: () => mastersFn() });

  const trans = useMutation({
    mutationFn: (v: { id: string; to: (typeof STATUSES)[number] }) => transFn({ data: v }),
    onSuccess: () => { toast.success("Status diperbarui"); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Input placeholder="Cari nama produk…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Button size="sm" onClick={() => setCreating(true)}>+ Produk baru</Button>
      </div>

      {creating && masters.data ? (
        <ProductForm
          masters={masters.data}
          onCancel={() => setCreating(false)}
          onSave={async (payload) => {
            await upsertFn({ data: payload });
            toast.success("Produk disimpan");
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["products"] });
          }}
        />
      ) : null}

      {products.isLoading ? <div className="text-sm text-muted-foreground">Memuat…</div> : null}
      <div className="grid gap-3">
        {(products.data ?? []).map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <CardDescription>
                    {p.sku} · {p.species?.name} / {p.cut?.name} · {p.brand?.name} · {p.grade?.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{p.tier.replace("_", " ")}</Badge>
                  <Badge>{p.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                    {openId === p.id ? "Tutup" : "Detail"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {openId === p.id ? (
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {STATUSES.filter((s) => s !== p.status).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === "ACTIVE" ? "default" : "outline"}
                      disabled={trans.isPending}
                      onClick={() => trans.mutate({ id: p.id, to: s })}
                    >
                      → {s}
                    </Button>
                  ))}
                </div>
                <EvidencePanel product={p} />
              </CardContent>
            ) : null}
          </Card>
        ))}
        {products.data && products.data.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Belum ada produk.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProductForm({
  masters,
  onCancel,
  onSave,
  initial,
}: {
  masters: NonNullable<ReturnType<typeof useQuery<Awaited<ReturnType<typeof listMasters>>>>["data"]>;
  onCancel: () => void;
  onSave: (v: {
    id?: string; sku: string; name: string; species_id: string; cut_id: string;
    brand_id: string; grade_id: string; tier: ProductTier; description?: string;
    primary_image_url?: string; undervalued_disclosure?: string; disclosure_version?: string;
  }) => Promise<void>;
  initial?: Partial<ProductRow>;
}) {
  const [form, setForm] = useState({
    sku: initial?.sku ?? "",
    name: initial?.name ?? "",
    species_id: initial?.species_id ?? masters.species[0]?.id ?? "",
    cut_id: initial?.cut_id ?? "",
    brand_id: initial?.brand_id ?? masters.brands[0]?.id ?? "",
    grade_id: initial?.grade_id ?? masters.grades[0]?.id ?? "",
    tier: (initial?.tier ?? "COMMODITY_PREMIUM") as ProductTier,
    description: initial?.description ?? "",
    primary_image_url: initial?.primary_image_url ?? "",
    undervalued_disclosure: initial?.undervalued_disclosure ?? "",
    disclosure_version: initial?.disclosure_version ?? "",
  });
  const cuts = useMemo(() => masters.cuts.filter((c) => c.species_id === form.species_id), [masters.cuts, form.species_id]);
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{initial?.id ? "Edit produk" : "Produk baru"}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="SKU"><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
          <Field label="Nama"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Species">
            <SelectBox value={form.species_id} onChange={(v) => setForm({ ...form, species_id: v, cut_id: "" })}
              options={masters.species.map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <Field label="Cut">
            <SelectBox value={form.cut_id} onChange={(v) => setForm({ ...form, cut_id: v })}
              options={cuts.map((c) => ({ value: c.id, label: c.name }))} placeholder="Pilih cut…" />
          </Field>
          <Field label="Brand">
            <SelectBox value={form.brand_id} onChange={(v) => setForm({ ...form, brand_id: v })}
              options={masters.brands.map((b) => ({ value: b.id, label: b.name }))} />
          </Field>
          <Field label="Grade">
            <SelectBox value={form.grade_id} onChange={(v) => setForm({ ...form, grade_id: v })}
              options={masters.grades.map((g) => ({ value: g.id, label: g.name }))} />
          </Field>
          <Field label="Tier">
            <SelectBox value={form.tier} onChange={(v) => setForm({ ...form, tier: v as ProductTier })}
              options={TIERS.map((t) => ({ value: t, label: t.replace("_", " ") }))} />
          </Field>
          <Field label="URL gambar utama"><Input value={form.primary_image_url} onChange={(e) => setForm({ ...form, primary_image_url: e.target.value })} placeholder="https://…" /></Field>
        </div>
        <Field label="Deskripsi"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        {form.tier === "UNDERVALUED_QC" ? (
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <Field label="Disclosure Undervalued">
              <Textarea rows={3} value={form.undervalued_disclosure} onChange={(e) => setForm({ ...form, undervalued_disclosure: e.target.value })} />
            </Field>
            <Field label="Versi disclosure">
              <Input value={form.disclosure_version} onChange={(e) => setForm({ ...form, disclosure_version: e.target.value })} placeholder="v1" />
            </Field>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Batal</Button>
          <Button
            disabled={busy || !form.sku || !form.name || !form.cut_id}
            onClick={async () => {
              try {
                setBusy(true);
                await onSave({
                  ...(initial?.id ? { id: initial.id } : {}),
                  sku: form.sku, name: form.name,
                  species_id: form.species_id, cut_id: form.cut_id,
                  brand_id: form.brand_id, grade_id: form.grade_id,
                  tier: form.tier,
                  description: form.description || undefined,
                  primary_image_url: form.primary_image_url || undefined,
                  undervalued_disclosure: form.undervalued_disclosure || undefined,
                  disclosure_version: form.disclosure_version || undefined,
                });
              } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); }
              finally { setBusy(false); }
            }}
          >
            Simpan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EvidencePanel({ product }: { product: ProductRow }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listEvidence);
  const addFn = useServerFn(addEvidence);
  const decideFn = useServerFn(decideEvidence);
  const { data } = useQuery({ queryKey: ["evidence", product.id], queryFn: () => listFn({ data: { product_id: product.id } }) });
  const [type, setType] = useState<"AWARD" | "ASSOCIATION" | "QC" | "DISCLOSURE">("AWARD");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const add = useMutation({
    mutationFn: () => addFn({ data: { product_id: product.id, type, title: title || undefined, source_url: url || undefined } }),
    onSuccess: () => { toast.success("Evidence ditambahkan"); setTitle(""); setUrl(""); qc.invalidateQueries({ queryKey: ["evidence", product.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const decide = useMutation({
    mutationFn: (v: { id: string; decision: "APPROVED" | "REJECTED" }) => decideFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evidence", product.id] }),
  });

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Evidence</div>
      <ul className="divide-y">
        {(data ?? []).map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{e.title || e.source_url || e.type}</div>
              <div className="text-xs text-muted-foreground">{e.type} · {new Date(e.created_at).toLocaleString("id-ID")}</div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline">{e.status}</Badge>
              {e.status === "PENDING" ? (
                <>
                  <Button size="sm" variant="secondary" onClick={() => decide.mutate({ id: e.id, decision: "APPROVED" })}>Setujui</Button>
                  <Button size="sm" variant="destructive" onClick={() => decide.mutate({ id: e.id, decision: "REJECTED" })}>Tolak</Button>
                </>
              ) : null}
            </div>
          </li>
        ))}
        {data && data.length === 0 ? <li className="py-2 text-xs text-muted-foreground">Belum ada evidence.</li> : null}
      </ul>
      <div className="mt-3 grid gap-2 md:grid-cols-[160px_1fr_1fr_auto]">
        <SelectBox value={type} onChange={(v) => setType(v as typeof type)}
          options={[["AWARD","Award"],["ASSOCIATION","Association"],["QC","QC"],["DISCLOSURE","Disclosure"]].map(([v,l]) => ({ value: v, label: l }))} />
        <Input placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="https://sumber-evidence" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button size="sm" onClick={() => add.mutate()} disabled={add.isPending}>Tambah</Button>
      </div>
    </div>
  );
}

/* ---------------- Masters ---------------- */

function MastersTab() {
  const qc = useQueryClient();
  const mastersFn = useServerFn(listMasters);
  const upsertM = useServerFn(upsertMaster);
  const upsertC = useServerFn(upsertCut);
  const { data } = useQuery({ queryKey: ["masters"], queryFn: () => mastersFn() });

  const [row, setRow] = useState<{ entity: "species"|"brands"|"grades"; code: string; name: string }>({ entity: "species", code: "", name: "" });
  const [cut, setCut] = useState<{ species_id: string; code: string; name: string }>({ species_id: "", code: "", name: "" });

  if (!data) return <div className="text-sm text-muted-foreground">Memuat…</div>;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Species / Brands / Grades</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[140px_1fr_1fr_auto]">
            <SelectBox value={row.entity} onChange={(v) => setRow({ ...row, entity: v as typeof row.entity })}
              options={[{ value: "species", label: "Species" }, { value: "brands", label: "Brand" }, { value: "grades", label: "Grade" }]} />
            <Input placeholder="Kode" value={row.code} onChange={(e) => setRow({ ...row, code: e.target.value })} />
            <Input placeholder="Nama" value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} />
            <Button size="sm" onClick={async () => {
              try { await upsertM({ data: row }); toast.success("Tersimpan"); setRow({ ...row, code: "", name: "" }); qc.invalidateQueries({ queryKey: ["masters"] }); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); }
            }}>Simpan</Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MasterCol title="Species" items={data.species} />
            <MasterCol title="Brands" items={data.brands} />
            <MasterCol title="Grades" items={data.grades} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Cuts (per species)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[180px_1fr_1fr_auto]">
            <SelectBox value={cut.species_id} onChange={(v) => setCut({ ...cut, species_id: v })}
              placeholder="Pilih species"
              options={data.species.map((s) => ({ value: s.id, label: s.name }))} />
            <Input placeholder="Kode" value={cut.code} onChange={(e) => setCut({ ...cut, code: e.target.value })} />
            <Input placeholder="Nama" value={cut.name} onChange={(e) => setCut({ ...cut, name: e.target.value })} />
            <Button size="sm" onClick={async () => {
              try { await upsertC({ data: cut }); toast.success("Tersimpan"); setCut({ ...cut, code: "", name: "" }); qc.invalidateQueries({ queryKey: ["masters"] }); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); }
            }}>Simpan</Button>
          </div>
          <ul className="divide-y rounded-md border">
            {data.cuts.map((c) => {
              const sp = data.species.find((s) => s.id === c.species_id);
              return (
                <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{c.name} <span className="text-muted-foreground">({c.code})</span></span>
                  <Badge variant="outline">{sp?.name}</Badge>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function MasterCol({ title, items }: { title: string; items: { id: string; code: string; name: string; is_active: boolean }[] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <ul className="divide-y rounded-md border">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between px-2 py-1.5 text-sm">
            <span className="truncate">{i.name}</span>
            <span className="ml-2 shrink-0 text-[10px] uppercase text-muted-foreground">{i.code}</span>
          </li>
        ))}
        {items.length === 0 ? <li className="p-2 text-xs text-muted-foreground">Kosong.</li> : null}
      </ul>
    </div>
  );
}

/* ---------------- shared ---------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SelectBox({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder ?? "Pilih…"} /></SelectTrigger>
      <SelectContent>{options.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent>
    </Select>
  );
}
