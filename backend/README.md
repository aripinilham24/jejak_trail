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

## Dokumentasi API

- Spesifikasi OpenAPI: [`openapi.yaml`](./openapi.yaml)
- Semua endpoint memakai prefix `/api/v1`
- Envelope sukses: `{ "data": ... }`, list menambahkan `meta`
- Envelope error: `{ "error": { code, message, fields?, requestId } }`

## Hardening

- Rate limit per IP: login 10/menit, register 5/menit, refresh 60/menit, webhook 120/menit, upload 30/menit.
- Security headers via Helmet, CORS allowlist, body limit 25 MB, graceful shutdown.
- Password argon2id, refresh token rotasi + deteksi reuse, file privat presigned URL.
- `TRUST_PROXY=true` bila berjalan di belakang reverse proxy agar `c.IP()` benar.
- Audit log untuk aksi admin/organizer berdampak.

## Backup dan restore

```bash
make backup                                  # backups/jejak-<timestamp>.sql
make restore file=backups/jejak-xxx.sql
```

## Docker

```bash
make docker-build     # image jejak-trail-api:local
make docker-up        # API + Postgres + MinIO + Mailpit via profile "app"
```

Untuk production: set `APP_ENV=production`, `COOKIE_SECURE=true`, `TRUST_PROXY=true`,
secret JWT/ENCRYPTION_KEY yang kuat, dan jalankan migrasi sebelum API:

```bash
go run ./cmd/migrate up
```

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
- Pembayaran: gateway mock dengan signature HMAC, webhook idempoten (`webhook_events`), simulasi bayar/kedaluwarsa, job expiry otomatis tiap menit.
- Pasca-lunas: BIB otomatis per kategori (atomik), data terkunci, tiket QR unik, halaman tiket dengan QR asli.
- Waitlist: promosi otomatis ke `awaiting_payment`/`pending_verification` saat pembayaran kedaluwarsa.
- Check-in racepack: manifest event, scan QR online, penolakan scan ganda dengan info scan sebelumnya, check-in perwakilan, antrean offline + sinkronisasi idempoten.
- Dashboard organizer: kuota per kategori, tren pendaftaran 30 hari, rekap jersey, saldo terkumpul/dicairkan/ditahan.
- Dashboard admin: GMV, pendapatan platform, jumlah event/pendaftaran, antrean verifikasi, pertumbuhan 6 bulan, komposisi event.
- Export CSV peserta (termasuk jawaban form; data sensitif didekripsi untuk organizer berwenang).
- Broadcast pengumuman ke peserta lunas/checked-in via email + in-app, tersimpan di riwayat.
- Notifikasi in-app: daftar, tanda baca satu, tandai semua.
- Refund: kalkulasi dari kebijakan snapshot, proses mock, update status pembayaran/registrasi, revoke tiket, promosi waitlist bila slot dilepas.
- Pencairan bertahap: validasi dana terkumpul & batas persentase, pembuatan per stage, approval/hold admin finance, riwayat organizer.
- Sengketa: peserta membuat laporan, admin review/resolve/reject, audit trail.
- Finance dashboard admin/organizer, dan UI audit log.
- Storage: MinIO bucket privat + presigned URL untuk cover/GPX, readiness check.
- Frontend: login, register attendee/organizer, events list/detail, admin curation/organization/external event, organizer event list/builder/detail, form pendaftaran peserta, daftar/detail pendaftaran, antrean verifikasi organizer, checkout pembayaran mock, daftar/detail tiket QR, check-in racepack (online/offline), dashboard organizer/admin, export CSV, broadcast, notifikasi in-app, refund, pencairan, sengketa, finance, dan audit log sudah memakai API.

### Aturan penting refund, pencairan, dan sengketa

- Refund hanya untuk pembayaran `paid`/`partially_refunded`; nominal dibatasi sisa pembayaran dan persentase kebijakan snapshot (event cancelled/payment error/overbooked = 100%).
- Refund penuh mengubah registrasi menjadi `refunded`, mencabut tiket, dan mempromosikan waitlist.
- Pencairan dihitung dari dana terkumpul bersih (pembayaran paid/partial dikurangi refund), dibatasi persentase stage dan kumulatif pencairan.
- Pencairan baru berstatus `eligible`; admin finance menyetujui (paid + payout ref) atau menahan (held).
- Sengketa hanya dapat dibuat peserta untuk event/registrasi miliknya; keputusan admin wajib menyertakan resolusi dan tercatat di audit log.

### Aturan penting dashboard dan komunikasi

