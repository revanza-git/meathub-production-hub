# Order Management — integrasi BRD v2.0 ke Meatlink.id

Situs sekarang murni publik (RFQ + supplier form, tanpa login). BRD ini menambah lapisan bertransaksi: akun, order mandiri, katalog/stok vendor, dan konsol admin. Yang publik tetap ada — RFQ jadi pintu masuk buyer yang belum punya akun.

## 1. Yang ditambahkan

| Area | Sekarang | Setelah integrasi |
|---|---|---|
| Akun | Tidak ada | Login/register email+password, 3 role: buyer, vendor, admin |
| Order | Form RFQ anonim | Buyer submit order (produk teks bebas, qty kg, sistem pembayaran) |
| Status | `quote_requests.status` manual | Pending → Confirmed / On Hold / Rejected → Delivered |
| Katalog | Tidak ada | Vendor kelola produk (4 kategori) + qty stok |
| Stok | — | Disimpan di database Postgres, diubah vendor lewat UI (opsional impor CSV) |
| Admin | Tidak ada | Tabel order terpusat, filter, ubah status, matching vendor |
| Buyer lihat stok | — | Agregat qty per produk, **tanpa nama vendor** |

Di luar scope (sesuai BRD): payment gateway, invoicing, notifikasi otomatis, sub-role admin, katalog e-commerce, multi-vendor per order.

## 2. Peta halaman

```text
publik (tetap)      /  /buyers  /suppliers  /request-quote  /supply  /insights  /about  /contact
auth                /auth                     login + register (pilih buyer/vendor)
buyer               /app/orders               My Orders + tombol order baru
                    /app/orders/new           form order
                    /app/orders/$id           detail + timeline status
                    /app/stock                stok tersedia (produk, kategori, qty total)
vendor              /vendor                   ringkasan katalog & stok
                    /vendor/catalog           CRUD produk + ubah qty stok
                    /vendor/import            impor CSV massal (opsional) + riwayat perubahan stok
admin               /admin/orders             tabel semua order + filter + ubah status
                    /admin/orders/$id         detail, matching vendor, keputusan CBD/TOP
                    /admin/stock              seluruh stok + nama vendor
                    /admin/users              daftar akun & penetapan role
```
Semua rute privat berada di bawah gate `_authenticated` + cek role.

## 3. Data

Tabel baru (schema `public`, RLS aktif, GRANT eksplisit):

- `app_users_roles` — pakai pola tabel role terpisah (`user_id`, `role`), plus fungsi `has_role`. Tabel `user_roles` dan enum `app_role` sudah ada di database; role `buyer_owner` / `vendor_admin` / `platform_admin` dipakai ulang, tidak bikin enum baru.
- `buyer_orders` — `order_no`, `user_id`, `buyer_name`, `product_text`, `qty_kg`, `payment_term` (CBD/TOP7/TOP14/TOP30), `status`, `vendor_id` (nullable, admin only), `admin_notes`, `top_decision` (approve/cut/forward), timestamps.
- `buyer_order_status_history` — jejak perubahan status + aktor + alasan.
- `vendor_products` — `vendor_user_id`, `name`, `category` (Prime Cut / 2nd Cut / Offal / Bone), `qty_kg`, `unit`, `is_active`, `last_synced_at`.
- `vendor_stock_sources` — `vendor_user_id`, `sheet_url`, `status`, `last_synced_at`, `last_error`.

Aturan akses:
- Buyer: baca/tulis order miliknya; kolom `vendor_id` disembunyikan lewat view khusus buyer.
- Buyer: baca stok lewat view `public_stock` yang mengagregasi qty per (nama produk, kategori) tanpa vendor.
- Vendor: hanya baris miliknya.
- Admin: akses penuh semua tabel.

## 4. Sinkronisasi Google Sheet

Vendor menempel link Google Sheet yang dipublikasikan (format CSV). Server function menarik CSV, memetakan kolom `product_name, category, qty_kg`, lalu upsert ke `vendor_products` dan menulis `last_synced_at`. Sync jalan saat vendor menekan tombol dan otomatis lewat endpoint terjadwal (`/api/public/sync-stock`, dilindungi secret). Template sheet standar disediakan agar antar vendor konsisten — ini menjawab pertanyaan terbuka BRD #1.

## 5. Urutan pengerjaan

1. **Auth & role** — halaman `/auth`, gate rute, penetapan role saat register, admin bisa ubah role.
2. **Order buyer** — tabel + form + My Orders + detail status.
3. **Konsol admin** — tabel terpusat, filter, ubah status, edit/hapus, riwayat.
4. **Katalog vendor** — CRUD produk manual dulu.
5. **Sync Google Sheet** — parser CSV, tombol sync, jadwal, penanganan error.
6. **Matching & keputusan TOP** — layar admin berdampingan order vs stok relevan, aksi Approve / Cut / Forward, penetapan vendor.
7. **Stok untuk buyer** — view agregat tanpa vendor.

Semua memakai bahasa Inggris dan sistem desain Noir & Gold yang sudah ada.

## 6. Perlu keputusan kamu

1. **Pendaftaran vendor** — vendor daftar sendiri di `/auth` lalu menunggu approval admin, atau akun vendor dibuat admin saja? Usulan: daftar sendiri, status pending sampai admin approve.
2. **Stok berubah setelah matching** (pertanyaan terbuka BRD #2) — usulan: sistem tidak otomatis mengembalikan ke Pending; admin melihat penanda merah "stok vendor kurang dari qty order" di layar matching.
3. **Nomor order** — usulan format `ML-YYMM-0001`.
4. **RFQ lama** — dibiarkan terpisah, atau order buyer yang login otomatis mengganti alur RFQ untuk mereka? Usulan: tetap terpisah, RFQ untuk prospek, order untuk akun terdaftar.
