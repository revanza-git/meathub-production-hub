# Analisis Katalog di `/insights`

## Tujuan
Menambahkan bagian **Analisis Katalog** pada halaman `/insights` yang membantu pembeli membandingkan harga indikatif, stok tersedia, dan permintaan pasar berdasarkan **cut, grade, dan origin**, tanpa membuka harga modal, identitas pelanggan, atau detail permintaan individual.

## Pengalaman pengguna
- Tambahkan navigasi ringkas di bagian atas konten `/insights`: **Analisis Katalog** dan **Catatan Sourcing**.
- Tampilkan ringkasan katalog: jumlah SKU aktif, total stok, median/rata-rata harga publik, dan total permintaan dalam 90 hari terakhir.
- Sediakan tiga filter yang bisa dipakai bersamaan: **Cut**, **Grade**, dan **Origin**, plus tombol reset.
- Tampilkan tabel/peringkat yang mudah dipindai di desktop dan kartu horizontal di ponsel, dengan kolom:
  - nama kelompok;
  - kisaran dan harga rata-rata per kg;
  - stok tersedia dalam kg;
  - jumlah SKU;
  - jumlah permintaan 90 hari;
  - indikator hubungan stok–permintaan.
- Pengguna dapat mengganti sudut pandang agregasi antara **per cut**, **per grade**, dan **per origin** tanpa berpindah halaman.
- Sertakan kondisi memuat, kosong, dan gagal yang jelas, serta catatan bahwa harga bersifat indikatif dan data permintaan berbentuk agregat.
- Pertahankan Sourcing Notes, panel baca, dan Recently Sourced yang sudah ada.

## Data dan keamanan
- Tambahkan fungsi database publik khusus baca untuk menghasilkan agregat katalog dari produk aktif dan tayang saja.
- Harga memakai harga publik efektif; harga modal dan markup tidak pernah dikirim ke browser.
- Permintaan dihitung dari item RFQ selama 90 hari terakhir, termasuk RFQ multi-item.
- Normalisasi nilai cut, grade, dan origin agar data permintaan dapat dicocokkan dengan katalog.
- Terapkan ambang privasi: kelompok permintaan dengan kurang dari 3 permintaan tidak ditampilkan sebagai angka spesifik.
- Fungsi hanya mengembalikan agregat; nama perusahaan, kontak, catatan, token, dan identitas pembeli tidak pernah ikut.
- Cabut akses bawaan fungsi dari `PUBLIC`, lalu berikan akses eksekusi eksplisit kepada pengunjung, pengguna masuk, dan layanan internal.

## Implementasi teknis
- Migration baru: fungsi RPC `ml_public_catalog_analysis` dengan parameter filter opsional dan rentang permintaan tetap 90 hari.
- Hook data baru di modul insights untuk memanggil RPC, mengubah hasil menjadi tipe yang aman, dan cache singkat.
- Komponen presentasi terpisah untuk filter, metrik ringkas, selector dimensi, dan tabel/kartu analisis.
- Integrasikan komponen pada `/insights` sebelum Catatan Sourcing dan perbarui metadata halaman agar mencakup analisis katalog.
- Gunakan token visual Meatlink yang ada; tidak mengubah desain dasar halaman.

## Verifikasi
- Uji hasil agregasi dan filter untuk cut, grade, serta origin.
- Pastikan tidak ada kolom sensitif pada respons fungsi publik.
- Uji tampilan desktop dan ponsel, termasuk overflow tabel/kartu, bilingual ID/EN, reset filter, loading, empty, dan error state.
- Jalankan tes terkait, cek hasil build, console, dan runtime halaman `/insights`.
