# Event Platform PRD

> Platform penemuan event dan pendaftaran peserta untuk **trail run**, dengan alur verifikasi kualifikasi oleh penyelenggara.
> Status dokumen: Draft v0.1 (hasil brainstorming awal)

---

## 01. Product Overview

**Nama sementara:** Event Platform (nama final menyusul)

**Ringkasan.** Platform web yang menyatukan informasi event trail run di satu tempat (discovery) dan menyediakan sistem pendaftaran, verifikasi kualifikasi, pembayaran, tiket digital, serta check-in racepack bagi penyelenggara yang ingin memakainya (ticketing).

**Fokus niche.** Event trail run di Indonesia. Platform tidak melayani musik, festival, atau jenis event lain pada tahap awal.

**Dua jenis event di platform:**

| Jenis | Deskripsi |
|---|---|
| Event eksternal | Hanya ditampilkan sebagai kalender. Tombol "Daftar" mengarah ke website penyelenggara. Diinput dan dikurasi oleh admin platform. |
| Event native | Dibuat oleh organizer di platform. Pendaftaran, verifikasi, pembayaran, dan tiket berjalan di platform. |

**Tiga pihak utama:** Peserta (attendee), Penyelenggara (organizer), Admin platform.

**Strategi bertahap:**
1. Kalender event trail run (membangun audiens).
2. Monetisasi ringan (promosi/featured event, referral).
3. Ticketing native untuk organizer pilot.

> Dokumen ini membahas cakupan sampai ticketing native (MVP), dengan discovery sebagai fondasi.

---

## 02. Problem Statement

**Masalah peserta**
- Informasi event trail run tersebar di Instagram, grup WhatsApp, dan website masing-masing penyelenggara. Peserta yang tidak tahu ada event sering ketinggalan.
- Pendaftaran event berkualifikasi tidak seragam: syarat, dokumen, dan alurnya berbeda di tiap event.
- Peserta tidak tahu status pendaftarannya (sudah diverifikasi atau belum, kapan harus bayar).

**Masalah penyelenggara**
- Pendaftaran masih manual (formulir online + transfer + cek bukti bayar satu per satu), rawan salah dan melelahkan.
- Verifikasi kualifikasi peserta dilakukan manual lewat chat atau spreadsheet.
- Data peserta (ukuran jersey, kontak darurat, kategori, BIB) berantakan.
- Pengambilan racepack tidak terstruktur.
- Arus kas: butuh dana sebelum event untuk membayar vendor, sementara dana tiket sering baru bisa digunakan belakangan.
- Jangkauan promosi terbatas pada audiens mereka sendiri.

**Peluang.** Satu tempat untuk menemukan event trail run, ditambah sistem pendaftaran yang memahami kebutuhan khusus trail run (kategori jarak, kualifikasi, BIB, racepack).

---

## 03. Business Model

**Pemasukan (urut prioritas implementasi)**

| Tahap | Sumber | Keterangan |
|---|---|---|
| 1 | Promosi berbayar | Featured event, posisi atas, newsletter/notifikasi |
| 2 | Referral | Komisi atau biaya per pendaftar yang datang dari platform |
| 3 | Fee ticketing | Fee per peserta (persentase atau flat) dari event native |
| 4 | Add-on dan sponsor | Penginapan, transport, asuransi, iklan brand pelari |

**Catatan biaya**
- Besaran fee: **TBD**, ditentukan setelah riset kompetitor dan wawancara organizer.
- Pertimbangkan biaya payment gateway (dan apakah fee gateway dikembalikan saat refund) dalam menentukan fee platform.
- Siapa yang menanggung fee (organizer atau peserta) ditentukan per kebijakan platform, **TBD**.

**Pencairan dana ke organizer.** Bertahap (lihat bagian 15).

---

## 04. Target Users

| Segmen | Deskripsi | Kebutuhan utama |
|---|---|---|
| Pelari trail | Pelari pemula sampai berpengalaman yang rutin ikut event | Menemukan event, daftar mudah, status jelas |
| Pelari trail berkualifikasi | Mengikuti event dengan syarat finisher/poin/surat sehat | Unggah dokumen sekali, ajukan ke banyak event |
| Organizer komunitas | Komunitas lari, tim kecil 3-10 orang | Pendaftaran rapi, verifikasi mudah, tanpa biaya awal besar |
| EO profesional | Penyelenggara event berskala besar | Dashboard, kuota per kategori, pencairan dana bertahap |
| Admin platform | Tim internal | Kurasi, verifikasi organizer, keuangan, sengketa |

**Geografi awal:** Indonesia (kota/provinsi awal ditentukan saat peluncuran).

---

## 05. User Roles

Terdapat **tiga tipe akun** dengan registrasi terpisah.

