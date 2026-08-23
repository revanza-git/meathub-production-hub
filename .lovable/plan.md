# Ganti foto AI dengan foto asli untuk katalog produk

Semua ilustrasi produk dan panduan grade saat ini dibuat AI. Rencananya diganti dengan foto daging asli dari sumber stok bereputasi dengan lisensi komersial gratis (Pexels dan Unsplash — keduanya mengizinkan penggunaan komersial tanpa atribusi), lalu dipetakan agar relevan dengan tiap cut dan tiap grade marbling.

## 1. Kurasi foto asli

Ambil dan seleksi manual (bukan generate) foto beresolusi tinggi untuk:

- **Per cut / kelompok produk (~16 gambar):** tenderloin, striploin/sirloin, ribeye/cuberoll, tomahawk, T-bone/porterhouse, OP ribs, flat iron, picanha/rump, chuck/oyster blade, short ribs, brisket, knuckle/topside, slice/yakiniku, offal, bone/marrow, lamb rack.
- **Per grade marbling (6 gambar):** foto potongan nyata untuk Ungraded, MB0–2, MB2–4, MB4–6, MB6–9, MB9–12 — dipilih berdasarkan kepadatan marbling yang benar-benar terlihat pada foto, bukan hasil rekaan.

Setiap foto dicek: potongan sesuai nama, tidak ada watermark, dan sesuai untuk konteks B2B.

## 2. Hosting dan pemasangan

- Foto diunggah ke CDN aset Lovable (bukan disimpan sebagai binary di repo), lalu direferensikan lewat pointer aset.
- File AI lama di `src/assets` (feature-*.jpg, grade/*.jpg) dihapus setelah penggantinya terpasang.
- Sumber dan tautan lisensi tiap foto dicatat di satu berkas kredit (`docs/IMAGE_CREDITS.md`) untuk audit.

## 3. Pemetaan relevansi per item

Perbarui `resolveProductImage` di `src/lib/meatlink/featured.ts` agar urutan pemilihan gambar menjadi:

1. `image_url` yang di-set admin (tetap prioritas tertinggi),
2. cocokkan `cut_type` item ke pustaka foto per cut,
3. cocokkan pola nama produk (fallback yang sudah ada, diperluas),
4. untuk item wagyu/marbling tinggi tanpa cut yang cocok, pakai foto sesuai `grade_band`,
5. terakhir, foto default per kategori (Prime/Second/Offal/Bone).

Dampaknya otomatis ke kartu produk, katalog `/produk`, detail produk, shelf unggulan, dan halaman kategori — tanpa mengubah logika bisnis atau harga.

## 4. Panduan grade dan admin

- `/panduan-grade` memakai foto asli per band, dengan baris kredit foto di bawah gambar.
- Di `/admin/inventory`, preset gambar diperbarui ke daftar foto baru sehingga admin bisa memilih foto yang lebih tepat per item atau tetap menempel URL sendiri.

## Catatan teknis

- Tidak ada perubahan skema database; kolom `image_url`, `cut_type`, dan `grade_band` yang sudah ada dipakai apa adanya.
- Hanya lapisan presentasi (`featured.ts`, komponen kartu, halaman grade, preset admin) yang berubah.
- Semua foto diberi `loading="lazy"`, ukuran eksplisit, dan alt text deskriptif sesuai nama produk.

## Perlu keputusan Anda

- Jika ada foto produk asli milik Meatlink sendiri (hasil foto gudang/supplier), itu lebih baik dari stok — bisa dikirim dan saya pakai duluan.
