# Rencana: Rekonsiliasi transaksi Midtrans dan pesanan Meatlink

## Tujuan
Admin dapat melihat apakah transaksi Midtrans yang tercatat pada pesanan Meatlink cocok dengan nominal, status pembayaran, dan waktu pesanan. Sesuai pilihan Anda, cakupan **hanya pesanan Meatlink**, bukan seluruh transaksi di akun Midtrans. Tetap memakai Midtrans sandbox saat ini.

## Yang akan dibuat
1. **Pemeriksaan otomatis.** Gunakan notifikasi Midtrans untuk pembaruan segera, pertahankan pengecekan pesanan kedaluwarsa yang sudah ada, dan tambahkan pemeriksaan harian atas transaksi Midtrans yang tercatat pada pesanan. Sediakan tombol **Periksa sekarang** untuk admin pada halaman rekonsiliasi. Tidak perlu akses tambahan ke API daftar seluruh transaksi Midtrans.
2. **Tab Rekonsiliasi di menu Pesanan admin.** Bukan menu utama baru: tab ini hanya terlihat dan dapat diakses admin di halaman Pesanan toko online yang sudah ada. Daftar hasil terakhir dengan pencarian dan filter: cocok, masih menunggu, perlu ditinjau, atau pemeriksaan gagal. Tampilkan nomor pesanan, ID transaksi, nominal Meatlink dibanding Midtrans, status keduanya, waktu pembuatan/pembayaran/pemeriksaan, serta selisih nominal atau waktu. Detail masalah dapat dibuka tanpa membanjiri daftar utama.
3. **Penanganan aman.** Pembayaran hanya dapat otomatis menjadi lunas melalui pemeriksaan Midtrans yang sudah mengharuskan ID transaksi aktif dan jumlah cocok. Status batal/kedaluwarsa hanya mengikuti transaksi aktif yang terverifikasi. Perbedaan jumlah, transaksi lama setelah penggantian bank, status yang bertentangan, atau data Midtrans yang tak tersedia **ditandai untuk pemeriksaan manual**, bukan dipaksa menjadi lunas atau dihapus.
4. **Riwayat dan kendali.** Simpan hasil pemeriksaan terakhir dan waktu pengecekan per transaksi untuk dilihat admin; catat perubahan status yang benar-benar terjadi dalam riwayat pesanan. Buat proses berulang aman: tidak mengirim email/menambah peristiwa ganda saat status tidak berubah. Batasi pemeriksaan bertahap agar gangguan Midtrans tidak menggagalkan semua pesanan.

## Detail teknis
- Gunakan Core API `GET /v2/{order_id}/status` untuk setiap `payment_ref` Midtrans yang tercatat; API riwayat seluruh akun memakai jenis akses berbeda dan tidak diperlukan untuk cakupan ini. Ambil dan bandingkan `transaction_id`, `order_id`, `gross_amount`, `transaction_status`, serta waktu yang tersedia; tampilkan waktu kosong sebagai “tidak tersedia”, bukan mengarang waktu pembayaran.
- Simpan snapshot rekonsiliasi minimal di tabel baru dengan akses baca hanya admin dan penulisan hanya melalui proses server yang berwenang. Jangan simpan payload sensitif pelanggan atau kunci Midtrans. Proses mencocokkan dengan `payment_trx_id` dan `payment_ref` aktif sebelum memakai logika perubahan status yang sudah ada.
- Gabungkan pemeriksaan harian ke jadwal operasional harian yang sudah ada, bukan membuat jadwal pengecekan sering yang baru. Verifikasi batas halaman pengambilan pesanan agar lebih dari 200 pesanan tetap diperiksa; batasi pekerjaan per eksekusi dan lanjutkan pada pemeriksaan berikutnya bila belum selesai.
- Tab dalam rute Pesanan toko online yang sudah ada memakai perlindungan role admin di UI **dan** pada fungsi pemeriksaan/pembacaan di server; tampilkan error dan waktu pemeriksaan terakhir secara jelas.
- Uji kasus nominal sama/berbeda, status terlambat, batal, transaksi tidak ditemukan, hasil berulang, dan satu pesanan yang telah mengganti bank. Verifikasi di sandbox tanpa mengubah status pesanan sungguhan secara sembarang.

## Batasan
Karena hanya transaksi yang masih tercatat pada pesanan yang diperiksa, pembayaran ke VA **lama** setelah pembeli mengganti bank dan transaksi tanpa pesanan tidak bisa dijamin terdeteksi otomatis dari data saat ini. Untuk menemukan semuanya, diperlukan akses riwayat seluruh transaksi Midtrans atau penyimpanan setiap percobaan pembayaran sejak dibuat; tahap ini tidak mengklaim cakupan tersebut.
