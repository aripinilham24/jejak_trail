# Jejak Trail API

Backend Go untuk platform event trail run: discovery, registrasi, verifikasi,
pembayaran, tiket QR, check-in racepack, dan pencairan dana.

## Stack

- Go 1.27+ / Fiber v3
- PostgreSQL 17 (Docker)
- sqlc + pgx/v5
- goose (migrasi SQL, forward-only)
- MinIO untuk object storage (Docker)
- Mailpit untuk email development (Docker)

## Prasyarat

- Go >= 1.25 (disarankan 1.27.3)
- Docker + Docker Compose

## Mulai cepat

```bash
cp .env.example .env
make up          # Postgres, MinIO, Mailpit
make migrate-up
make seed
make run         # http://localhost:8080
```

Cek kesehatan:

```bash
curl http://localhost:8080/health/live
curl http://localhost:8080/health/ready
```

Reset data development:

```bash
make reset
```

## Akun seed

| Peran | Email | Password |
|---|---|---|
| Admin | `admin@jejak.local` | `Password123!` |
| Attendee | `pelari@jejak.local` | `Password123!` |
| Organizer | `owner@jejaknusantara.local` | `Password123!` |

## Layanan development

| Layanan | URL |
|---|---|
| API | http://localhost:8080 |
| MinIO Console | http://localhost:9001 (`minioadmin` / `minioadmin`) |
| Mailpit | http://localhost:8025 |

## Perintah

```bash
make help
make sqlc          # generate ulang kode dari db/queries
make test
make lint
```

## Struktur

```
cmd/api        # entry point HTTP
cmd/migrate    # runner goose (embed migrasi)
cmd/seed       # data development
internal/      # domain + platform
db/queries     # query sqlc
internal/db/migrations
```

## Catatan

- Migrasi bersifat **forward-only**. `make reset` menghapus volume Postgres
  lalu menjalankan migrasi dan seed dari awal.
- `sqlc` dipin melalui blok `tool` di `go.mod`, jadi tidak perlu install global:
  `go tool sqlc generate`.

## Status implementasi (slice pertama)

Sudah berjalan end-to-end:

- Fondasi: config env, logging JSON, request ID, error envelope, CORS, security headers, graceful shutdown.
- Database: skema awal (akun, organisasi, event, pendaftaran, pembayaran, tiket, pencairan, audit) + migrasi goose + seed.
- Auth: register attendee, register organizer, login 3 konteks, refresh rotation + deteksi reuse, logout, me, update profil, verifikasi email (Mailpit).
- Discovery: list event + filter, detail event, kalender, metadata filter.
- Admin: daftar/verifikasi organisasi, daftar/review event, CRUD event eksternal, audit log.
- Organizer event builder: draft event lengkap (kategori, syarat kualifikasi, form peserta, refund policy), list/detail event milik organisasi, submit ke review admin.
- Registrasi peserta: submit dengan jawaban form + dokumen kualifikasi, snapshot harga & kebijakan refund, kuota atomik, waitlist, upload privat ke MinIO.
- Verifikasi organizer: antrean pendaftar, detail dokumen, setujui (tagihan pending + batas waktu) atau tolak dengan alasan, notifikasi in-app + email.
- Storage: MinIO bucket privat + presigned URL untuk cover/GPX, readiness check.
- Frontend: login, register attendee/organizer, events list/detail, admin curation/organization/external event, organizer event list/builder/detail, form pendaftaran peserta, daftar/detail pendaftaran, antrean verifikasi organizer sudah memakai API.

### Aturan penting registrasi

- Slot dihitung dari status `approved`, `awaiting_payment`, `paid`, `checked_in`; baris kategori dikunci (`FOR UPDATE`) saat kuota dicek agar tidak overselling.
- Kategori berkualifikasi: submit → `pending_verification`; organizer menyetujui → `awaiting_payment` + tagihan pending; menolak → `rejected` + alasan wajib.
- Kategori tanpa kualifikasi: submit → `awaiting_payment` + tagihan pending dan batas waktu.
- Kuota penuh: pendaftaran masuk `waitlisted` dengan posisi berurutan (promosi otomatis menyusul di milestone pembayaran/expiry).
- Jawaban form bertanda sensitif dienkripsi AES-GCM; hanya pemilik dan organizer event yang dapat membacanya.
- File kualifikasi harus berasal dari upload milik peserta sendiri (`attendee/{user_id}/...`), diakses via presigned URL 15 menit.
- Tidak ada pendaftaran aktif ganda per peserta per event (partial unique index + pengecekan service).

### Aturan penting organizer

- Organisasi harus `verified` dan `active` untuk membuat/mengubah/mengirim event.
- Hanya event `draft` yang bisa diubah atau dikirim untuk review.
- Submit review mensyaratkan minimal satu kategori dan kebijakan refund.
- Perubahan event draft mengganti seluruh kategori/syarat/form/refund policy dalam satu transaksi; ditolak bila sudah ada pendaftar.
- Kebijakan refund diberi versi otomatis per organisasi + nama kebijakan.

### Endpoint utama

```
GET    /api/v1/events
GET    /api/v1/events/:slug
GET    /api/v1/events/calendar
GET    /api/v1/meta/discovery-filters

POST   /api/v1/auth/attendee/register
POST   /api/v1/auth/organizer/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
GET    /api/v1/auth/verify-email?token=...
PATCH  /api/v1/account/profile

GET    /api/v1/organizer/events
POST   /api/v1/organizer/events
GET    /api/v1/organizer/events/:id
PUT    /api/v1/organizer/events/:id
POST   /api/v1/organizer/events/:id/submit

POST   /api/v1/events/:slug/registrations
GET    /api/v1/account/registrations
GET    /api/v1/account/registrations/:id
POST   /api/v1/uploads

GET    /api/v1/organizer/registrations
GET    /api/v1/organizer/registrations/:id
POST   /api/v1/organizer/registrations/:id/approve
POST   /api/v1/organizer/registrations/:id/reject

GET    /api/v1/admin/organizations
GET    /api/v1/admin/organizations/:id
POST   /api/v1/admin/organizations/:id/verify
GET    /api/v1/admin/events
GET    /api/v1/admin/events/:id
POST   /api/v1/admin/events/:id/review
POST   /api/v1/admin/external-events
PATCH  /api/v1/admin/external-events/:id
DELETE /api/v1/admin/external-events/:id
```

### Catatan image MinIO

Registry `minio/minio` dan `minio/mc` tidak dapat diakses dari environment ini,
jadi compose memakai `bitnamilegacy/minio` (MinIO versi legacy). Bucket dibuat
otomatis oleh API saat start (`EnsureBucket`), sehingga tidak ada service init
satu-kali yang bisa membuat `docker compose up --wait` gagal.

### Berikutnya

- Payment gateway adapter + webhook idempoten + BIB/tiket QR.
- Promosi waitlist otomatis saat slot dilepas (expired/refund).
- Check-in racepack offline, refund, pencairan, sengketa.
- OpenAPI formal + integration test dengan Postgres.