| Role | Registrasi | Deskripsi |
|---|---|---|
| Attendee (Peserta) | Registrasi mandiri (email/Google/nomor HP) | Mencari event, mendaftar, membayar, menerima tiket |
| Organizer | Registrasi organisasi oleh admin atau perwakilan resmi penyelenggara, diverifikasi admin platform | Membuat event, memverifikasi peserta, mengelola racepack |
| Admin Platform | Dibuat internal, bukan registrasi publik | Verifikasi organizer, kurasi, keuangan, sengketa |

**Peran dalam organisasi organizer**

| Peran | Hak |
|---|---|
| Owner | Semua akses, kelola tim, rekening pencairan |
| Staf verifikasi | Meninjau pendaftaran dan kualifikasi |
| Staf racepack | Check-in racepack saat hari-H |
| Staf keuangan (opsional) | Melihat rekap dan saldo |

**Peran admin platform:** Super Admin, Support, Finance.

**Catatan.** Email yang sama boleh dipakai untuk akun peserta dan akun organizer. Login memilih konteks ("masuk sebagai peserta" atau "masuk sebagai organizer").

---

## 06. Core User Journeys

### 6.1 Peserta: event berkualifikasi (verifikasi dulu, bayar kemudian)
1. Buka platform, cari event (filter kota, jarak, bulan).
2. Lihat detail event dan syarat kualifikasi.
3. Login/registrasi.
4. Pilih kategori, isi form, unggah dokumen kualifikasi.
5. Konfirmasi data ("setelah lunas tidak bisa diubah"), kirim pendaftaran. Status: **Menunggu verifikasi**.
6. Penyelenggara meninjau. Hasil: **Disetujui** atau **Ditolak** (dengan alasan; dapat mengajukan ulang bila diizinkan).
7. Jika disetujui: status **Menunggu pembayaran** dengan batas waktu.
8. Bayar. Status: **Lunas**. Data terkunci, tiket QR dan BIB terbit.
9. Ambil racepack dengan QR, ikut event.

### 6.2 Peserta: event terbuka (tanpa kualifikasi)
1-4 sama dengan 6.1. Setelah konfirmasi data, langsung ke **Menunggu pembayaran**, lalu **Lunas**.

### 6.3 Peserta: event eksternal
Lihat detail event, klik "Daftar", diarahkan ke website penyelenggara.

### 6.4 Organizer: onboarding dan membuat event
1. Registrasi organisasi (data organisasi, perwakilan, dokumen, rekening).
2. Admin platform memverifikasi. Status: **Terverifikasi**.
3. Membuat event: detail, kategori, kuota, harga, syarat kualifikasi, form data peserta, kebijakan refund.
4. Kirim untuk review admin. Setelah disetujui, event tayang.
5. Memverifikasi pendaftar, memantau dashboard.
6. Hari-H: check-in racepack. Setelah event: pencairan tahap akhir.

### 6.5 Admin: kurasi dan keuangan
Verifikasi organizer, review event, input event eksternal, setujui pencairan per tahap, tangani refund dan sengketa.

---

## 07. MVP Scope

### Termasuk (In Scope)

| Area | Fitur |
|---|---|
| Discovery | Daftar event + filter + detail event; event eksternal dan native |
| Auth | Registrasi/login peserta; registrasi organisasi organizer; login admin |
| Organizer | Profil organisasi, tim, buat event, kategori, kuota, syarat kualifikasi, form peserta |
| Pendaftaran | Alur verifikasi-dulu-bayar-kemudian dan alur terbuka, status, batas waktu, waitlist, alasan penolakan |
| Pembayaran | Payment gateway, refund sesuai kebijakan organizer |
| Pasca-lunas | Data terkunci, BIB otomatis, tiket QR, check-in racepack (mode offline) |
| Dashboard organizer | Rekap pendaftar, status, jersey, export CSV, saldo |
| Komunikasi | Notifikasi status (email), blast info ke peserta |
| Admin | Verifikasi organizer, kurasi event, input event eksternal, keuangan, pencairan manual, refund, log audit |

### Tidak termasuk (Out of Scope MVP)
- Transfer slot / ganti nama peserta
- Pindah kategori setelah lunas
- Edit data peserta setelah lunas (termasuk ukuran jersey)
- Marketplace jual-beli slot
- Profil pelari lengkap, badge finisher, statistik tahunan
- Wishlist dan rekomendasi pintar
- Add-on (penginapan, transport, asuransi) dan iklan sponsor
- Pencairan dana otomatis
- Aplikasi mobile native
- Event selain trail run

---

## 08. Feature Requirements

Prioritas: **P0** wajib MVP, **P1** sebaiknya MVP, **P2** pasca-MVP.

