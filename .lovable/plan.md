# Integrasi Pembayaran iPaymu (Direct API) & Penghapusan Elefin

Tujuan: MEATHUB bisa menerima pembayaran nyata per-order lewat iPaymu Direct API (sandbox dulu), dan jalur paylater Elefin dihapus total dari produk.

## 1. Kredensial (aman)

VA dan API Key sandbox yang kamu kirim disimpan sebagai secret backend, bukan di kode:
- `IPAYMU_VA`
- `IPAYMU_API_KEY`
- `IPAYMU_MODE` = `sandbox` (nanti diganti `production`)

Saya set nilainya lewat penyimpanan secret; tidak akan pernah muncul di bundle browser atau repo.

## 2. Hapus Elefin / TOP paylater

- Hapus `src/lib/market/paylater.ts`.
- Checkout: hapus opsi "TOP / Paylater", sisakan hanya bayar-per-order (dan deposit wallet sebagai alternatif jika saldo cukup).
- `orders-store.ts`: buang `PaymentPath` `TOP_PAYLATER` dan `fundedBy: "PAYLATER"`.
- Halaman detail pesanan: hapus blok jatuh tempo/tenor paylater.
- Order lama bertipe TOP di localStorage ditangani dengan fallback label supaya tidak error.

## 3. Alur pembayaran per-order (Direct API)

```text
Checkout  ->  server fn createPayment
                 |  POST /payment/direct (signature HMAC-SHA256)
                 v
          simpan payment_intents (order_id, channel, va/qr, expired, status PENDING)
                 |
      Halaman /bayar/:orderId  (VA number / QRIS image dari iPaymu, countdown)
                 |
   iPaymu  ->  POST /api/public/ipaymu/callback  -> verifikasi -> status PAID
                 v
        order status -> PAID, notifikasi, auto-lanjut ke vendor
```

Kanal yang diaktifkan: VA (BCA, BNI, BRI, Mandiri, Permata), QRIS, e-wallet (OVO, DANA, ShopeePay, LinkAja). Kartu menyusul.

## 4. Yang dibangun

**Backend**
- `src/lib/ipaymu.server.ts` — client iPaymu: signature (SHA256 body -> HMAC-SHA256 dengan API key), base URL sandbox/production, `directPayment()`, `checkTransaction()`.
- `src/lib/payments.functions.ts` — server fn terautentikasi: `createOrderPayment` (buat intent + simpan), `getPaymentStatus` (polling fallback).
- `src/routes/api/public/ipaymu/callback.ts` — server route publik untuk notify URL iPaymu; verifikasi transaksi ke iPaymu sebelum menandai PAID (tidak percaya payload mentah), idempoten.

**Database (migrasi)**
- Tabel `payment_intents`: `order_id`, `provider`, `channel`, `amount`, `reference` (trx id iPaymu), `payment_no` (VA/QR string), `status`, `expires_at`, payload mentah, timestamps. RLS: buyer baca miliknya, admin/finance baca semua, tulis hanya lewat service role.
- Tabel `payment_events` untuk audit callback.
- Update `orders`/`invoices` saat PAID (via service role di callback).

**Frontend**
- `/checkout`: pilih kanal pembayaran (VA per bank / QRIS / e-wallet), lalu submit -> panggil `createOrderPayment` -> redirect ke `/bayar/:orderId`.
- `/bayar/:orderId`: tampilkan nomor VA asli + tombol salin, atau gambar QRIS, countdown kedaluwarsa, polling status tiap ~5 detik, state PAID/EXPIRED/FAILED. Tombol simulasi dihapus (sandbox iPaymu bisa dibayar dari dashboard tester).
- Halaman pesanan & admin finance menampilkan referensi transaksi iPaymu.

## 5. Urutan pengerjaan

1. Simpan secret + hapus Elefin dari seluruh UI/tipe.
2. Migrasi `payment_intents` + `payment_events`.
3. Client iPaymu + server fn + route callback.
4. Rombak halaman checkout & bayar ke data nyata.
5. Uji end-to-end di sandbox (VA & QRIS), cek log callback.
6. Checklist go-live: ganti secret ke live, set notify URL produksi, uji satu transaksi kecil nyata.

## 6. Catatan

- Notify URL untuk didaftarkan di dashboard iPaymu: `https://meathub-production-hub.lovable.app/api/public/ipaymu/callback` (preview: domain `-dev`).
- Sumber kebenaran status pembayaran hanya callback/verifikasi server — frontend tidak pernah menetapkan PAID.
- Settlement ke vendor tetap manual lewat modul `settlements` yang sudah ada; disbursement otomatis iPaymu di fase berikutnya.
- Deposit wallet tetap ada sebagai metode alternatif; top-up wallet nanti memakai jalur iPaymu yang sama.
