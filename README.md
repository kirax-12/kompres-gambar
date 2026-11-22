# Kompres Gambar

Tools web buat mengompres dan mengonversi gambar langsung di browser. Tarik gambar, atur format dan kualitasnya, download hasilnya — selesai. Gak ada proses upload, karena semua gambar diproses pakai Canvas API di perangkatmu sendiri.

## Fitur

- **Drag & drop atau klik buat pilih file** — bisa banyak gambar sekaligus (PNG, JPG, WebP).
- **Pilih format hasil**: JPG, PNG, atau WebP.
- **Slider kualitas 10–100%** buat JPG dan WebP (PNG selalu lossless).
- **Batas lebar maksimal**: ukuran asli, 1920 px, 1280 px, atau 800 px — gambar yang lebih lebar otomatis dikecilkan proporsional.
- **Kartu hasil per gambar**: thumbnail, ukuran file asli, ukuran hasil, persentase hematnya, dan tombol Download.
- **Download Semua**: mengunduh semua hasil satu per satu tanpa perlu file ZIP.
- **Proses ulang otomatis** setiap kali pengaturan diubah, jadi bisa langsung lihat bedanya.
- **100% lokal** — file kamu gak di-upload ke server mana pun. Aman buat foto pribadi dan dokumen.

Catatan kecil: gambar PNG transparan yang dikonversi ke JPG akan diberi latar putih, karena JPG memang gak mendukung transparansi.

## Cara Menjalankan

Gak perlu build, gak perlu install apa pun. Cukup buka `index.html` di browser:

- Klik dua kali file `index.html`, atau
- Jalankan server lokal sederhana dari folder ini, misalnya:

```bash
npx serve .
# atau
python3 -m http.server 8000
```

Lalu buka alamat yang ditampilkan (biasanya `http://localhost:8000`).

## Teknologi

- HTML, CSS, dan JavaScript murni — tanpa framework, tanpa library eksternal.
- **Canvas API** (`canvas.toBlob`) buat mengompres dan mengonversi gambar.
- **Object URL** buat pratinjau dan unduhan hasil.
- Font Space Grotesk, Space Mono, dan Caveat dari Google Fonts.

---

Dibuat oleh **Remike Dev** — bagian dari seri tools kecil yang jalan sepenuhnya di browser.