| ID | Fitur | Prioritas |
|---|---|---|
| F-01 | Daftar event dengan filter (kota/provinsi, bulan, jarak, elevasi/kesulitan, rentang harga, status pendaftaran) | P0 |
| F-02 | Halaman detail event (rute/elevasi, kategori, kuota, harga, syarat, mandatory gear, cut-off, kebijakan refund) | P0 |
| F-03 | Event eksternal dengan tautan ke penyelenggara | P0 |
| F-04 | Registrasi/login peserta | P0 |
| F-05 | Registrasi organisasi organizer + verifikasi admin | P0 |
| F-06 | Manajemen tim organizer (undang staf, role) | P1 |
| F-07 | Pembuatan event, kategori, kuota, harga | P0 |
| F-08 | Konfigurasi syarat kualifikasi per kategori | P0 |
| F-09 | Form data peserta yang dapat dikonfigurasi | P0 |
| F-10 | Pendaftaran peserta dengan halaman konfirmasi | P0 |
| F-11 | Verifikasi pendaftaran oleh organizer (setujui/tolak + alasan) | P0 |
| F-12 | Batas waktu verifikasi dan pembayaran, pelepasan slot otomatis | P0 |
| F-13 | Waitlist | P1 |
| F-14 | Pembayaran via payment gateway | P0 |
| F-15 | Refund sesuai kebijakan organizer | P0 |
| F-16 | Penguncian data setelah lunas | P0 |
| F-17 | Penomoran BIB otomatis per kategori | P0 |
| F-18 | Tiket digital QR | P0 |
| F-19 | Check-in racepack (termasuk diwakilkan) dengan mode offline | P0 |
| F-20 | Dashboard organizer + export CSV | P0 |
| F-21 | Notifikasi status (email) | P0 |
| F-22 | Notifikasi WhatsApp | P2 |
| F-23 | Blast info ke peserta | P1 |
| F-24 | Kurasi event oleh admin sebelum tayang | P0 |
| F-25 | Input event eksternal oleh admin | P0 |
| F-26 | Pencairan dana bertahap (manual oleh admin) | P0 |
| F-27 | Penanganan sengketa dan laporan | P1 |
| F-28 | Dashboard analytics admin | P1 |
| F-29 | Log audit tindakan penting | P0 |
| F-30 | Featured event (promosi berbayar) | P2 |
| F-31 | Wishlist dan pengingat pembukaan pendaftaran | P2 |
| F-32 | Profil pelari dan riwayat race | P2 |

---

## 09. Business Rules

**Registrasi dan akun**
- BR-01: Peserta dan organizer memiliki registrasi terpisah. Email boleh sama di kedua jenis akun.
- BR-02: Organizer baru hanya dapat membuat event setelah organisasinya **terverifikasi** oleh admin platform.
- BR-03: Akun yang mendaftarkan organisasi otomatis menjadi Owner.
- BR-04: Perubahan rekening pencairan wajib verifikasi ulang oleh admin.
- BR-05: Anggota organisasi organizer tidak boleh mendaftar sebagai peserta pada event milik organisasinya sendiri, kecuali ditentukan lain oleh kebijakan platform.

**Event**
- BR-06: Setiap event native harus lolos review admin sebelum tayang.
- BR-07: Setiap kategori memiliki kuota, harga, dan batas waktu sendiri.
- BR-08: Syarat kualifikasi ditentukan organizer per kategori. Platform hanya menyediakan alat.
- BR-09: Event eksternal tidak memiliki alur pendaftaran, pembayaran, dan pencairan di platform.

**Pendaftaran dan verifikasi**
- BR-10: Organizer (bukan admin platform) yang memverifikasi kualifikasi peserta. Admin platform hanya menjadi penengah sengketa.
- BR-11: Untuk event/kategori berkualifikasi, alur wajib **verifikasi dulu, bayar kemudian**.
- BR-12: Untuk event/kategori tanpa kualifikasi, peserta langsung ke pembayaran setelah konfirmasi data.
- BR-13: Setelah disetujui, peserta memiliki batas waktu pembayaran. Bila lewat, status menjadi **Kedaluwarsa** dan slot dilepas.
- BR-14: Pendaftaran yang menunggu verifikasi dibatasi waktu verifikasi maksimum. Bila organizer tidak merespons, sistem mengirim pengingat ke organizer dan eskalasi ke admin.
- BR-15: Slot dihitung terisi saat status **Disetujui/Menunggu pembayaran** (untuk event berkualifikasi) dan **Lunas**. Slot yang gugur dialihkan ke waitlist berurutan.
- BR-16: Pendaftar yang ditolak boleh mengajukan ulang sesuai aturan organizer (default: boleh, dengan dokumen baru).

**Setelah lunas**
- BR-17: Data peserta **terkunci** setelah lunas (termasuk ukuran jersey).
- BR-18: **Tidak ada** transfer slot, ganti nama, atau pindah kategori. Koreksi data karena kesalahan hanya melalui organizer.
- BR-19: BIB diterbitkan otomatis setelah lunas dengan aturan penomoran per kategori.
- BR-20: Tiket QR terikat pada satu peserta. Pengambilan racepack oleh perwakilan memerlukan kode/surat kuasa sesuai aturan organizer.

