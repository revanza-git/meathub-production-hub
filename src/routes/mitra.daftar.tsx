import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { MarketLayout } from "@/components/market/market-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/mitra/daftar")({
  head: () => ({
    meta: [
      { title: "Daftar Jadi Vendor Daging — MEATHUB" },
      {
        name: "description",
        content:
          "Jual daging sapi grosir ke ribuan pembeli HORECA seluruh Indonesia. Daftar vendor MEATHUB gratis, komisi 5%, pencairan T+3.",
      },
      { property: "og:title", content: "Daftar Jadi Vendor Daging — MEATHUB" },
      {
        property: "og:description",
        content: "Jual daging sapi grosir ke ribuan pembeli HORECA. Komisi 5%, pencairan T+3.",
      },
    ],
  }),
  component: VendorRegister,
});

const STEPS = ["Data usaha", "Dokumen legal", "Rekening & selesai"];

function VendorRegister() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <MarketLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">Pendaftaran terkirim</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tim verifikasi MEATHUB akan meninjau dokumen Anda dalam 2×24 jam kerja. Status: Under Review.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/mitra"><Button>Buka dasbor vendor</Button></Link>
            <Link to="/produk" search={{}}><Button variant="outline">Lihat katalog</Button></Link>
          </div>
        </div>
      </MarketLayout>
    );
  }

  return (
    <MarketLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-ink">Jadi vendor MEATHUB</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Jangkau ribuan restoran, hotel, dan katering di seluruh Indonesia. Komisi transparan 5%, pencairan
          T+3 hari kerja, dan dukungan cold-chain dari Hub MEATHUB.
        </p>

        <ol className="mt-6 flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`rounded-full border px-3 py-1 text-xs ${
                i === step
                  ? "border-maroon bg-maroon text-white"
                  : i < step
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border text-muted-foreground"
              }`}
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>

        <div className="mt-5 space-y-4 rounded-xl border border-border bg-card p-5">
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <F id="usaha" label="Nama usaha / PT" placeholder="PT Nusantara Protein" />
              <F id="pic" label="Nama penanggung jawab" placeholder="Budi Santoso" />
              <F id="hp" label="Nomor WhatsApp" placeholder="0812-xxxx-xxxx" />
              <F id="kota" label="Kota operasional" placeholder="Jakarta Utara" />
              <div className="sm:col-span-2">
                <Label htmlFor="deskripsi" className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
                  Deskripsi usaha
                </Label>
                <Textarea id="deskripsi" rows={3} placeholder="Jenis daging, kapasitas suplai per bulan, fasilitas cold storage." />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <F id="nib" label="Nomor NIB" placeholder="1234567890123" />
              <F id="npwp" label="Nomor NPWP" placeholder="00.000.000.0-000.000" />
              <F id="halal" label="Nomor sertifikat halal" placeholder="ID000000000000" />
              <F id="nkv" label="Nomor kontrol veteriner (NKV)" placeholder="NKV-0000" />
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Unggah berkas asli akan diminta pada tahap verifikasi. Pada demo ini cukup isi nomor.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <F id="bank" label="Nama bank" placeholder="Bank Mandiri" />
              <F id="rek" label="Nomor rekening" placeholder="1234567890" />
              <F id="atas" label="Atas nama" placeholder="PT Nusantara Protein" />
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Dengan mengirim pendaftaran, Anda menyetujui ketentuan vendor MEATHUB termasuk komisi
                platform 5%.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Kembali
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>Lanjut</Button>
            ) : (
              <Button
                onClick={() => {
                  setDone(true);
                  toast.success("Pendaftaran vendor terkirim (demo)");
                }}
              >
                Kirim pendaftaran
              </Button>
            )}
          </div>
        </div>
      </div>
    </MarketLayout>
  );
}

function F({ id, label, placeholder }: { id: string; label: string; placeholder: string }) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input id={id} placeholder={placeholder} />
    </div>
  );
}
