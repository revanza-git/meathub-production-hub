# Rencana: Inventori yang mudah dioperasikan dan aman dari penghapusan massal

## Sasaran
Admin non-teknis dapat menambah, mengubah, dan mengunggah item tanpa memahami tabel yang rumit; kekeliruan memilih impor tidak boleh lagi menghapus katalog atau harga khusus pelanggan. Rencana ini belum mengubah inventori.

## Pengalaman admin
1. **Daftar sederhana:** tampilkan foto, nama + merek, stok, harga jual yang terlihat pembeli, dan status. Pencarian dan filter merek/kanal tetap ada; kolom lanjutan dipindahkan ke layar detail item. Pastikan nyaman di HP tanpa tabel selebar layar yang harus digeser jauh.
2. **Tambah/edit item terpandu:** tombol utama “Tambah produk” membuka formulir bertahap: identitas dan foto → harga dan stok → kanal penjualan → tinjau dan simpan. Gunakan pilihan yang mudah dikenali; tebakan grade/potongan boleh membantu tetapi tetap bisa dikoreksi. Tampilkan pratinjau harga akhir sebelum simpan dan pesan sukses/gagal yang jelas. Tidak ada perubahan diam-diam saat kolom kehilangan fokus.
3. **Pisahkan aksi berkas:** “Unduh daftar inventori” hanya mengunduh Excel/CSV; “Tambah dari Excel” untuk mengunggah item baru. Jangan letakkan aksi unduh berdekatan dengan aksi yang mengubah data. Tampilkan tautan template dan penjelasan singkat kolom wajib.

## Perlindungan impor
1. **Hapus pilihan “Ganti semuanya” dan kode delete-all**, bukan sekadar menyembunyikannya. Impor rutin hanya **Tambah baru**; pembaruan produk yang sudah ada menjadi alur terpisah dan eksplisit, bukan mode yang bisa terpilih tidak sengaja.
2. **Pratinjau wajib sebelum simpan:** tampilkan jumlah baris valid, baris bermasalah, produk yang sudah ada, dan beberapa contoh perubahan. Baris ganda tidak diam-diam dianggap baru. Tombol simpan nonaktif bila ada kesalahan yang belum ditangani. Setelah selesai, tampilkan jumlah berhasil dan gagal, bukan pesan sukses umum.
3. **Pertahanan di tingkat data:** larang penghapusan massal inventori lewat akses aplikasi biasa; ubah hapus item menjadi arsip/nonaktif agar identitas item dan harga khusus pelanggan tidak terhapus karena relasi `ON DELETE CASCADE`. Pastikan jalur penulisan lain tidak bisa melewati aturan ini. Jika suatu saat benar-benar perlu penggantian total, sediakan prosedur pemulihan khusus di luar alur harian admin, dengan cadangan dan pemeriksaan terpisah.
4. **Jejak dan pemulihan:** simpan ringkasan tiap impor (siapa, kapan, file/jumlah baris, yang ditambah/diperbarui/gagal) serta cadangan data relevan sebelum pembaruan massal; sediakan cara memeriksa dan memulihkan perubahan tanpa menimpa perubahan lain yang lebih baru.

## Urutan pelaksanaan dan uji
1. Tutup jalur penghapusan massal terlebih dahulu; pastikan data inventori dan harga khusus yang ada tetap utuh.
2. Bangun alur tambah/edit dan daftar yang lebih ringkas, lalu sederhanakan impor dan tambahkan unduh daftar.
3. Uji dengan file kecil dan file besar: tambah baru, duplikat, baris rusak, jaringan terputus, serta percobaan penghapusan massal. Verifikasi jumlah item dan harga khusus sebelum/sesudah; uji desktop dan HP dengan akun admin.

## Temuan yang mendasari
Saat ini mode “Ganti semuanya” menjalankan hapus seluruh `admin_inventory` lalu memasukkan file dalam beberapa kelompok dari browser. Tidak ada transaksi tunggal atau konfirmasi kedua. Menghapus item juga dapat menghapus `ml_buyer_prices` yang terhubung. Daftar utama sangat lebar dan sebagian angka disimpan otomatis ketika kolom ditinggalkan.