**Refund**
- BR-21: Kebijakan refund diatur organizer per event, wajib tampil jelas sebelum peserta membayar.
- BR-22: Penolakan pada tahap verifikasi tidak melibatkan refund karena pembayaran belum terjadi (untuk alur verifikasi-dulu).
- BR-23: Jika event dibatalkan oleh organizer atau force majeure, refund mengikuti kebijakan yang disepakati dalam perjanjian organizer.

**Pencairan dana**
- BR-24: Dana dicairkan bertahap (lihat bagian 15). Sebagian ditahan sampai event selesai dan tidak ada sengketa terbuka.
- BR-25: Pencairan awal dibatasi persentase dari **dana yang sudah terkumpul**, bukan target.

---

## 10. Functional Requirements

### 10.1 Autentikasi dan Akun
- FR-001: Sistem menyediakan registrasi peserta dengan email/password, Google, atau nomor HP.
- FR-002: Sistem menyediakan registrasi organisasi organizer dengan data organisasi, perwakilan, dokumen legalitas, dan rekening.
- FR-003: Sistem memisahkan token/sesi berdasarkan `account_type` (attendee, organizer, admin) dan role.
- FR-004: Sistem mendukung pengundangan anggota tim organizer melalui email.
- FR-005: Sistem mendukung reset password dan verifikasi email.

### 10.2 Discovery
- FR-010: Sistem menampilkan daftar event dengan filter dan sorting.
- FR-011: Sistem membedakan event eksternal dan event native dengan label jelas.
- FR-012: Detail event menampilkan seluruh informasi pada F-02.

### 10.3 Event
- FR-020: Organizer terverifikasi dapat membuat event, kategori, kuota, harga, dan batas waktu.
- FR-021: Organizer dapat mengatur syarat kualifikasi per kategori (unggah sertifikat, tautan hasil/profil, surat sehat, isian bebas).
- FR-022: Organizer dapat menyusun form data peserta (ukuran jersey, kontak darurat, dan sebagainya) dan menandai kolom sensitif.
- FR-023: Event berstatus draft, review, tayang, ditutup, dibatalkan, selesai.

### 10.4 Pendaftaran dan Verifikasi
- FR-030: Peserta memilih kategori, mengisi form, mengunggah dokumen kualifikasi, dan melihat halaman konfirmasi sebelum kirim/bayar.
- FR-031: Sistem mencatat status pendaftaran dan seluruh perubahannya (log).
- FR-032: Organizer dapat menyetujui atau menolak pendaftaran, menolak wajib menyertakan alasan.
- FR-033: Sistem menerbitkan batas waktu pembayaran saat pendaftaran disetujui.
- FR-034: Sistem otomatis mengubah status menjadi Kedaluwarsa saat batas waktu lewat dan menawarkan slot ke waitlist.
- FR-035: Sistem menampilkan posisi waitlist ke peserta.
- FR-036: Sistem mengirim notifikasi di setiap perubahan status.

### 10.5 Pembayaran
- FR-040: Sistem membuat tagihan melalui payment gateway dengan batas waktu.
- FR-041: Sistem memperbarui status berdasarkan notifikasi (webhook) gateway dan memverifikasi tanda tangannya.
- FR-042: Sistem memproses refund melalui gateway dan mencatat statusnya.

### 10.6 Pasca-Lunas
- FR-050: Sistem mengunci data peserta saat status Lunas.
- FR-051: Sistem menerbitkan BIB sesuai aturan per kategori dan tiket QR unik.
- FR-052: Aplikasi check-in racepack memindai QR, menandai pengambilan, dan mendukung perwakilan.
- FR-053: Check-in tetap berfungsi tanpa koneksi dan menyinkronkan data saat tersambung.

### 10.7 Dashboard dan Komunikasi
- FR-060: Dashboard organizer menampilkan pendaftar per kategori vs kuota, status pembayaran, rekap jersey, dan saldo (terkumpul, cair, ditahan, estimasi).
- FR-061: Organizer dapat mengekspor data peserta ke CSV/Excel.
- FR-062: Organizer dapat mengirim pengumuman ke peserta event tertentu.

### 10.8 Pencairan dan Keuangan
- FR-070: Admin Finance melihat rekap transaksi per event dan perhitungan fee.
- FR-071: Admin Finance menyetujui pencairan per tahap setelah syarat terpenuhi.
- FR-072: Sistem mencatat seluruh pencairan beserta pelaku dan waktunya.

---

## 11. Non-Functional Requirements

