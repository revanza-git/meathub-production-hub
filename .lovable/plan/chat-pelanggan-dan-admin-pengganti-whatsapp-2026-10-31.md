# Chat pelanggan dan admin — pengganti WhatsApp

## Tujuan
Pelanggan dapat menghubungi Meatlink langsung dari website, termasuk tanpa login. Setiap pesan pelanggan mengirim pemberitahuan ke **cs@meatlink.id**, dan semua akun dengan peran admin dapat membalas di website. Domain email Meatlink sudah terverifikasi.

## 1. Chat pelanggan
- Ganti tombol WhatsApp mengambang dengan tombol **Chat Meatlink** yang membuka panel percakapan ringan, nyaman di komputer dan HP.
- Pelanggan yang login memakai identitas akunnya; tamu mengisi **nama dan email** sebelum mengirim pesan.
- Tampilkan riwayat, waktu pesan, status pengiriman, penanda pesan belum dibaca, dan pemberitahuan jika pengiriman gagal.
- Sediakan halaman percakapan lengkap dari menu akun. Tamu dapat melanjutkan melalui akses privat di browser yang sama; jika akses hilang atau berganti perangkat, pemulihan memerlukan verifikasi email.
- Jangan menjanjikan admin selalu online atau balasan instan. Pesan tetap tersimpan saat admin tidak sedang membuka website.

## 2. Kotak masuk admin
- Tambahkan menu **Chat pelanggan** dengan jumlah pesan belum dibaca.
- Daftar percakapan memuat nama pelanggan, pesan terakhir, waktu, dan status **Belum dibalas / Aktif / Selesai**; dapat dicari dan difilter.
- Semua admin yang sah dapat membuka dan membalas percakapan yang sama. Catat admin pengirim dan tampilkan balasan terbaru agar admin lain tidak bekerja tanpa melihat konteks.
- Admin dapat menandai percakapan selesai; pesan baru pelanggan membukanya kembali.
- Email hanya pemberitahuan; admin membalas lewat website, bukan melalui balasan email.

## 3. Pemberitahuan email
- Setiap pesan pelanggan yang berhasil tersimpan memicu satu email ke **cs@meatlink.id**, termasuk pesan lanjutan.
- Email berisi pemberitahuan pesan baru, identitas seperlunya, dan tombol menuju percakapan setelah admin login; tidak menyertakan bukti transfer, token akses, atau isi percakapan sensitif.
- Gunakan identitas pesan untuk mencegah email ganda akibat klik ulang atau percobaan ulang.
- Jika pemberitahuan gagal, pesan chat tetap tersimpan dan terlihat di inbox; kegagalan dicatat tanpa memberi kesan pesan pelanggan hilang.
- Pengiriman mengikuti batas layanan email serta aturan penerima yang berhenti berlangganan. Tidak membuat antrean atau tabel email.
- Email balasan ke pelanggan tidak termasuk tahap ini; balasan dibaca melalui chat website.

## 4. Menghapus WhatsApp tanpa memutus alur penjualan
- Hapus tombol, tautan, dan ajakan WhatsApp pada bagian atas/bawah situs, kontak, produk, penawaran, checkout, halaman pesanan, serta halaman admin.
- Ganti dengan **Chat admin**, **Tanyakan produk ini**, atau **Konfirmasi pembayaran** sesuai konteks. Kaitkan percakapan dengan produk, pesanan, atau penawaran yang sedang dibuka.
- Transfer tetap ke **BCA 5271212403 a.n. Revanza Raytama**. Unggah bukti transfer tetap melalui fasilitas yang ada; chat membantu tindak lanjut dan tidak otomatis mengubah status pembayaran.
- Pengajuan termin diarahkan ke chat admin setelah pesanan dibuat, tetap tanpa persetujuan kredit otomatis, tagihan, atau jatuh tempo.
- Ubah label kontak “WhatsApp” menjadi “Nomor telepon” jika relevan; nomor telepon pembeli tetap wajib sesuai aturan yang sudah ada.
- Jangan menghapus riwayat transaksi, metode pembayaran lama, atau data kontak yang masih diperlukan.

## Detail teknis dan keamanan
- Buat penyimpanan percakapan dan pesan di Lovable Cloud, terpisah dari chat AI yang sudah ada. Tambahkan izin akses eksplisit serta RLS pada setiap tabel baru.
- Pelanggan hanya bisa membaca/mengirim pada percakapannya sendiri. Akses tamu memakai token acak kuat yang hash-nya disimpan, diperiksa pada setiap permintaan, dan tidak dimasukkan dalam email pemberitahuan admin atau log.
- Identitas pengirim dan hak admin diverifikasi di server; peran admin tidak dapat dipilih melalui formulir atau penyimpanan browser.
- Gunakan server functions dan pengirim email yang sudah ada. Batasi panjang pesan dan frekuensi pengiriman; tambahkan perlindungan spam pada akses tamu.
- Pembaruan pesan berkala yang ringan saat panel terbuka, berhenti ketika tab tidak aktif; hindari permintaan terus-menerus dari seluruh halaman.
- Pesan berupa teks pada tahap awal; bukti transfer tetap memakai unggahan pesanan yang sudah tersedia, bukan unggahan bebas di chat.
- Pertahankan tampilan bilingual Indonesia/Inggris dan gaya visual website; jangan mengubah bagian lain yang tidak terkait.

## Urutan pengerjaan dan pengujian
1. Penyimpanan dan keamanan akses pelanggan, tamu, serta admin.
2. Panel pelanggan dan inbox multi-admin.
3. Email pemberitahuan, lalu penggantian seluruh titik WhatsApp.
4. Uji alur nyata: tamu/pelanggan mengirim → email diterima → admin membalas → balasan muncul ke pelanggan.
5. Uji akses silang ditolak, non-admin ditolak, kirim ulang tidak menggandakan pesan/email, dan chat tetap tersimpan bila email gagal.
6. Uji konfirmasi transfer serta pengajuan termin tetap berjalan, lalu periksa komputer/HP dan tidak ada tautan WhatsApp aktif yang tertinggal.

**Belum ada perubahan fitur atau data bisnis yang diterapkan; implementasi dimulai setelah rencana disetujui.**