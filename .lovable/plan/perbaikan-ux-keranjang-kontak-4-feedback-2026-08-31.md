# Perbaikan UX Keranjang & Kontak (4 feedback)

## 1. Qty dihapus habis → item ikut hilang
Saat input qty dikosongkan, nilai jadi `0` dan `setQty` langsung membuang baris dari keranjang.

Perbaikan:
- Simpan nilai input sebagai teks lokal per baris, jadi kolom boleh kosong sementara tanpa menghapus item.
- Baris hanya dihapus lewat tombol hapus, atau saat input di-blur dengan nilai kosong/0 (dengan konfirmasi minimal: kembalikan ke 1 jika kosong).
- Tetap batasi minimum 1 kg dan pembulatan 0,5 seperti sekarang.

## 2. Ikon keranjang tidak terlihat di mobile
Saat ini ikon keranjang hanya muncul di layar besar; mobile harus buka menu hamburger.

Perbaikan:
- Tampilkan ikon keranjang (dengan badge jumlah) di baris header mobile, di sebelah kiri tombol hamburger.
- Ukuran sentuh ≥ 44px, label aria tetap ada.

## 3. Tombol WhatsApp mengambang
Belum ada tombol WA melayang.

Perbaikan:
- Komponen `WhatsAppFab` melayang di kanan bawah pada semua halaman publik.
- Pakai `waLink()` yang sudah ada, pesan default bilingual.
- Posisi dinaikkan sedikit di mobile agar tidak menutupi tombol/CTA bawah, dan tidak bertabrakan dengan banner consent.

## 4. Notifikasi "ditambahkan ke keranjang" terlalu lama
Toaster di posisi `top-center` menutupi header, dan durasi default terlalu panjang.

Perbaikan:
- Pindahkan Toaster ke `bottom-center` di mobile (tetap tidak menghalangi header), durasi 2 detik, dan aktifkan `closeButton`.
- Pastikan toast tidak menangkap klik di area header.

## Catatan teknis
Berkas yang disentuh: `src/routes/keranjang.tsx`, `src/components/site/site-header.tsx`, `src/routes/__root.tsx`, komponen baru `src/components/site/whatsapp-fab.tsx` dipasang di `src/components/site/site-layout.tsx`. Tidak ada perubahan skema database atau logika harga.