| Kategori | Persyaratan |
|---|---|
| Performa | Halaman daftar/detail event dimuat < 3 detik pada koneksi 4G umum. Pendaftaran dibuka serentak harus tetap berfungsi (target kapasitas ditentukan setelah estimasi peserta event terbesar). |
| Skalabilitas | Siap menangani lonjakan trafik saat pendaftaran event populer dibuka (antrean/rate limiting, pembacaan kuota yang konsisten). |
| Ketersediaan | Target uptime ditentukan (TBD), terutama saat jendela pendaftaran dan hari-H. |
| Konsistensi data | Kuota tidak boleh terlampaui (tidak ada overselling) walau banyak pendaftar bersamaan. |
| Offline | Check-in racepack berfungsi tanpa sinyal dan menyinkronkan kemudian. |
| Kompatibilitas | Web responsif (mobile-first), peramban modern. |
| Aksesibilitas | Kontras dan ukuran teks wajar, formulir dapat dipakai dengan keyboard. |
| Bahasa | Bahasa Indonesia utama, Bahasa Inggris menyusul. |
| Observabilitas | Logging, pemantauan error, dan peringatan untuk kegagalan pembayaran/webhook. |
| Cadangan | Backup basis data berkala dan prosedur pemulihan. |
| Kepatuhan | Pengelolaan data pribadi sesuai UU PDP. Aspek hukum, pajak, dan perizinan pembayaran dikonsultasikan ke ahli. |

---

## 12. Admin Requirements

- **AR-01 Verifikasi organizer:** meninjau identitas, dokumen, rekening, dan rekam jejak event. Status: pending, terverifikasi, ditolak (dengan alasan).
- **AR-02 Kurasi event:** meninjau event sebelum tayang, menurunkan event bermasalah.
- **AR-03 Event eksternal:** menginput, mengedit, dan menghapus event eksternal untuk kalender discovery.
- **AR-04 Keuangan:** melihat rekap transaksi, fee, saldo organizer; menyetujui pencairan per tahap; memproses refund; rekonsiliasi dengan payment gateway.
- **AR-05 Sengketa:** menerima laporan/komplain, memediasi peserta dan organizer, mencatat keputusan.
- **AR-06 Manajemen akun:** menangguhkan atau memblokir akun/organisasi yang melanggar.
- **AR-07 Role admin:** Super Admin, Support, Finance dengan hak berbeda.
- **AR-08 Log audit:** seluruh tindakan admin tercatat (siapa, apa, kapan, sebelum/sesudah).
- **AR-09 Dashboard:** jumlah event, pendaftar, transaksi, pendapatan, pertumbuhan pengguna (P1).

---

## 13. Organizer Requirements

- **OR-01 Onboarding:** registrasi organisasi, unggah dokumen, tunggu verifikasi admin.
- **OR-02 Profil organisasi:** informasi publik, kontak, rekening (perubahan rekening butuh verifikasi ulang).
- **OR-03 Tim:** undang anggota, tetapkan role (Owner, staf verifikasi, staf racepack, keuangan).
- **OR-04 Event:** buat/edit event, kategori, kuota, harga, jadwal pendaftaran, rute/elevasi, mandatory gear, kebijakan refund.
- **OR-05 Kualifikasi dan form:** atur syarat dan kolom form per kategori.
- **OR-06 Verifikasi pendaftaran:** antrean pendaftar, lihat dokumen, setujui/tolak dengan alasan.
- **OR-07 Peserta:** daftar peserta, status, export CSV, rekap jersey.
- **OR-08 Hari-H:** check-in racepack dengan QR, perwakilan, mode offline.
- **OR-09 Keuangan:** dashboard saldo, status pencairan tiap tahap, riwayat refund.
- **OR-10 Komunikasi:** kirim pengumuman ke peserta.
- **OR-11 Perjanjian:** menyetujui syarat dan ketentuan organizer, termasuk kewajiban pengembalian dana bila event batal.

---

## 14. Attendee Requirements

- **ATR-01 Akun:** registrasi/login, pengisian data dasar (nama, tanggal lahir, kontak darurat) sebagai pengisi otomatis form.
- **ATR-02 Discovery:** cari dan filter event, lihat detail.
- **ATR-03 Pendaftaran:** pilih kategori, isi form, unggah dokumen, konfirmasi data.
- **ATR-04 Pemantauan status:** menunggu verifikasi, disetujui, menunggu pembayaran (hitung mundur), lunas, ditolak, kedaluwarsa, waitlist.
- **ATR-05 Pembayaran:** beberapa metode pembayaran via gateway.
- **ATR-06 Tiket:** tiket digital dengan QR, nomor BIB, info racepack.
- **ATR-07 Notifikasi:** pemberitahuan setiap perubahan status dan pengumuman event.
- **ATR-08 Kebijakan:** melihat kebijakan refund dan syarat sebelum membayar.
- **ATR-09 Pengajuan ulang:** mengajukan ulang pendaftaran yang ditolak bila diizinkan.

---

## 15. Payment & Refund

### 15.1 Pembayaran
- Gunakan payment gateway berizin (virtual account, e-wallet, QRIS, kartu, sesuai ketersediaan).
- Tagihan memiliki masa berlaku (default: TBD, disarankan 24 jam setelah disetujui untuk event berkualifikasi).
- Status pembayaran: `pending`, `paid`, `expired`, `failed`, `refunded`, `partially_refunded`.
- Status diperbarui via webhook yang diverifikasi dan idempoten (webhook ganda tidak menggandakan efek).
- Pertimbangkan gateway dengan fitur split/escrow agar platform tidak memegang dana langsung (konsultasi hukum).

