# Perbaikan keterbacaan kartu artikel `/insights`

## Temuan utama

Ya, kartu saat ini terlalu padat untuk format carousel. Seluruh isi artikel langsung ditampilkan, tinggi kartu mengikuti artikel terpanjang, dan pengguna harus membaca paragraf panjang sebelum dapat membandingkan topik lain. Metadata kategori, wilayah, periode, serta disclaimer juga bercampur dalam satu alur sehingga hierarki informasinya kurang cepat dipindai.

## Rencana UI/UX

### 1. Ubah kartu menjadi ringkasan yang cepat dipindai
- Tampilkan kategori, wilayah, dan periode sebagai metadata ringkas di bagian atas.
- Pertahankan judul maksimal sekitar 3 baris.
- Batasi isi awal menjadi ringkasan sekitar 3–5 baris, bukan seluruh artikel.
- Tambahkan aksi **“Baca analisis”** untuk membuka isi lengkap.
- Pertahankan disclaimer AI, tetapi ringkas dan letakkan sebagai catatan kecil konsisten di bagian bawah kartu.

### 2. Tampilkan isi lengkap tanpa memindahkan konteks
- Di desktop, buka artikel pada panel detail/modal yang lebar dan nyaman dibaca.
- Di ponsel, gunakan panel penuh dari bawah agar teks mudah dibaca dan ditutup.
- Panel memuat judul, metadata, isi lengkap, disclaimer AI, dan tombol **“Minta Penawaran”** yang relevan setelah pembaca selesai.
- Fokus, tombol tutup, Escape, dan penguncian scroll akan dibuat aksesibel.

### 3. Stabilkan carousel
- Samakan tinggi kartu agar baris tidak terlihat berantakan.
- Letakkan tombol **“Baca analisis”** pada posisi yang konsisten di setiap kartu.
- Pertahankan navigasi panah dan swipe yang sudah ada.
- Beri indikator posisi sederhana pada ponsel supaya pengguna memahami masih ada artikel lain.

### 4. Perkuat hierarki visual tanpa mendesain ulang
- Tetap gunakan warna, tipografi editorial, garis tepi, dan bentuk kartu Meatlink saat ini.
- Tingkatkan kontras isi artikel serta jarak antara metadata, judul, ringkasan, dan aksi.
- Jangan menambah kartu bertingkat atau elemen dekoratif baru.

### 5. Penanganan konten
- Tahap awal: ringkasan dibuat otomatis dari isi artikel yang sudah ada, sehingga tidak perlu mengubah database atau alur Codex.
- Jika nanti dibutuhkan kualitas editorial lebih tinggi, tambahkan field `summary` khusus sebagai tahap lanjutan, bukan bagian perubahan awal.
- SEO dan structured data tetap memakai isi lengkap, bukan teks yang terpotong di kartu.

## Hasil yang dituju

Pengunjung dapat memahami topik setiap insight dalam beberapa detik, membandingkan beberapa artikel tanpa menggulir kartu yang sangat panjang, lalu memilih artikel yang memang ingin dibaca penuh.

## Verifikasi

- Periksa tampilan desktop dan ponsel untuk tinggi kartu, pemotongan judul/isi, swipe, dan posisi tombol.
- Pastikan artikel panjang dapat dibaca penuh tanpa teks terpotong.
- Pastikan panel detail dapat digunakan dengan keyboard dan tidak menyebabkan halaman bergeser atau overflow horizontal.
- Pastikan Bahasa Indonesia dan English tetap tampil dengan benar.
