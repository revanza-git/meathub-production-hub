# Rencana: Pengajuan termin lewat pesanan dan WhatsApp

## Arah
Saya setuju termin/tempo sebaiknya **tidak dianggap metode pembayaran otomatis** selama belum ada alur persetujuan, penagihan, dan pelunasan yang lengkap. Sesuai pilihan Anda, pembeli **membuat pesanan terlebih dahulu**, lalu menghubungi tim Meatlink di WhatsApp. Aturan ini berlaku juga bagi akun yang sebelumnya mempunyai limit disetujui; riwayat pesanan lama tetap utuh.

## Pengalaman pembeli
1. Di keranjang, ganti pilihan “Tempo (TOP)” dan tombol “Ajukan pembayaran tempo” saat ini dengan pilihan **“Ajukan termin via WhatsApp”** untuk semua pembeli. Jelaskan singkat bahwa termin belum disetujui dan tim akan mengonfirmasi syaratnya; tidak perlu login hanya untuk menyampaikan permintaan.
2. Saat checkout, simpan produk, jumlah, total indikatif, dan data pembeli sebagai pesanan baru dengan penanda khusus **menunggu kesepakatan termin**. Jangan buat VA/QR, jatuh tempo, piutang, atau status lunas; harga/ongkir akhir tetap harus dikonfirmasi tim.
3. Setelah berhasil membuat pesanan, tampilkan tombol utama **“Bahas termin di WhatsApp”** di halaman pesanan. Isi pesan otomatis dengan nomor pesanan dan ringkasan kebutuhan, tanpa tautan akses privat atau token; pembeli yang tidak langsung membuka WhatsApp tetap bisa kembali ke pesanan.

## Pengalaman admin dan pengamanan
4. Tampilkan penanda “Pengajuan termin — belum disetujui” pada daftar/detail pesanan admin agar tidak tertukar dengan pesanan yang menunggu pembayaran Midtrans. Pertahankan notifikasi pesanan baru yang sudah ada.
5. Hentikan pembuatan pesanan TOP otomatis dari checkout **dan dari pemanggilan langsung ke sistem**. Persetujuan limit lama tidak lagi otomatis memberi hak memesan tempo; jangan hapus limit, data, atau pesanan TOP historis.
6. Admin menyepakati syarat melalui WhatsApp dan menindaklanjuti pesanan secara manual. Sebelum ada alur persetujuan dan penagihan resmi, aplikasi **tidak mengklaim** termin disetujui, tidak menghitung jatuh tempo, dan tidak menandai lunas hanya karena percakapan WhatsApp.

## Detail teknis
- Gunakan jenis pembayaran/pengajuan terpisah dari `TOP` lama, misalnya `TERMS_REQUEST`, pada pesanan storefront agar laporan piutang TOP historis tidak ikut menghitung pengajuan baru. Pertahankan nilai `TOP` untuk membaca pesanan terdahulu.
- Perbarui fungsi pembuatan pesanan di basis data secara atomik: menerima jenis pengajuan baru tanpa syarat limit, mengunci jalur TOP otomatis untuk pesanan baru, dan mempertahankan semua validasi harga, kupon, dan barang yang sudah ada.
- Gunakan nomor WhatsApp bisnis dan pembuat tautan WhatsApp yang sudah dipakai situs. Status pengajuan baru ditampilkan konsisten pada halaman pesanan pembeli/admin; tidak memicu instruksi Midtrans atau rekonsiliasi pembayaran.
- Uji sebagai pembeli: pesanan tercatat, tautan WhatsApp berisi nomor yang benar, bisa dibuka kembali, tidak ada VA/jatuh tempo/status lunas; uji jalur langsung TOP lama ditolak untuk pesanan baru, sementara riwayat TOP lama tetap tampil.

## Batasan
Ini alur **pengajuan dan percakapan**, bukan sistem kredit atau persetujuan termin digital. Pencatatan keputusan, faktur tempo, penagihan, dan pencocokan pelunasan dapat dirancang terpisah bila nantinya dibutuhkan.