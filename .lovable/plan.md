# Konsolidasi Alur PO → Bayar → Vendor Kirim → Selesai

Satu tulang punggung pesanan yang dibaca semua peran, tanpa konsep gudang MEATHUB.

## 1. Hapus konsep gudang MEATHUB

- Hapus peran `warehouse` ("Gudang MEATHUB") dan halaman `/mitra/gudang`.
- Pindahkan seluruh tugas verifikasi fisik ke dasbor vendor (`/mitra`): vendor mengonfirmasi stok, gramasi aktual, tanggal potong/kedaluwarsa, dan foto.
- Ganti istilah "Verifikasi Gudang" → "Konfirmasi Vendor" di seluruh UI (checkout, detail pesanan, admin).
- Hapus langkah inbound hub; pengiriman berangkat dari cold storage vendor.

## 2. Satu state machine (7 status)

```text
1 PO Dibuat              buyer checkout, dipecah jadi sub-PO per vendor
2 Menunggu Konfirmasi    vendor konfirmasi stok+berat, SLA jam (admin) -> lewat = batal otomatis
3 Menunggu Persetujuan   buyer setujui revisi berat/harga
4 Menunggu Pembayaran    iPaymu VA/QRIS atau potong deposit, expiry (admin)
5 Diproses & Dikirim     vendor packing, isi armada/resi
6 Cek Terima Pembeli     buyer konfirmasi (SLA jam), auto-confirm setelah N hari
7 Selesai                dana vendor jadi claimable -> settlement -> approve admin
```

Status lama dipetakan ke 7 status ini; status batal/retur/sengketa tetap sebagai cabang.

## 3. Satu sumber data pesanan

- `orders-store.ts` jadi store tunggal: semua peran membaca daftar yang sama, hanya difilter.
  - Buyer: PO miliknya (seluruh sub-PO).
  - Vendor: hanya sub-PO miliknya, plus aksi konfirmasi/kirim.
  - Admin: semua PO + panel intervensi.
- Tetap demo/localStorage untuk mockup ini (data seed + lokal digabung setelah hydrate), sehingga tidak ada perubahan backend di pass ini.

## 4. Layar yang disentuh

| Layar | Perubahan |
| --- | --- |
| `/checkout` | Copy PO + SLA konfirmasi vendor, tanpa istilah gudang |
| `/bayar/$orderId` | Tetap iPaymu; tambah countdown expiry dari config admin |
| `/akun/pesanan/$id` | Timeline 7 status, kartu aksi buyer (setujui / bayar / cek terima) |
| `/mitra` | Antrean "Perlu Konfirmasi", "Perlu Dikirim", "Menunggu Terima" + aksi |
| `/kelola` | Rename label SLA gudang → SLA konfirmasi vendor; tambah payment expiry + panel intervensi (batal paksa, perpanjang SLA) dengan catatan alasan |
| Header/RoleNav | Hapus peran gudang, arahkan nav ke dasbor peran yang tersisa |

## 5. Konfigurasi admin sebagai satu-satunya sumber SLA/biaya

`vendorConfirmationHours` (rename), `paymentExpiryHours` (baru), `buyerCheckHours`, `autoConfirmDays`, app fee per tier, `freeDeliveryKg`, minimum deposit/penarikan.

## Catatan teknis

- Rename kunci config disertai fallback baca nilai lama agar data localStorage lama tidak rusak.
- Semua transisi status lewat helper di `orders-store.ts` (bukan mutasi ad-hoc di komponen), plus jejak `timeline` per sub-PO.
- Hapus rute `mitra.gudang.tsx` dan referensinya di `role.tsx` / `role-nav.tsx`.

## Di luar cakupan

Migrasi pesanan ke database, notifikasi realtime, dan retur/sengketa versi penuh.
