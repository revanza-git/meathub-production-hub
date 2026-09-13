import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useBi, useErr } from "@/lib/i18n";
import { toast } from "sonner";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Field, SelectInput, SubmitButton, TextArea, TextInput } from "./form-kit";
import { CATEGORIES, waLink } from "@/lib/meatlink/config";
import {
  emptyRfqItem,
  rfqSchema,
  rfqWhatsappMessage,
  type RfqInput,
  type RfqItem,
} from "@/lib/meatlink/leads";
import { submitRfqRequest } from "@/lib/meatlink/rfq.functions";

const EMPTY: RfqInput = {
  company_name: "",
  contact_name: "",
  whatsapp: "",
  email: "",
  delivery_location: "",
  items: [emptyRfqItem()],
  purchase_frequency: "",
  current_supplier: "",
  current_price: "",
  target_price: "",
  payment_terms: "",
  required_delivery_date: "",
  notes: "",
};

export function RfqForm() {
  const [values, setValues] = useState<RfqInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ input: RfqInput; referenceNo: string; token: string } | null>(null);
  const submitRequest = useServerFn(submitRfqRequest);
  const bi = useBi();
  const err = useErr();

  function set<K extends keyof RfqInput>(key: K, value: RfqInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setItem<K extends keyof RfqItem>(index: number, key: K, value: RfqItem[K]) {
    setValues((v) => ({
      ...v,
      items: v.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addItem() {
    setValues((v) => ({ ...v, items: [...v.items, emptyRfqItem()] }));
  }

  function removeItem(index: number) {
    setValues((v) => ({
      ...v,
      items: v.items.length > 1 ? v.items.filter((_, i) => i !== index) : v.items,
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = rfqSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] = err(issue.message);
      setErrors(next);
      toast.error(bi("Lengkapi kolom yang wajib diisi.", "Please complete the required fields."));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const result = await submitRequest({ data: parsed.data });
      setDone({ input: parsed.data, referenceNo: result.referenceNo, token: result.token });
      toast.success(bi("Permintaan diterima. Tim sourcing kami akan menghubungi Anda.", "RFQ received. Our sourcing team will be in touch."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : bi("Permintaan gagal dikirim.", "Could not send your request."));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="border border-line bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-crimson" aria-hidden="true" />
        <h2 className="mt-5 font-display text-2xl">{bi("Permintaan Anda sudah diterima tim sourcing", "Your request is with our sourcing team")}</h2>
        <p className="eyebrow mt-4 text-crimson">{done.referenceNo}</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ash">
          {bi("Setiap permintaan kami tinjau manual dan cocokkan dengan jaringan pemasok. Balasan dalam satu hari kerja.", "We review every RFQ manually and match it against our supplier network. Expect a response within one business day.")}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <a
          href={`/penawaran/${encodeURIComponent(done.referenceNo)}?token=${encodeURIComponent(done.token)}`}
          className="eyebrow inline-flex justify-center bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep"
        >
          {bi("Lihat status permintaan", "Track request")}
        </a>
        <a
          href={waLink(rfqWhatsappMessage(done.input))}
          target="_blank"
          rel="noreferrer noopener"
          className="eyebrow inline-flex justify-center border border-line px-6 py-4 text-ink transition-colors hover:border-crimson hover:text-crimson"
        >
          {bi("Lanjut via WhatsApp", "Continue on WhatsApp")}
        </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-line bg-card p-6 sm:p-8">
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="eyebrow mb-5 text-crimson">{bi("Profil bisnis Anda", "Your business")}</legend>
        <Field label={bi("Nama perusahaan", "Company name")} required error={errors["company_name"]}>
          <TextInput
            value={values.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            placeholder={bi("mis. Nusantara Dining Group", "e.g. Nusantara Dining Group")}
          />
        </Field>
        <Field label={bi("Nama kontak", "Contact person")} required error={errors["contact_name"]}>
          <TextInput
            value={values.contact_name}
            onChange={(e) => set("contact_name", e.target.value)}
            placeholder={bi("Nama lengkap", "Full name")}
          />
        </Field>
        <Field label={bi("Nomor WhatsApp", "WhatsApp number")} required error={errors["whatsapp"]}>
          <TextInput
            value={values.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="+62 …"
            inputMode="tel"
          />
        </Field>
        <Field label={bi("Email", "Email")} error={errors["email"]}>
          <TextInput
            type="email"
            value={values.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            placeholder="name@company.com"
          />
        </Field>
        <Field label={bi("Lokasi pengiriman", "Delivery location")} required error={errors["delivery_location"]}>
          <TextInput
            value={values.delivery_location}
            onChange={(e) => set("delivery_location", e.target.value)}
            placeholder={bi("Kota / area", "City / area")}
          />
        </Field>
        <Field label={bi("Termin pembayaran yang diinginkan", "Payment terms preferred")} error={errors["payment_terms"]}>
          <TextInput
            value={values.payment_terms ?? ""}
            onChange={(e) => set("payment_terms", e.target.value)}
            placeholder={bi("mis. COD, 14 hari", "e.g. COD, 14 days")}
          />
        </Field>
      </fieldset>

      <div className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-crimson">{bi("Kebutuhan Anda", "What you need")}</p>
            <p className="mt-2 text-xs text-ash">
              {bi("Tambahkan setiap potongan yang Anda cari — satu baris per produk. Tidak perlu kirim beberapa permintaan.", "Add every cut you are sourcing — one line per product. No need to send several requests.")}
            </p>
          </div>
          <span className="text-xs text-ash">
            {values.items.length} {bi("item", values.items.length > 1 ? "items" : "item")}
          </span>
        </div>

        {errors["items"] ? (
          <p className="mt-3 text-xs text-crimson">{errors["items"]}</p>
        ) : null}

        <div className="mt-5 space-y-5">
          {values.items.map((item, index) => (
            <fieldset key={index} className="border border-line p-5">
              <div className="mb-5 flex items-center justify-between">
                <legend className="eyebrow text-ash">{bi("Item", "Item")} {index + 1}</legend>
                {values.items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="inline-flex items-center gap-1.5 text-xs text-ash transition-colors hover:text-crimson"
                    aria-label={`${bi("Hapus item", "Remove item")} ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {bi("Hapus", "Remove")}
                  </button>
                ) : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={bi("Kategori", "Category")} error={errors[`items.${index}.category`]}>
                  <SelectInput
                    value={item.category ?? ""}
                    onChange={(e) => setItem(index, "category", e.target.value)}
                  >
                    <option value="">{bi("Pilih kategori", "Select a category")}</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="Other">{bi("Lainnya", "Other")}</option>
                  </SelectInput>
                </Field>
                <Field
                  label={bi("Produk / potongan", "Product / cut")}
                  required
                  error={errors[`items.${index}.product_cut`]}
                >
                  <TextInput
                    value={item.product_cut}
                    onChange={(e) => setItem(index, "product_cut", e.target.value)}
                    placeholder={bi("mis. Wagyu ribeye", "e.g. Wagyu ribeye")}
                  />
                </Field>
                <Field label={bi("Preferensi origin", "Origin preference")} error={errors[`items.${index}.origin_preference`]}>
                  <TextInput
                    value={item.origin_preference ?? ""}
                    onChange={(e) => setItem(index, "origin_preference", e.target.value)}
                    placeholder={bi("mis. Australia, USA, NZ", "e.g. Australia, USA, NZ")}
                  />
                </Field>
                <Field label={bi("Preferensi brand", "Brand preference")} error={errors[`items.${index}.brand_preference`]}>
                  <TextInput
                    value={item.brand_preference ?? ""}
                    onChange={(e) => setItem(index, "brand_preference", e.target.value)}
                    placeholder={bi("Opsional", "Optional")}
                  />
                </Field>
                <Field
                  label={bi("Grade / marbling", "Grade / marbling")}
                  error={errors[`items.${index}.grade`]}
                  hint={bi("mis. MB6-7, Prime, Choice", "e.g. MB6-7, Prime, Choice")}
                >
                  <TextInput
                    value={item.grade ?? ""}
                    onChange={(e) => setItem(index, "grade", e.target.value)}
                  />
                </Field>
                <Field label={bi("Volume dibutuhkan", "Volume required")} required error={errors[`items.${index}.volume`]}>
                  <TextInput
                    value={item.volume}
                    onChange={(e) => setItem(index, "volume", e.target.value)}
                    placeholder={bi("mis. 100 kg per bulan", "e.g. 100 kg per month")}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={bi("Catatan item", "Item notes")} error={errors[`items.${index}.notes`]}>
                    <TextInput
                      value={item.notes ?? ""}
                      onChange={(e) => setItem(index, "notes", e.target.value)}
                      placeholder={bi("Kemasan, ukuran porsi, spesifikasi trim…", "Packaging, portion size, trim spec…")}
                    />
                  </Field>
                </div>
              </div>
            </fieldset>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="eyebrow mt-5 inline-flex items-center gap-2 border border-line px-5 py-3 text-ink transition-colors hover:border-crimson hover:text-crimson"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {bi("Tambah item lain", "Add another item")}
        </button>
      </div>

      <fieldset className="mt-10 grid gap-5 sm:grid-cols-2">
        <legend className="eyebrow mb-5 text-crimson">{bi("Detail pemesanan", "Order details")}</legend>
        <Field label={bi("Frekuensi pembelian", "Purchase frequency")} error={errors["purchase_frequency"]}>
          <SelectInput
            value={values.purchase_frequency ?? ""}
            onChange={(e) => set("purchase_frequency", e.target.value)}
          >
            <option value="">{bi("Pilih frekuensi", "Select frequency")}</option>
            <option value="One-off">{bi("Sekali beli", "One-off")}</option>
            <option value="Weekly">{bi("Mingguan", "Weekly")}</option>
            <option value="Bi-weekly">{bi("Dua mingguan", "Bi-weekly")}</option>
            <option value="Monthly">{bi("Bulanan", "Monthly")}</option>
          </SelectInput>
        </Field>
        <Field label={bi("Tanggal pengiriman dibutuhkan", "Required delivery date")} required error={errors["required_delivery_date"]}>
          <TextInput
            value={values.required_delivery_date}
            onChange={(e) => set("required_delivery_date", e.target.value)}
            placeholder={bi("mis. 15 September atau secepatnya", "e.g. 15 September or ASAP")}
          />
        </Field>
      </fieldset>

      <fieldset className="mt-10 grid gap-5 sm:grid-cols-2">
        <legend className="eyebrow mb-5 text-crimson">{bi("Sourcing saat ini (opsional)", "Current sourcing (optional)")}</legend>
        <Field label={bi("Pemasok saat ini", "Current supplier")} error={errors["current_supplier"]}>
          <TextInput
            value={values.current_supplier ?? ""}
            onChange={(e) => set("current_supplier", e.target.value)}
          />
        </Field>
        <Field label={bi("Harga saat ini", "Current price")} error={errors["current_price"]}>
          <TextInput
            value={values.current_price ?? ""}
            onChange={(e) => set("current_price", e.target.value)}
            placeholder="Rp / kg"
          />
        </Field>
        <Field label={bi("Target harga", "Target price")} error={errors["target_price"]}>
          <TextInput
            value={values.target_price ?? ""}
            onChange={(e) => set("target_price", e.target.value)}
            placeholder="Rp / kg"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={bi("Catatan tambahan", "Additional notes")} error={errors["notes"]}>
            <TextArea
              value={values.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder={bi("Sertifikasi, kebutuhan halal, catatan rantai dingin…", "Certification, halal requirements, cold chain notes…")}
            />
          </Field>
        </div>
      </fieldset>

      <div className="mt-10 flex flex-col items-start gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-ash">
          {bi("Tanpa perlu akun. Kami tidak pernah mempublikasikan harga Anda atau membagikan data Anda di luar pemasok yang kami seleksi.", "No account needed. We never publish your pricing or share your details beyond the suppliers we shortlist for you.")}
        </p>
        <SubmitButton pending={pending}>{bi("Kirim permintaan", "Submit RFQ")}</SubmitButton>
      </div>
    </form>
  );
}
