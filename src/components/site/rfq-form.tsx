import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Field, SelectInput, SubmitButton, TextArea, TextInput } from "./form-kit";
import { CATEGORIES, waLink } from "@/lib/meatlink/config";
import { rfqSchema, rfqWhatsappMessage, submitRfq, type RfqInput } from "@/lib/meatlink/leads";

const EMPTY: RfqInput = {
  company_name: "",
  contact_name: "",
  whatsapp: "",
  email: "",
  delivery_location: "",
  category: "",
  product_cut: "",
  origin_preference: "",
  brand_preference: "",
  grade: "",
  volume: "",
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
  const [done, setDone] = useState<RfqInput | null>(null);

  function set<K extends keyof RfqInput>(key: K, value: RfqInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = rfqSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      toast.error("Please complete the required fields.");
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await submitRfq(parsed.data);
      setDone(parsed.data);
      toast.success("RFQ received. Our sourcing team will be in touch.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your request.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="border border-line bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-crimson" aria-hidden="true" />
        <h2 className="mt-5 font-display text-2xl">Your request is with our sourcing team</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ash">
          We review every RFQ manually and match it against our supplier network. Expect a response
          within one business day.
        </p>
        <a
          href={waLink(rfqWhatsappMessage(done))}
          target="_blank"
          rel="noreferrer noopener"
          className="eyebrow mt-6 inline-flex bg-crimson px-6 py-4 text-bone transition-colors hover:bg-crimson-deep"
        >
          Continue on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-line bg-card p-6 sm:p-8">
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="eyebrow mb-5 text-crimson">Your business</legend>
        <Field label="Company name" required error={errors["company_name"]}>
          <TextInput
            value={values.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            placeholder="e.g. Nusantara Dining Group"
          />
        </Field>
        <Field label="Contact person" required error={errors["contact_name"]}>
          <TextInput
            value={values.contact_name}
            onChange={(e) => set("contact_name", e.target.value)}
            placeholder="Full name"
          />
        </Field>
        <Field label="WhatsApp number" required error={errors["whatsapp"]}>
          <TextInput
            value={values.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="+62 …"
            inputMode="tel"
          />
        </Field>
        <Field label="Email" error={errors["email"]}>
          <TextInput
            type="email"
            value={values.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            placeholder="name@company.com"
          />
        </Field>
        <Field label="Delivery location" required error={errors["delivery_location"]}>
          <TextInput
            value={values.delivery_location}
            onChange={(e) => set("delivery_location", e.target.value)}
            placeholder="City / area"
          />
        </Field>
        <Field label="Payment terms preferred" error={errors["payment_terms"]}>
          <TextInput
            value={values.payment_terms ?? ""}
            onChange={(e) => set("payment_terms", e.target.value)}
            placeholder="e.g. COD, 14 days"
          />
        </Field>
      </fieldset>

      <fieldset className="mt-10 grid gap-5 sm:grid-cols-2">
        <legend className="eyebrow mb-5 text-crimson">What you need</legend>
        <Field label="Category" error={errors["category"]}>
          <SelectInput value={values.category ?? ""} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.name}>
                {c.name}
              </option>
            ))}
            <option value="Other">Other</option>
          </SelectInput>
        </Field>
        <Field label="Product / cut" required error={errors["product_cut"]}>
          <TextInput
            value={values.product_cut}
            onChange={(e) => set("product_cut", e.target.value)}
            placeholder="e.g. Wagyu ribeye"
          />
        </Field>
        <Field label="Origin preference" error={errors["origin_preference"]}>
          <TextInput
            value={values.origin_preference ?? ""}
            onChange={(e) => set("origin_preference", e.target.value)}
            placeholder="e.g. Australia, USA, NZ"
          />
        </Field>
        <Field label="Brand preference" error={errors["brand_preference"]}>
          <TextInput
            value={values.brand_preference ?? ""}
            onChange={(e) => set("brand_preference", e.target.value)}
            placeholder="Optional"
          />
        </Field>
        <Field label="Grade / marbling" error={errors["grade"]} hint="e.g. MB6-7, Prime, Choice">
          <TextInput value={values.grade ?? ""} onChange={(e) => set("grade", e.target.value)} />
        </Field>
        <Field label="Volume required" required error={errors["volume"]}>
          <TextInput
            value={values.volume}
            onChange={(e) => set("volume", e.target.value)}
            placeholder="e.g. 100 kg per month"
          />
        </Field>
        <Field label="Purchase frequency" error={errors["purchase_frequency"]}>
          <SelectInput
            value={values.purchase_frequency ?? ""}
            onChange={(e) => set("purchase_frequency", e.target.value)}
          >
            <option value="">Select frequency</option>
            <option value="One-off">One-off</option>
            <option value="Weekly">Weekly</option>
            <option value="Bi-weekly">Bi-weekly</option>
            <option value="Monthly">Monthly</option>
          </SelectInput>
        </Field>
        <Field label="Required delivery date" required error={errors["required_delivery_date"]}>
          <TextInput
            value={values.required_delivery_date}
            onChange={(e) => set("required_delivery_date", e.target.value)}
            placeholder="e.g. 15 September or ASAP"
          />
        </Field>
      </fieldset>

      <fieldset className="mt-10 grid gap-5 sm:grid-cols-2">
        <legend className="eyebrow mb-5 text-crimson">Current sourcing (optional)</legend>
        <Field label="Current supplier" error={errors["current_supplier"]}>
          <TextInput
            value={values.current_supplier ?? ""}
            onChange={(e) => set("current_supplier", e.target.value)}
          />
        </Field>
        <Field label="Current price" error={errors["current_price"]}>
          <TextInput
            value={values.current_price ?? ""}
            onChange={(e) => set("current_price", e.target.value)}
            placeholder="Rp / kg"
          />
        </Field>
        <Field label="Target price" error={errors["target_price"]}>
          <TextInput
            value={values.target_price ?? ""}
            onChange={(e) => set("target_price", e.target.value)}
            placeholder="Rp / kg"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Additional notes" error={errors["notes"]}>
            <TextArea
              value={values.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Packaging, certification, halal requirements, cold chain notes…"
            />
          </Field>
        </div>
      </fieldset>

      <div className="mt-10 flex flex-col items-start gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-ash">
          No account needed. We never publish your pricing or share your details beyond the
          suppliers we shortlist for you.
        </p>
        <SubmitButton pending={pending}>Submit RFQ</SubmitButton>
      </div>
    </form>
  );
}
