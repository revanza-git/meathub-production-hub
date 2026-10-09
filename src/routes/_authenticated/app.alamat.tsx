import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import { AppShell, Panel } from "@/components/app/app-shell";
import {
  deleteAddress,
  listAddresses,
  makeDefault,
  saveAddress,
  type BuyerAddress,
  type BuyerAddressInput,
} from "@/lib/meatlink/addresses";

export const Route = createFileRoute("/_authenticated/app/alamat")({
  head: () => ({ meta: [
    { title: "Alamat Pengiriman — Meatlink.id" },
    { name: "description", content: "Kelola alamat pengiriman pesanan Meatlink Anda." },
    { property: "og:title", content: "Alamat Pengiriman — Meatlink.id" },
    { property: "og:description", content: "Kelola alamat pengiriman pesanan Meatlink Anda." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AddressBookPage,
});

const EMPTY: BuyerAddressInput = {
  label: "",
  buyer_name: "",
  company: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  notes: "",
  is_default: false,
};

function AddressBookPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<BuyerAddressInput>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-addresses"],
    queryFn: listAddresses,
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["buyer-addresses"] });
  };

  const save = useMutation({
    mutationFn: () => saveAddress(form, editing ?? undefined),
    onSuccess: () => {
      toast.success(editing ? "Alamat diperbarui." : "Alamat disimpan.");
      setForm(EMPTY);
      setEditing(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      toast.success("Alamat dihapus.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: makeDefault,
    onSuccess: () => {
      toast.success("Alamat utama diperbarui.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function set<K extends keyof BuyerAddressInput>(k: K, v: BuyerAddressInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startEdit(a: BuyerAddress) {
    setEditing(a.id);
    setForm({
      label: a.label,
      buyer_name: a.buyer_name,
      company: a.company ?? "",
      phone: a.phone,
      email: a.email ?? "",
      address: a.address,
      city: a.city ?? "",
      notes: a.notes ?? "",
      is_default: a.is_default,
    });
  }

  const canSave = form.buyer_name.trim() && form.phone.trim() && form.address.trim();

  return (
    <AppShell
      title="Alamat pengiriman"
      intro="Simpan alamat gudang atau outlet Anda agar checkout berikutnya tinggal pilih."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid gap-4">
          {isLoading ? (
            <p className="text-sm text-ash">Memuat alamat…</p>
          ) : !data || data.length === 0 ? (
            <Panel className="p-8 text-center">
              <h2 className="font-display text-xl text-ink">Belum ada alamat tersimpan</h2>
              <p className="mt-2 text-sm text-ash">
                Tambahkan alamat pertama Anda lewat formulir di samping.
              </p>
            </Panel>
          ) : (
            data.map((a) => (
              <Panel key={a.id} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg text-ink">
                      {a.label}
                      {a.is_default ? (
                        <span className="ml-3 inline-flex border border-crimson px-2 py-1 text-[11px] text-crimson">
                          Alamat utama
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {a.buyer_name}
                      {a.company ? ` · ${a.company}` : ""}
                    </p>
                    <p className="text-xs text-ash">
                      {a.phone}
                      {a.email ? ` · ${a.email}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-ash">
                      {a.address}
                      {a.city ? `, ${a.city}` : ""}
                    </p>
                    {a.notes ? <p className="mt-1 text-xs text-ash">Catatan: {a.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!a.is_default ? (
                      <button
                        type="button"
                        onClick={() => setDefault.mutate(a.id)}
                        className="eyebrow inline-flex items-center gap-2 border border-ink/25 px-4 py-2 text-ink"
                      >
                        <Star className="h-3.5 w-3.5" /> Jadikan utama
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => startEdit(a)}
                      className="eyebrow border border-ink/25 px-4 py-2 text-ink"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => remove.mutate(a.id)}
                      aria-label={`Hapus ${a.label}`}
                      className="eyebrow inline-flex items-center gap-2 border border-line px-4 py-2 text-ash hover:text-crimson"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Panel>
            ))
          )}
        </div>

        <Panel className="h-fit p-6">
          <h2 className="font-display text-xl text-ink">
            {editing ? "Ubah alamat" : "Tambah alamat"}
          </h2>
          <div className="mt-5 grid gap-4">
            <Field label="Label" value={form.label} onChange={(v) => set("label", v)} placeholder="Gudang Cakung" />
            <Field label="Nama penerima" required value={form.buyer_name} onChange={(v) => set("buyer_name", v)} />
            <Field label="Perusahaan" value={form.company ?? ""} onChange={(v) => set("company", v)} />
            <Field label="Nomor WhatsApp" required value={form.phone} onChange={(v) => set("phone", v)} />
            <Field label="Email" type="email" value={form.email ?? ""} onChange={(v) => set("email", v)} />
            <Field label="Kota" value={form.city ?? ""} onChange={(v) => set("city", v)} />
            <Field label="Alamat lengkap" required value={form.address} onChange={(v) => set("address", v)} />
            <Field label="Catatan" value={form.notes ?? ""} onChange={(v) => set("notes", v)} />
            <label className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={Boolean(form.is_default)}
                onChange={(e) => set("is_default", e.target.checked)}
                className="h-4 w-4 accent-[color:var(--crimson,#7f1d1d)]"
              />
              Jadikan alamat utama
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!canSave || save.isPending}
                onClick={() => save.mutate()}
                className="eyebrow bg-crimson px-5 py-3 text-bone transition-colors hover:bg-crimson-deep disabled:opacity-50"
              >
                {save.isPending ? "Menyimpan…" : editing ? "Simpan perubahan" : "Simpan alamat"}
              </button>
              {editing ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm(EMPTY);
                  }}
                  className="eyebrow border border-ink/25 px-5 py-3 text-ink"
                >
                  Batal
                </button>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  const id = `addr-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="eyebrow text-ash">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-line bg-background px-4 py-3 text-sm text-ink outline-none focus:border-ink"
      />
    </div>
  );
}
