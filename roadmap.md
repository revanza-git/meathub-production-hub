- [x] Kembangkan Minta Penawaran dengan nomor referensi, pelacakan privat, dan respons admin

# Roadmap

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