### 15.2 Alur
- **Event berkualifikasi:** verifikasi dulu, bayar kemudian. Penolakan tidak melibatkan refund (belum ada pembayaran).
- **Event terbuka:** konfirmasi data lalu bayar.

### 15.3 Refund
- Kebijakan refund diatur organizer per event. Contoh bentuk: tidak ada refund, refund sebagian sebelum tanggal tertentu, refund penuh bila event dibatalkan.
- Kebijakan ditampilkan jelas sebelum peserta membayar, dan menjadi bagian yang disepakati saat membayar (versi kebijakan disimpan bersama transaksi).
- Pemrosesan refund dicatat (alasan, nominal, status, waktu). Estimasi waktu pengembalian ditampilkan ke peserta.
- Penanggung biaya fee gateway saat refund ditentukan kebijakan platform (**TBD**).
- Event dibatalkan: seluruh peserta lunas mendapat refund sesuai perjanjian organizer.

### 15.4 Pencairan Dana Bertahap

Angka hanya ilustrasi, ditentukan setelah riset dan diskusi dengan organizer.

| Tahap | Waktu | Porsi | Syarat |
|---|---|---|---|
| 1 | Setelah pendaftaran berjalan / mendekati event | Sebagian kecil | Organizer terverifikasi penuh; dokumen pendukung (izin lokasi, kontrak vendor) |
| 2 | Beberapa hari sebelum event | Sebagian besar | Racepack siap; data peserta lengkap |
| 3 | Setelah event selesai | Sisa | Tidak ada komplain besar/sengketa terbuka |

- Persentase tahap awal dapat dibedakan berdasarkan rekam jejak organizer (organizer baru: lebih kecil).
- Pencairan awal dibatasi persentase dari dana terkumpul.
- Bagian yang ditahan berfungsi sebagai jaminan refund dan komplain.
- Di MVP, setiap pencairan disetujui manual oleh admin Finance dan tercatat dalam log audit.
- Perjanjian organizer mewajibkan pengembalian dana peserta bila event batal setelah dana cair.

---

## 16. Security

| Area | Persyaratan |
|---|---|
| Autentikasi | Password di-hash (bcrypt/argon2), rate limiting login, 2FA untuk akun organizer dan admin (disarankan wajib untuk Owner dan admin). |
| Otorisasi | Kontrol akses berbasis role dan **kepemilikan** di backend untuk setiap endpoint (bukan hanya menyembunyikan menu). |
| Pemisahan konteks | Token memuat `account_type` dan role; akun peserta tidak dapat mengakses endpoint organizer/admin. |
| Data sensitif | Data medis/kontak darurat dibatasi aksesnya (hanya organizer berwenang/tim medis) dan dienkripsi saat disimpan. |
| Dokumen | Dokumen kualifikasi dan legalitas disimpan privat (URL bertanda tangan berumur pendek). |
| Rekening | Perubahan rekening pencairan butuh verifikasi ulang; nomor rekening disimpan terenkripsi dan ditampilkan sebagian (masked). |
| Pembayaran | Verifikasi tanda tangan webhook, idempotensi, tidak menyimpan data kartu di sistem sendiri. |
| Anti-penipuan | Verifikasi organizer, kurasi event sebelum tayang, tiket QR unik terikat peserta, deteksi pendaftaran berulang/bot (CAPTCHA, rate limit). |
| Privasi | Kepatuhan UU PDP: persetujuan pengumpulan data, kebijakan privasi, hak akses/hapus data, retensi data. |
| Transport | HTTPS wajib, header keamanan standar, perlindungan CSRF/XSS/SQL injection. |
| Audit | Log audit tindakan admin dan organizer yang berdampak (persetujuan, penolakan, pencairan, refund, perubahan rekening). |
| Cadangan | Backup terenkripsi dan uji pemulihan berkala. |

---

## 17. Edge Cases

