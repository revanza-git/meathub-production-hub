# Ringkasan Analisis Katalog Publik

## Tujuan
Menyederhanakan Analisis Katalog di `/insights` agar cepat dipahami pembeli dan tidak terasa seperti laporan internal.

## Perubahan
- Pertahankan empat angka ringkas: SKU aktif, stok tersedia, median harga, dan sinyal permintaan 90 hari.
- Pertahankan pilihan sudut pandang per cut, grade, atau origin, tetapi hilangkan tiga filter detail.
- Batasi hasil ke lima kelompok utama berdasarkan permintaan, lalu stok.
- Ganti tabel panjang dengan lima baris ringkas berisi nama kelompok, harga rata-rata, stok, dan sinyal permintaan.
- Hilangkan jumlah SKU per kelompok serta kisaran harga minimum–maksimum dari tampilan publik.
- Tambahkan tombol “Lihat katalog terkait” yang membuka katalog produk.
- Pertahankan catatan harga indikatif dan perlindungan privasi permintaan.
- Tidak mengubah fungsi data, halaman admin, atau bagian Catatan Sourcing.

## Verifikasi
- Periksa tampilan desktop dan ponsel tanpa overflow.
- Uji pergantian cut, grade, origin; kondisi memuat, kosong, dan gagal; serta bahasa Indonesia/Inggris.
- Pastikan tombol katalog berfungsi dan halaman tidak menghasilkan error.
