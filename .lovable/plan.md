# Mode Belanja: Bulk (B2B) vs Ritel (B2C)

Tujuan: pembeli memilih cara belanja di awal, katalog & satuan menyesuaikan, dan admin bisa menandai barang mana yang boleh dijual ritel. Semua stok yang ada sekarang tetap B2B.

## 1. Data & admin

Tambah kolom di inventaris:
- `sale_channels` — daftar satuan yang tersedia per produk: `RETAIL`, `LOAF`, `CTN`, `TON`.
  Default untuk seluruh baris yang ada: `LOAF, CTN, TON` (B2B penuh), jadi tidak ada barang ritel sampai admin menandainya.
- `retail_min_kg` / `retail_pack_text` — ukuran jual ritel (mis. "±500 g/pack"), opsional.
- `retail_price_idr` — harga khusus ritel per kg (opsional; kalau kosong pakai harga loaf).

Aturan yang didukung otomatis:
- Produk B2B umum: loaf → ctn → ton.
- Produk B2B yang minimal karton: cukup centang `CTN, TON` saja.
- Produk ritel: centang `RETAIL` (boleh digabung dengan satuan bulk).

Di `/admin/inventory`: kolom + editor centang satuan, field harga/pack ritel, filter "ritel saja", dan dukungan kolom baru di importer Excel (default aman kalau kolom tidak ada).

## 2. Halaman pilih mode

Route baru `/belanja` sesuai mockup: dua kartu (Beli Bulk / Beli Ritel) dengan warna emas vs terracotta, tag satuan, dan preview filter. Pilihan disimpan di cookie `meatlink.mode` (persist, bisa diganti kapan saja).

Perilaku:
- Pengunjung baru yang membuka beranda melihat pilihan mode sekali (banner/interstitial ringan, bukan blocking hard redirect agar SEO beranda tetap aman).
- Header menampilkan indikator mode aktif + tombol "Ganti" yang kembali ke `/belanja`.

## 3. Katalog & filter

- `/produk` menerima param `mode=bulk|ritel` dan `unit=retail|loaf|ctn|ton`.
- RPC katalog publik ditambah filter satuan + facet baru "Satuan / Cara beli", jadi ini benar-benar filter (bukan katalog terpisah), sesuai maunya: satu daftar, disaring.
- Mode ritel = filter `RETAIL`; mode bulk = filter loaf/ctn/ton, plus chip satuan.
- Kartu produk menampilkan badge satuan yang tersedia ("Ritel", "Ctn/Ton saja", dst.).

## 4. Halaman produk & keranjang

- Pemilih satuan hanya menampilkan satuan yang diizinkan produk tersebut; harga per kg mengikuti margin satuan yang sudah ada (ton 40k / ctn 45k / loaf 60k) dan margin ritel = margin loaf (atau `retail_price_idr` bila diisi).
- Minimum order per satuan divalidasi di keranjang (ritel bisa pecahan pack, bulk mengikuti kelipatan loaf/ctn).
- Copy tetap dua bahasa (ID/EN).

## 5. Urutan pengerjaan

1. Migrasi kolom + backfill semua produk lama sebagai B2B.
2. UI admin (centang satuan, harga ritel, importer).
3. RPC katalog + facet satuan.
4. Halaman `/belanja` + indikator mode di header.
5. Filter di `/produk`, badge kartu, pemilih satuan di detail & validasi keranjang.

## Perlu keputusan Anda

- Harga ritel: pakai harga loaf apa adanya, atau ada markup ritel tersendiri (mis. +Rp20k/kg)?
- Barang ritel dari Anda & Om Alex: mau saya siapkan form/kolom saja dulu, atau sekalian masukkan daftar produknya kalau datanya sudah ada?