| # | Kasus | Penanganan |
|---|---|---|
| 1 | Dua peserta menyelesaikan pembayaran untuk slot terakhir bersamaan | Kuota dikunci secara atomik saat tagihan dibuat; peserta yang tidak mendapat slot dialihkan ke waitlist atau di-refund otomatis. |
| 2 | Peserta bayar setelah tagihan kedaluwarsa | Webhook diterima setelah expired: pembayaran direkonsiliasi, bila slot masih ada pendaftaran dipulihkan, bila tidak refund otomatis. |
| 3 | Webhook gateway terkirim ganda atau terlambat | Pemrosesan idempoten; status hanya maju sesuai state machine. |
| 4 | Organizer tidak merespons verifikasi | Pengingat ke organizer, eskalasi ke admin, dan notifikasi status ke peserta. |
| 5 | Pendaftaran ditolak lalu diajukan ulang | Diizinkan sesuai aturan; riwayat penolakan tetap tercatat. |
| 6 | Peserta salah ketik data (nama/jersey) setelah lunas | Tidak ada edit mandiri; koreksi melalui organizer dengan catatan di log audit. |
| 7 | Peserta berhalangan hadir | Mengikuti kebijakan refund event; tidak ada transfer slot. |
| 8 | Event dibatalkan (cuaca/force majeure/izin) | Status event diubah, seluruh peserta lunas di-refund sesuai perjanjian, pencairan tertahan, notifikasi massal. |
| 9 | Event dibatalkan setelah dana tahap awal cair | Organizer wajib mengembalikan dana; ditutup dari dana ditahan; sengketa dibuka bila organizer tidak kooperatif. |
| 10 | Kuota diubah organizer setelah ada pendaftar | Kuota tidak boleh di bawah jumlah slot terisi. |
| 11 | Kategori/harga diubah setelah ada pendaftar | Pendaftar lama mengikuti harga saat mereka mendaftar. |
| 12 | Syarat kualifikasi berubah di tengah pendaftaran | Pendaftar yang sudah disetujui tidak terpengaruh; perubahan berlaku untuk pendaftar baru. |
| 13 | Satu orang mendaftar dua kategori di event yang sama | Dilarang (satu peserta satu kategori per event) kecuali diatur lain. |
| 14 | Satu orang mendaftar dengan dua akun | Deteksi duplikasi berdasarkan identitas/dokumen; organizer dapat menolak. |
| 15 | Peserta tidak punya sinyal saat check-in (hari-H) | Mode offline dengan daftar peserta terunduh; sinkronisasi nanti. |
| 16 | QR dipindai dua kali | Sistem menolak dan menunjukkan waktu/petugas check-in sebelumnya. |
| 17 | Racepack diambil perwakilan | Diizinkan dengan kode atau surat kuasa sesuai aturan organizer; perwakilan dicatat. |
| 18 | Organizer berhenti/pergantian owner | Alur pemindahan kepemilikan dengan verifikasi; rekening berubah butuh verifikasi ulang. |
| 19 | Organizer ditangguhkan saat ada event berjalan | Event dibekukan, dana tertahan, admin menindaklanjuti ke peserta. |
| 20 | Event eksternal berubah/dibatalkan di sumbernya | Admin memperbarui; tampilkan tanggal pembaruan terakhir. |
| 21 | Lonjakan trafik saat pendaftaran dibuka | Antrean/rate limit, halaman status jelas, kuota konsisten. |
| 22 | Peserta di bawah usia minimum kategori | Validasi usia dari tanggal lahir; ditolak otomatis atau ditandai untuk review. |
| 23 | Refund gagal di gateway | Status `refund_failed`, notifikasi admin Finance, percobaan ulang manual. |

---

## 18. Acceptance Criteria

Format: Given / When / Then.

**AC-01 Registrasi organizer**
- Given organisasi belum terdaftar, when perwakilan mengisi form lengkap dan mengirim, then organisasi berstatus *pending* dan perwakilan menjadi Owner.
- Given status *pending*, when organizer mencoba membuat event, then sistem menolak dengan pesan "menunggu verifikasi".
- Given admin menyetujui, when organizer membuka dashboard, then menu pembuatan event tersedia.

**AC-02 Pembuatan event**
- Given organizer terverifikasi, when membuat event dengan minimal satu kategori dan kebijakan refund, then event tersimpan sebagai draft dan dapat dikirim untuk review.
- Given event belum disetujui admin, then event tidak tampil di discovery.

**AC-03 Pendaftaran berkualifikasi**
- Given event mensyaratkan kualifikasi, when peserta mengirim pendaftaran lengkap, then status *Menunggu verifikasi* dan tidak ada tagihan dibuat.
- Given organizer menyetujui, then status *Menunggu pembayaran* dan batas waktu pembayaran ditampilkan.
- Given organizer menolak tanpa alasan, then sistem menolak aksi tersebut.
- Given batas waktu pembayaran lewat, then status *Kedaluwarsa* dan slot ditawarkan ke waitlist.

**AC-04 Pendaftaran terbuka**
- Given event tanpa kualifikasi, when peserta mengonfirmasi data, then tagihan dibuat dan status *Menunggu pembayaran*.

**AC-05 Konfirmasi data**
- Given peserta mengisi form, then halaman konfirmasi menampilkan seluruh data dengan peringatan "tidak dapat diubah setelah lunas" sebelum lanjut.

**AC-06 Pembayaran**
- Given webhook pembayaran valid diterima, then status *Lunas*, data terkunci, BIB dan tiket QR terbit, dan notifikasi terkirim.
- Given webhook yang sama diterima dua kali, then tidak ada perubahan ganda.
- Given kuota habis saat pembayaran, then tidak ada overselling.

