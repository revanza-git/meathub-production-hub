# Pengembangan alur “Minta Penawaran”

## Tujuan

Mengubah halaman ini dari formulir kontak satu arah menjadi alur permintaan penawaran yang dapat dilacak: pengguna mengirim kebutuhan rinci, menerima nomor referensi, lalu dapat melihat status dan respons admin melalui tautan privat tanpa wajib membuat akun.

## Yang akan dibangun

### 1. Form kebutuhan yang lebih terarah
- Pertahankan kemampuan menambah beberapa produk dalam satu permintaan.
- Rapikan pengelompokan informasi menjadi profil pembeli, spesifikasi produk, jadwal/lokasi, dan preferensi komersial.
- Pertahankan validasi untuk cut, grade, origin, brand, volume, target harga, termin pembayaran, dan catatan khusus.
- Tambahkan penjelasan singkat tentang proses setelah formulir dikirim tanpa membuat halaman lebih panjang atau penuh kartu.

### 2. Nomor referensi dan tautan privat
- Setiap permintaan mendapat nomor referensi yang mudah dibaca dan token akses acak.
- Setelah berhasil, tampilkan nomor referensi, status awal, tombol **“Lihat status permintaan”**, serta opsi melanjutkan lewat WhatsApp.
- Token hanya ditampilkan dalam tautan privat; database menyimpan bentuk hash-nya agar tidak dapat digunakan langsung bila data internal terbaca.

### 3. Halaman status pengguna
- Buat halaman publik khusus yang hanya dapat dibuka dengan nomor referensi dan token yang benar.
- Tampilkan ringkasan kebutuhan, status proses, waktu pembaruan, dan respons admin bila sudah tersedia.
- Jangan tampilkan data kontak sensitif pada halaman status.
- Sediakan tindakan lanjutan ke WhatsApp atau katalog tanpa mewajibkan login.

### 4. Respons admin
- Kembangkan `/admin/rfq` agar admin dapat membuka detail permintaan, mengubah status, menulis respons, menambahkan masa berlaku/keterangan penawaran, dan menyimpan atau mengirim respons.
- Sediakan tombol kontak WhatsApp dengan pesan yang sudah terisi.
- Jika pengguna memberikan email, **“Simpan & kirim”** akan mengirim email berisi ringkasan respons dan tautan privat ke halaman status.
- Jika email kosong, respons tetap tersimpan dan admin diarahkan menggunakan WhatsApp.

### 5. Data dan keamanan
- Tambahkan kolom referensi publik, hash token akses, isi respons admin, waktu respons, dan masa berlaku respons pada `quote_requests`.
- Seluruh kirim-form, pembacaan tautan privat, dan pengiriman respons dilakukan melalui fungsi server dengan validasi Zod.
- Admin tetap diverifikasi di server sebelum dapat membaca lengkap atau mengubah permintaan.
- Akses publik tidak akan diberi izin membaca langsung tabel permintaan; data hanya dikembalikan setelah token tervalidasi.

### 6. Email respons
- Tambahkan email Meatlink yang sederhana dan konsisten untuk memberi tahu pengguna bahwa permintaannya telah ditanggapi.
- Email berisi nomor referensi, status, ringkasan respons, dan tombol menuju halaman status; bukan data internal admin.

## Asumsi implementasi

- Pengguna tidak wajib memiliki akun.
- Respons utama tersedia melalui tautan privat; email dikirim bila alamat email diisi.
- Integrasi WhatsApp otomatis belum tersedia, jadi WhatsApp menggunakan tautan pesan siap kirim untuk admin dan pengguna.
- Harga penawaran dapat ditulis di respons admin; perubahan ini tidak membuat sistem quotation line-item atau checkout baru.

## Verifikasi

- Uji pengiriman form dengan satu dan beberapa item, termasuk validasi input.
- Pastikan token salah tidak dapat membaca permintaan apa pun.
- Uji admin menyimpan draft respons, mengirim respons, serta mengubah status.
- Uji email hanya terkirim ke alamat pada permintaan terkait.
- Periksa tampilan form, halaman status, dan admin pada desktop serta ponsel.
- Pastikan halaman publik tidak mengalami overflow, layar kosong, atau membocorkan data kontak.
