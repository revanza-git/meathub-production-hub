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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMyRoles } from "@/lib/roles.functions";
import {
  deleteAddress,
  listAddresses,
  upsertAddress,
  type Address,
} from "@/lib/addresses.functions";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/buyer/addresses")({
  head: () => ({
    meta: [{ title: "Alamat Pengiriman — SBMEAT" }, { name: "robots", content: "noindex" }],
  }),
  component: AddressesPage,
});

const ZONE_LABEL: Record<string, string> = {
  JKT_INNER: "Jakarta inti",
  JKT_OUTER: "Jakarta pinggir",
  BODETABEK: "Bodetabek",
  OUT_OF_ZONE: "Luar area",
};

function AddressesPage() {
  const rolesFn = useServerFn(getMyRoles);
  const { data: roles, isLoading } = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => rolesFn(),
  });

  const buyerOrgs = useMemo(
    () =>
      (roles?.memberships ?? []).filter((m) =>
        ["buyer_owner", "buyer_purchaser", "buyer_finance"].includes(m.role),
      ),
    [roles],
  );
  const [orgId, setOrgId] = useState<string | null>(null);
  const activeOrgId = orgId ?? buyerOrgs[0]?.organization_id ?? null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Memuat…</div>
      </div>
    );
  }

  if (buyerOrgs.length === 0) {
    return (
      <AppShell title="SBMEAT Buyer" subtitle="Alamat pengiriman">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Butuh organisasi pembeli</CardTitle>
              <CardDescription>
                Alamat pengiriman disimpan per organisasi. Daftarkan atau tunggu persetujuan
                organisasi Anda dulu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/onboarding">
                <Button>Ke halaman onboarding</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="SBMEAT Buyer" subtitle="Alamat pengiriman">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        {buyerOrgs.length > 1 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Organisasi</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={activeOrgId ?? ""} onValueChange={setOrgId}>
                <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {buyerOrgs.map((b) => (
                    <SelectItem key={b.organization_id} value={b.organization_id}>
                      {b.organization.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : null}
        {activeOrgId ? <AddressesFor orgId={activeOrgId} /> : null}
      </div>
    </AppShell>
  );
}

function AddressesFor({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listAddresses);
  const upsertFn = useServerFn(upsertAddress);
  const deleteFn = useServerFn(deleteAddress);
  const { data } = useQuery({
    queryKey: ["addresses", orgId],
    queryFn: () => listFn({ data: { organization_id: orgId } }),
  });
  const [editing, setEditing] = useState<Partial<Address> | null>(null);

  const save = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          id: editing?.id,
          organization_id: orgId,
          label: editing?.label ?? "",
          recipient_name: editing?.recipient_name ?? "",
          phone: editing?.phone ?? "",
          address_lines: editing?.address_lines ?? "",
          district: editing?.district ?? undefined,
          city: editing?.city ?? "",
          postal_code: editing?.postal_code ?? undefined,
        },
      }),
    onSuccess: async () => {
      toast.success("Alamat disimpan");
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["addresses", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: async () => {
      toast.success("Alamat dihapus");
      await qc.invalidateQueries({ queryKey: ["addresses", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Alamat</h2>
        <Button
          size="sm"
          onClick={() =>
            setEditing({
              label: "",
              recipient_name: "",
              phone: "",
              address_lines: "",
              city: "",
            })
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Tambah alamat
        </Button>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editing.id ? "Ubah alamat" : "Alamat baru"}
            </CardTitle>
            <CardDescription>
              Zona layanan dihitung otomatis berdasarkan kota (approx MVP).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={editing.label ?? ""}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                placeholder="Dapur pusat"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nama penerima</Label>
              <Input
                value={editing.recipient_name ?? ""}
                onChange={(e) => setEditing({ ...editing, recipient_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telepon</Label>
              <Input
                value={editing.phone ?? ""}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                placeholder="0812xxxxxxx"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kota</Label>
              <Input
                value={editing.city ?? ""}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                placeholder="Jakarta Selatan"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Alamat lengkap</Label>
              <Input
                value={editing.address_lines ?? ""}
                onChange={(e) => setEditing({ ...editing, address_lines: e.target.value })}
                placeholder="Jl. …"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kecamatan</Label>
              <Input
                value={editing.district ?? ""}
                onChange={(e) => setEditing({ ...editing, district: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kode pos</Label>
              <Input
                value={editing.postal_code ?? ""}
                onChange={(e) => setEditing({ ...editing, postal_code: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button
                onClick={() => save.mutate()}
                disabled={
                  save.isPending ||
                  !editing.label ||
                  !editing.recipient_name ||
                  !editing.phone ||
                  !editing.address_lines ||
                  !editing.city
                }
              >
                {save.isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data && data.length > 0 ? (
        <div className="grid gap-3">
          {data.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{a.label}</div>
                    {a.service_zone ? (
                      <Badge variant="outline">{ZONE_LABEL[a.service_zone] ?? a.service_zone}</Badge>
                    ) : null}
                  </div>
                  <div className="text-sm">{a.recipient_name} · {a.phone}</div>
                  <div className="text-sm text-muted-foreground">
                    {a.address_lines}
                    {a.district ? `, ${a.district}` : ""}, {a.city}
                    {a.postal_code ? ` ${a.postal_code}` : ""}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>
                    Ubah
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => del.mutate(a.id)}
                    disabled={del.isPending}
                    aria-label="Hapus"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Belum ada alamat.
        </div>
      )}
    </div>
  );
}