**AC-07 Penguncian**
- Given status *Lunas*, when peserta mencoba mengubah data, then sistem menolak dan menampilkan jalur koreksi melalui organizer.

**AC-08 Refund**
- Given event dibatalkan, then seluruh peserta lunas masuk antrean refund dan menerima notifikasi.
- Given peserta membatalkan sesuai jendela kebijakan, then nominal refund sesuai aturan kebijakan event.

**AC-09 Check-in racepack**
- Given tiket QR valid dan belum dipakai, when dipindai, then ditandai diambil dengan waktu dan petugas.
- Given QR dipindai ulang, then ditolak dengan info check-in sebelumnya.
- Given perangkat offline, then check-in tetap berhasil dan tersinkron saat tersambung.

**AC-10 Pencairan**
- Given syarat tahap 1 terpenuhi dan admin menyetujui, then pencairan tercatat dengan pelaku dan waktu.
- Given ada sengketa terbuka, then pencairan tahap akhir tidak dapat disetujui.
- Given nominal pencairan melebihi batas persentase dari dana terkumpul, then sistem menolak.

**AC-11 Otorisasi**
- Given akun peserta, when mengakses endpoint organizer atau admin, then ditolak (403).
- Given organizer A, when mengakses data event organizer B, then ditolak.

**AC-12 Discovery**
- Given filter kota dan jarak dipilih, then daftar hanya memuat event yang sesuai.
- Given event eksternal, when peserta klik "Daftar", then diarahkan ke website penyelenggara.

---

## 19. Metrics / KPI

**Akuisisi dan discovery**
- Pengunjung unik bulanan, pengguna terdaftar
- Jumlah event terdaftar (eksternal vs native)
- Rasio klik "Daftar" per kunjungan halaman detail event

**Sisi organizer**
- Jumlah organizer terverifikasi dan aktif
- Waktu rata-rata verifikasi organizer
- Waktu rata-rata verifikasi pendaftaran oleh organizer
- Repeat rate organizer (membuat event kedua)

**Konversi pendaftaran**
- Funnel: lihat event → mulai daftar → kirim → disetujui → bayar → lunas
- Persentase disetujui vs ditolak
- Persentase pembayaran yang kedaluwarsa
- Rasio slot terisi terhadap kuota

**Keuangan**
- GMV (nilai total transaksi) dan pendapatan platform
- Take rate efektif setelah biaya gateway
- Persentase refund terhadap transaksi
- Waktu rata-rata refund selesai

**Operasional**
- Waktu check-in rata-rata per peserta
- Jumlah tiket sengketa dan waktu penyelesaian
- Tingkat keberhasilan webhook pembayaran
- Uptime saat jendela pendaftaran dan hari-H

**Kepuasan**
- NPS peserta dan organizer
- Persentase peserta yang mendaftar event kedua melalui platform

> Target angka ditentukan setelah validasi awal dengan organizer pilot.

---

## 20. Future Roadmap

**Fase 1: Discovery (audiens)**
- Kalender event trail run, filter, newsletter/notifikasi
- Input event eksternal manual oleh admin

**Fase 2: Monetisasi ringan**
- Featured event dan promosi berbayar
- Link referral untuk melacak pendaftar yang berasal dari platform

**Fase 3: Ticketing native (MVP dokumen ini)**
- Pendaftaran, verifikasi, pembayaran, tiket QR, check-in racepack, pencairan bertahap

**Fase 4: Sisi pelari**
- Profil pelari, riwayat race, dokumen kualifikasi yang dapat dipakai ulang
- Wishlist dan pengingat pembukaan pendaftaran
- Rekomendasi sesuai level dan kota
- Badge finisher dan statistik tahunan

**Fase 5: Ekosistem**
- Add-on saat checkout (penginapan, transport, asuransi, jersey ekstra)
- Sponsor dan iklan brand pelari
- Penjadwalan event berulang dan integrasi hasil lomba (timing)
- Notifikasi WhatsApp
- Pencairan dana otomatis
- Pertimbangan fitur transfer slot resmi dengan verifikasi ulang kualifikasi (saat ini sengaja tidak ada)
- Aplikasi mobile

### Asumsi dan Keputusan Terbuka

| Topik | Status |
|---|---|
| Besaran fee platform dan siapa yang menanggung | Belum diputuskan |
| Persentase dan syarat tiap tahap pencairan | Belum diputuskan |
| Penanggung biaya gateway saat refund | Belum diputuskan |
| Masa berlaku tagihan dan batas waktu verifikasi | Belum diputuskan |
| Pemilihan payment gateway (split/escrow) | Belum diputuskan |
| Aspek hukum, pajak, dan perizinan pembayaran | Perlu konsultasi ahli |
| Aturan khusus organizer sebagai peserta di event sendiri | Perlu keputusan |
| Kota/provinsi peluncuran awal | Belum diputuskan |
| Validasi dengan organizer (wawancara 10-20 organizer dan pelari) | Perlu dilakukan |
