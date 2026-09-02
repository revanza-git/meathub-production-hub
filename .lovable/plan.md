# Markup per satuan: Ritel 150rb / Loaf 60rb / Ctn 55rb / Tonase 45rb

## Kondisi sekarang
- Harga publik = `sale_price_idr + markup_idr` (markup per item, default 60rb, A5 150rb).
- Margin per satuan masih hardcode di `src/lib/meatlink/inventory.ts`: ton 40rb, carton 45rb, loaf 60rb — belum ada ritel.
- Harga ritel hanya lewat kolom manual `retail_price_idr`; kalau kosong ikut harga loaf.
- Tidak ada tempat di `/admin/settings` untuk mengatur angka margin ini.

## Target
Satu sumber kebenaran margin per satuan, bisa diubah admin, dipakai konsisten di katalog, detail produk, keranjang, checkout, dan laporan.

## 1. Konfigurasi (database)
- Simpan di `admin_settings` dengan key `unit_margin_idr`:
  `{"retail":150000,"loaf":60000,"ctn":55000,"ton":45000}`.
- Tambah RPC `ml_unit_margins()` (security definer, read-only, boleh diakses anon) supaya halaman publik bisa membaca nilai ini tanpa membuka tabel setting ke publik.
- Nilai default tetap ada di kode sebagai fallback bila RPC gagal.

## 2. Logika harga
Loaf tetap jadi acuan harga yang ditampilkan (harga publik = base + markup item).
Satuan lain dihitung dari selisih terhadap loaf, sehingga item premium (mis. A5 dengan markup 150rb) tetap menjaga premi-nya:

```
harga(unit) = harga_loaf - (margin_loaf - margin_unit)
ritel       = harga_loaf + (150.000 - 60.000)
ctn         = harga_loaf - 5.000
tonase      = harga_loaf - 15.000
```

- `retail_price_idr` yang diisi manual tetap menang sebagai override per item.
- Update `UNIT_MARGIN_IDR`, `unitMargin`, `unitPrice`, `unitPriceFromPublic` agar menerima konfigurasi (bukan konstanta mati) dan menambah unit `retail`.

## 3. Penerapan ke seluruh inventaris
- Tidak perlu ubah data per baris: margin satuan berlaku global, `markup_idr` per item tetap dipakai untuk premi khusus (A5 dll).
- Migrasi kecil: seed baris konfigurasi + normalisasi `markup_idr` yang bernilai 0/null ke 60rb agar tidak ada item tanpa margin.
- Import Excel & form admin tetap memakai `defaultMarkup` (60rb / 150rb A5).

## 4. UI Admin
- `/admin/settings`: panel baru "Margin per satuan" dengan 4 input (Ritel, Loaf, Karton, Tonase), validasi angka ≥ 0, simpan ke `admin_settings`.
- `/admin/inventory`: kolom pratinjau harga menampilkan estimasi harga tiap satuan berdasarkan konfigurasi.

## 5. UI Publik
- Tabel satuan di halaman produk memakai margin konfigurasi (termasuk baris Ritel).
- Kartu produk & mode belanja Ritel/Grosir memakai harga hasil konfigurasi yang sama.

## 6. Verifikasi
- Unit test kecil untuk fungsi harga per satuan (termasuk kasus A5 dan override ritel).
- Cek `/produk`, `/produk/$slug`, dan `/admin/settings` di preview.

## Keputusan yang perlu konfirmasi
1. Apakah item A5 (markup 150rb) harga ritelnya menjadi 240rb (mempertahankan premi), atau dipatok rata 150rb untuk semua item?
2. Apakah harga yang ditampilkan default di katalog tetap harga Loaf?