- Dashboard organizer dihitung dari event milik organisasi; saldo `held = collected - disbursed`.
- Dashboard admin memakai agregat seluruh platform; `GMV` dan `revenue` hanya dari pembayaran `paid`.
- Export CSV memuat kolom dasar + seluruh field form event; data sensitif didekripsi hanya untuk organizer pemilik event.
- Broadcast hanya mengirim ke peserta `paid`/`checked_in`; channel `email` (email + in-app) atau `in_app`.
- Notifikasi in-app disimpan di tabel `notifications`; penandaan baca dibatasi pada pemilik notifikasi.

### Aturan penting check-in racepack

- Manifest hanya memuat pendaftaran `paid`/`checked_in` yang sudah memiliki tiket.
- Scan QR memverifikasi tiket milik event organizer yang sedang login.
- Scan ganda ditolak dengan informasi waktu scan sebelumnya; tiket tidak bisa dipakai dua kali.
- Perwakilan wajib mengisi nama perwakilan; catatan surat kuasa opsional.
- Mode offline menyimpan antrean di browser (localStorage) dengan `clientId` unik; sinkronisasi batch idempoten, item yang sudah tersinkron tidak menggandakan check-in.
- Check-in mengubah tiket menjadi `used`, pendaftaran menjadi `checked_in`, dan menulis status log.

### Aturan penting pembayaran dan tiket

- Gateway aktif saat ini `mock`; webhook memverifikasi `X-Webhook-Signature` = HMAC-SHA256 body dengan `MOCK_WEBHOOK_SECRET`.
- Webhook idempoten: kombinasi (`gateway`, `event_id`) unik; event ganda tidak menggandakan efek.
- Pembayaran `paid` mengisi `paid_at`, mengunci data, menerbitkan BIB (`PREFIX-0001`, atomik per kategori) dan tiket QR acak.
- Pembayaran `expired` melepas slot dan mempromosikan waitlist tertua.
- Job expiry berjalan setiap menit di proses API; endpoint simulasi hanya tersedia di non-production.
- Status BIB yang melewati `bib_end` ditolak dan perlu tindakan admin.

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

GET    /api/v1/account/tickets
GET    /api/v1/account/tickets/:id
POST   /api/v1/webhooks/payments/:gateway
POST   /api/v1/dev/payments/:orderId/simulate
POST   /api/v1/dev/payments/:orderId/expire

GET    /api/v1/organizer/registrations
GET    /api/v1/organizer/registrations/:id
POST   /api/v1/organizer/registrations/:id/approve
POST   /api/v1/organizer/registrations/:id/reject

GET    /api/v1/organizer/events/:id/checkin/manifest
POST   /api/v1/organizer/checkin/scan
POST   /api/v1/organizer/checkin/sync
GET    /api/v1/organizer/events/:id/participants/export
GET    /api/v1/organizer/events/:id/broadcasts
POST   /api/v1/organizer/events/:id/broadcasts
GET    /api/v1/organizer/dashboard
GET    /api/v1/organizer/finance
GET    /api/v1/organizer/disbursements
GET    /api/v1/admin/dashboard
GET    /api/v1/admin/finance
GET    /api/v1/admin/refunds
POST   /api/v1/admin/registrations/:id/refund
GET    /api/v1/admin/disbursements
POST   /api/v1/admin/events/:id/disbursements
POST   /api/v1/admin/disbursements/:id/approve
POST   /api/v1/admin/disbursements/:id/hold
GET    /api/v1/admin/disputes
POST   /api/v1/admin/disputes/:id/review
POST   /api/v1/admin/disputes/:id/resolve
POST   /api/v1/admin/disputes/:id/reject
GET    /api/v1/admin/audit-logs
GET    /api/v1/account/disputes
POST   /api/v1/account/disputes
GET    /api/v1/account/notifications
POST   /api/v1/account/notifications/:id/read
POST   /api/v1/account/notifications/read-all

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

### Sisa pekerjaan sebelum production

- Uji beban/burst saat pendaftaran dibuka; target kapasitas belum ditentukan.
- Metrics/alerting (Prometheus/Sentry), log aggregation, dan dashboard operasional.
- Backup terjadwal + uji restore rutin; retensi data sesuai UU PDP.
- Gateway pembayaran produksi (Midtrans/Xendit), rekonsiliasi, dan split/escrow bila dipakai.
- 2FA wajib untuk admin/owner, CSP frontend, dan review keamanan eksternal.
- Integration test end-to-end dengan Postgres nyata di CI (selain unit test saat ini).
- Check-in racepack offline, refund, pencairan, sengketa.
- OpenAPI formal + integration test dengan Postgres.
