# Rencana: Mengisi formulir data susulan onboarding Midtrans

## Isian formulir
1. **Kapan website bisa diakses dengan https://**: pakai tanggal hari ini (21/10/2026) dan tulis di Catatan bahwa https://meatlink.id sudah aktif (TLS 1.3, sertifikat berlaku sampai 8 Januari 2027). Tanggal 20/08/2026 yang terisi sekarang sudah lewat dan bisa membingungkan peninjau.
2. **Akun contoh untuk login**: buat satu akun Pembeli khusus untuk peninjau Midtrans, misalnya reviewer.midtrans@meatlink.id. Akun ini memakai kata sandi acak, sudah berisi email dan nomor telepon, dan **tidak punya akses admin**. Katalog dan keranjang bisa dibuka tanpa login. Akun ini hanya perlu untuk melihat riwayat pesanan.
3. **Catatan tambahan**: teks siap salin yang berisi:
   - Merchant ID M914944748 dan situs https://meatlink.id.
   - Pembayaran memakai Core API (VA BCA, Mandiri Bill, QRIS). Saat ini kanal itu menolak dengan 402 "Payment channel is not activated", jadi sementara kami memakai transfer BCA langsung.
   - Sertakan URL notifikasi pembayaran.

## Dokumen tambahan (PDF alur transaksi)
PDF berbahasa Indonesia, sekitar 6–8 halaman. Setiap langkah berisi tangkapan layar asli situs dan penjelasan singkat:
1. Halaman utama meatlink.id
2. Katalog / detail produk, lalu tambah ke keranjang
3. Keranjang dan isian data pembeli
4. Pilih metode pembayaran
5. Pesanan dibuat dan muncul di halaman pelacakan
6. Halaman pembayaran

Halaman pembayaran saat ini hanya menampilkan transfer BCA, sedangkan Midtrans meminta "payment page yang menunjukkan metode pembayaran". Halaman pembayaran akan saya tampilkan dua kali:
- **(a) Saat ini**: transfer BCA langsung, sesuai yang dilihat pembeli sekarang.
- **(b) Setelah aktivasi**: pilihan VA BCA, Mandiri Bill, dan QRIS memakai Midtrans Core API. Tangkapan layar diambil dari tampilan sandbox lokal, dan diberi label jelas "simulasi sandbox – menunggu aktivasi".

Halaman terakhir berisi diagram alur notifikasi pembayaran: Midtrans memberi tahu situs, situs memverifikasi, lalu status pesanan menjadi lunas.

## Detail teknis
- Tangkapan layar diambil dengan browser otomatis di 1280px. Pesanan contoh dibuat sementara, lalu dihapus setelah tangkapan layar selesai, supaya tidak ada pesanan uji tersisa.
- Tampilan sandbox (b) hanya disiapkan di sesi lokal tanpa membuat tagihan nyata. Pengaturan pembayaran yang sedang berjalan tidak diubah.
- File disimpan sebagai /mnt/documents/meatlink-alur-transaksi-midtrans.pdf. Setiap halaman diperiksa sebagai gambar sebelum diserahkan.
- Kata sandi akun peninjau diberikan sekali di chat dan tidak disimpan di dokumen.

## Batasan
Formulir tetap Anda kirim sendiri. Aktivasi kanal sepenuhnya keputusan Midtrans.
