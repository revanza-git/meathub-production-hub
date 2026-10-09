- [x] Kembangkan Minta Penawaran dengan nomor referensi, pelacakan privat, dan respons admin

# Roadmap

- [x] Satukan akses Pesanan pembeli/admin, pertahankan pesanan khusus dan riwayat lama, serta utamakan tindakan sesuai status tanpa mengubah aturan pembayaran; delapan pengujian aturan lolos, tampilan pembeli diperiksa dengan kontak contoh tanpa menyimpan data.
- [ ] Verifikasi pesanan berisi data dan tindakan pembayaran sampai admin memakai akun uji dengan kontak lengkap dan akses admin; akun tersedia belum memiliki telepon, pesanan toko, atau peran admin.
- [x] Kembalikan metode pembayaran sebelumnya: transfer BCA langsung dan konfirmasi WhatsApp; VA/QRIS tetap dinonaktifkan, riwayat transaksi dipertahankan.
- [x] Periksa ulang Midtrans produksi pada 8 Oktober 2026: BCA VA, Mandiri, dan QRIS semuanya mengembalikan 402 "Payment channel is not activated."; tidak ada instruksi pembayaran diterbitkan.
- [ ] Aktifkan kembali VA/QRIS setelah Midtrans mengaktifkan kanal produksi; terhalang penolakan 402 untuk ketiga kanal, transfer BCA langsung tetap dipertahankan.
- [x] Wajibkan email dan nomor telepon akun Pembeli baru serta arahkan Pembeli lama melengkapi kontak sebelum memakai ruang kerja.
- [x] Tampilkan pilihan potongan Tokusen Wagyu teratas pada sorotan produk di halaman utama.
- [x] Perbaiki validasi alamat email peringatan agar beberapa penerima dapat disimpan dari pengaturan admin.
- [ ] Midtrans produksi: pisahkan transaksi sandbox/nyata, pastikan kunci dan notifikasi produksi, lalu uji transaksi nyata bernilai kecil setelah diterbitkan.
- [x] Ganti gateway iPaymu ke Midtrans sandbox; pesanan dan VA BCA diuji dengan simulator resmi hingga status pembayaran diterima
- [x] Transaksi iPaymu lama diperiksa; satu catatan PENDING tanpa pesanan dan tanpa pembayaran dihapus setelah dikonfirmasi pemilik akun

- [x] Mark top 5 highest-quality inventory items as unggulan (featured_rank 1–5) — all Wagyu A5
- [x] Per-item inventory photo upload with public inventory photo storage
- [x] Strengthen homepage B2B positioning and verify desktop/mobile layouts
- [x] Ringkas kartu artikel insights dan tambahkan panel baca lengkap
- [x] Tambahkan Analisis Katalog harga, stok, dan permintaan di /insights
- [x] Rotasikan foto placeholder pada kartu Baru disourcing agar item berdekatan tidak duplikat
- [x] Ringkas Analisis Katalog publik menjadi lima sinyal pasar utama

- [x] Impor spreadsheet berbantuan Lovable AI: petakan kolom, temukan dugaan duplikat/data invalid, pratinjau append-only dan verifikasi tanpa menulis produk uji
- [x] Selaraskan kedaluwarsa Midtrans 24 jam dengan pembatalan pesanan setelah status Midtrans diverifikasi; scheduler tetap setiap 30 menit
- [x] Sinkronkan pembatalan Midtrans lebih awal melalui notifikasi dan pemeriksaan halaman pesanan, bukan menunggu 24 jam
- [x] Rekonsiliasi Midtrans khusus admin sebagai tab di Pesanan Toko Online: pemeriksaan harian dan manual, perbandingan jumlah/status/waktu, serta penandaan selisih tanpa pelunasan paksa
- [ ] Uji langsung tab rekonsiliasi memakai akun berperan admin (akun pengujian saat ini hanya buyer)
- [x] Arahkan pengajuan termin checkout ke pesanan baru lalu WhatsApp; matikan TOP otomatis tanpa menghapus riwayat
