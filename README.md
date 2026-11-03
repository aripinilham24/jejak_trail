# Jejak Trail

Platform web untuk **discovery event trail run Indonesia** sekaligus sistem **pendaftaran, verifikasi kualifikasi, pembayaran, tiket QR, check-in racepack, dan pencairan dana** untuk penyelenggara.

Repo ini berisi MVP end-to-end:

- **Frontend** React + TypeScript + Vite
- **Backend** Go + Fiber v3
- **PostgreSQL** (Docker)
- **MinIO** untuk object storage privat (Docker)
- **Mailpit** untuk email development (Docker)

Dokumen produk dan data:

- [`Event-Platform-PRD.md`](./Event-Platform-PRD.md)
- [`Event-Platform-ERD.md`](./Event-Platform-ERD.md)
- Spesifikasi API: [`backend/openapi.yaml`](./backend/openapi.yaml)

---

## Daftar isi

1. [Fitur utama](#fitur-utama)
2. [Arsitektur](#arsitektur)
3. [Akun demo](#akun-demo)
4. [Data demo](#data-demo)
5. [Menjalankan aplikasi](#menjalankan-aplikasi)
6. [Alur demo yang disarankan](#alur-demo-yang-disarankan)
7. [Perintah penting](#perintah-penting)
8. [Struktur repo](#struktur-repo)
9. [Keamanan](#keamanan)
10. [Batasan MVP](#batasan-mvp)

---

## Fitur utama

### Peserta (attendee)

- Cari dan filter event trail run: kota, provinsi, bulan, jarak, difficulty, harga, status pendaftaran.
- Lihat detail event: kategori, kuota, elevasi, cut-off, mandatory gear, syarat kualifikasi, kebijakan refund.
- Registrasi event dengan form dinamis + upload dokumen kualifikasi.
- Pantau status: menunggu verifikasi, disetujui, menunggu pembayaran, lunas, ditolak, waitlist, kedaluwarsa.
- Pembayaran (gateway **mock** untuk MVP) dan tiket QR.
- Notifikasi in-app, dokumen, profil, dan pengajuan sengketa.

### Organizer

- Registrasi organisasi + verifikasi admin.
- Membuat event draft lengkap: kategori, kuota, harga, syarat kualifikasi, form peserta, refund policy.
- Kirim event untuk review admin.
- Verifikasi pendaftar: lihat dokumen, setujui/tolak dengan alasan.
- Daftar peserta + export CSV.
- Broadcast pengumuman ke peserta lunas.
- Check-in racepack dengan QR: scan online, tolak scan ganda, mode offline + sinkronisasi.
- Dashboard & finance: kuota, tren pendaftaran, rekap jersey, saldo, riwayat pencairan.

### Admin platform

- Verifikasi organisasi dan kurasi event.
- Input/kelola event eksternal untuk kalender discovery.
- Finance: transaksi, refund, pencairan bertahap, hold/approve.
- Sengketa: review, resolve, reject.
- Audit log tindakan penting.
- Dashboard platform: GMV, revenue, event, pendaftaran, growth.

---

## Arsitektur

```
Frontend (React/Vite)  ──HTTP /api/v1──►  Backend (Go/Fiber v3)
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                  PostgreSQL 17           MinIO (S3)            Mailpit
                  (data utama)        (dokumen privat)      (email dev)
```

- Autentikasi: JWT access token (15 menit) + refresh token rotasi (cookie httpOnly).
- Otorisasi: `accountType` + role + ownership check per resource.
- Database access: `sqlc` + `pgx/v5`; migrasi `goose`.
- File: upload privat ke MinIO, akses via presigned URL 15 menit.
- Pembayaran: adapter gateway mock + webhook HMAC idempoten.
- Background job: expiry pembayaran berjalan tiap menit di proses API.

---

## Akun demo

Semua akun demo memakai password:

```
Password123!
```

| Peran | Email | Keterangan |
|---|---|---|
| Admin platform | `admin@jejak.local` | Super admin; akses seluruh menu admin |
| Peserta | `pelari@jejak.local` | Sudah punya pendaftaran lunas + tiket di Sundoro Trail Challenge |
| Organizer terverifikasi | `owner@jejaknusantara.local` | Organisasi **Jejak Nusantara Events** |
| Organizer pending | `owner@kalimantanforest.local` | Organisasi **Kalimantan Forest Run**, menunggu verifikasi admin |
| Organizer ditolak | `owner@paputrail.local` | Organisasi **Papua Sky Trail**, contoh status rejected |

Peserta tambahan untuk demo: `pelari01@jejak.local` sampai `pelari32@jejak.local`
(password tetap `Password123!`). Sebagian sudah memiliki pendaftaran demo.

> Akun di atas hanya untuk development. Jangan gunakan password/secret demo di production.

---

## Data demo

Seed (`make seed`) membuat:

- 6 event: native published/draft/pending review + event eksternal.
- 33 user peserta.
- 30 pendaftaran dengan berbagai status (`paid`, `awaiting_payment`, `pending_verification`, `rejected`, `waitlisted`, `expired`, `refunded`, `checked_in`).
- Pembayaran, tiket QR, dan beberapa check-in racepack.
- 3 pendaftar menunggu verifikasi organizer.
- 1 event menunggu review admin (**Rinjani Ultra**).
- 1 organisasi menunggu verifikasi admin (**Kalimantan Forest Run**).
- 1 pencairan tahap 1 berstatus `eligible`.
- 2 sengketa contoh (`open` dan `in_review`).
- Notifikasi contoh untuk peserta utama.

Event utama untuk eksplorasi: **Sundoro Trail Challenge** (Wonosobo) dengan kategori 21K, 42K, dan 100K.

---

## Menjalankan aplikasi

### Prasyarat

- Go **1.25+** (disarankan 1.27.3)
- Node.js 20+
- Docker + Docker Compose

### 1. Backend

```bash
cd backend
cp .env.example .env

make up            # Postgres + MinIO + Mailpit
make migrate-up    # migrasi database
make seed          # data demo
make run           # API di http://localhost:8080
```

Cek kesehatan:

```bash
curl http://localhost:8080/health/live
curl http://localhost:8080/health/ready
```

### 2. Frontend

Di terminal lain:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Vite sudah mem-proxy `/api` ke `http://localhost:8080`.

### Layanan development

| Layanan | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8080 |
| MinIO Console | http://localhost:9001 (`minioadmin` / `minioadmin`) |
| Mailpit (email) | http://localhost:8025 |

### Reset data

```bash
cd backend
make reset         # hapus volume DB, migrate ulang, seed ulang
```

---

## Alur demo yang disarankan

### A. Peserta mendaftar event terbuka

1. Login sebagai `pelari@jejak.local`.
2. Buka **Events** → pilih **Bromo Tengger Trail** → daftar kategori 30K.
3. Isi form, konfirmasi, kirim.
4. Status langsung **Menunggu pembayaran**.
5. Buka detail pendaftaran → **Lanjut ke pembayaran** → **Simulasikan pembayaran berhasil**.
6. BIB dan tiket QR terbit; buka menu **Tiket digital**.

### B. Peserta mendaftar event berkualifikasi

1. Buat akun peserta baru (atau gunakan akun yang belum terdaftar di Sundoro).
2. Daftar **Sundoro Trail Challenge** kategori 42K/100K.
3. Upload/isi syarat kualifikasi → status **Menunggu verifikasi**.
4. Login organizer `owner@jejaknusantara.local` → **Registration reviews**.
5. Setujui pendaftaran → peserta masuk **Menunggu pembayaran**.
6. Peserta menyelesaikan pembayaran mock → tiket terbit.

### C. Organizer membuat event

1. Login `owner@jejaknusantara.local`.
2. **Events** → **Buat event** → isi kategori, syarat, form, refund policy.
3. **Simpan draft** → buka detail → **Kirim review**.
4. Login admin `admin@jejak.local` → **Event curation** → **Setujui**.
5. Event tampil di halaman publik `/events`.

### D. Admin memverifikasi organisasi

1. Login admin.
2. **Organization verification** → **Kalimantan Forest Run**.
3. **Verifikasi** atau **Tolak** dengan alasan.

### E. Check-in racepack

1. Login organizer → **Racepack check-in**.
2. Pilih event **Sundoro Trail Challenge**.
3. Unduh manifest (JSON), scan/tempel QR tiket.
4. Coba scan QR yang sama dua kali → ditolak dengan info scan sebelumnya.
5. Aktifkan **Mode offline**, scan QR lain, lalu **Sinkronkan**.

### F. Finance, refund, sengketa, audit

1. Login admin → **Finance**: lihat GMV, revenue, refund, dana ditahan, pencairan eligible.
2. Setujui pencairan tahap 1.
3. **Refunds**: masukkan Registration ID peserta lunas untuk memproses refund.
4. **Disputes**: tinjau/selesaikan sengketa contoh.
5. **Audit log**: lihat jejak tindakan admin.

---

## Perintah penting

### Backend

```bash
make help
make up              # nyalakan infra Docker
make down            # matikan container (data tetap)
make reset           # reset DB + migrate + seed
make migrate-up
make migrate-status
make seed
make run
make test
make test-integration
make sqlc            # generate ulang kode sqlc
make lint
make build
make backup          # dump database ke backups/
make restore file=backups/xxx.sql
make docker-build    # build image API
make docker-up       # API + infra via Docker profile "app"
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

### Docker

```bash
cd backend

make docker-build
make docker-up
```

Untuk production, set minimal:

```env
APP_ENV=production
COOKIE_SECURE=true
TRUST_PROXY=true
JWT_ACCESS_SECRET=<secret kuat>
ENCRYPTION_KEY=<base64 32 byte>
```

Jalankan migrasi sebelum API production:

```bash
make migrate-up
```

---

## Struktur repo

```
.
├── backend/
│   ├── cmd/
│   │   ├── api/          # entry point HTTP
│   │   ├── migrate/      # runner goose
│   │   └── seed/         # data development
│   ├── internal/
│   │   ├── auth/
│   │   ├── registration/
│   │   ├── payment/
│   │   ├── checkin/
│   │   ├── event/
│   │   ├── finance/
│   │   ├── dispute/
│   │   ├── analytics/
│   │   ├── notification/
│   │   ├── broadcast/
│   │   ├── storage/
│   │   └── platform/
│   ├── db/queries/       # query sqlc
│   ├── internal/db/migrations/
│   ├── openapi.yaml
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── Makefile
├── frontend/
│   └── src/
│       ├── pages/        # public, auth, account, organizer, admin
│       ├── components/
│       └── lib/          # api client, auth context, i18n, mock fallback
├── Event-Platform-PRD.md
└── Event-Platform-ERD.md
```

---

## Keamanan

- Password di-hash dengan **argon2id**.
- Access token JWT singkat + refresh token rotasi; reuse token mencabut seluruh family.
- Rate limit per IP untuk login/register/refresh/webhook/upload.
- Data sensitif (jawaban form medis/kontak darurat, nomor rekening) dienkripsi AES-GCM.
- Dokumen disimpan privat; akses via presigned URL berumur pendek.
- Webhook pembayaran diverifikasi HMAC dan idempoten.
- Audit log untuk aksi admin/organizer berdampak.
- Security header (Helmet), CORS allowlist, body limit.

---

## Batasan MVP

- Payment gateway masih **mock**; belum terhubung Midtrans/Xendit.
- Scan QR check-in dilakukan dengan input/tempel kode; belum ada kamera browser.
- 2FA admin/owner belum diaktifkan.
- WhatsApp notification belum diimplementasikan.
- OpenAPI mencakup endpoint utama; belum seluruh varian response didokumentasikan.
- Integration test end-to-end di CI dan load test belum disiapkan.
- Image MinIO memakai `bitnamilegacy/minio` karena registry `minio/minio` tidak tersedia di environment pengembangan saat ini.
