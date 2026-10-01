# Event Platform ERD

> Pendamping dokumen `Event-Platform-PRD.md`. Diagram memakai sintaks Mermaid (`erDiagram`), dapat dirender di GitHub, GitLab, Notion, VS Code (ekstensi Mermaid), atau mermaid.live.
> Tipe data bersifat konseptual dan disesuaikan dengan basis data yang dipilih (disarankan PostgreSQL).

---

## 1. Ringkasan Domain

| Domain | Tabel |
|---|---|
| Akun peserta | `users`, `user_documents` |
| Organisasi dan akun organizer | `organizations`, `organizer_accounts`, `organization_bank_accounts` |
| Admin platform | `admin_users` |
| Event | `events`, `event_categories`, `qualification_requirements`, `registration_form_fields`, `refund_policies`, `refund_policy_rules` |
| Pendaftaran | `registrations`, `registration_qualification_submissions`, `registration_answers`, `registration_status_logs` |
| Pembayaran | `payments`, `refunds` |
| Pasca-lunas | `tickets`, `racepack_checkins` |
| Pencairan dana | `disbursements`, `disbursement_conditions` |
| Pendukung | `disputes`, `broadcasts`, `notifications`, `audit_logs` |

---

## 2. Diagram: Akun, Organisasi, dan Admin

```mermaid
erDiagram
    users {
        uuid id PK
        string email UK
        string password_hash
        string google_id
        string phone
        string full_name
        date birth_date
        string gender
        string emergency_contact_name
        string emergency_contact_phone
        string status
        datetime email_verified_at
        datetime created_at
    }

    user_documents {
        uuid id PK
        uuid user_id FK
        string doc_type
        string file_url
        string external_link
        string label
        datetime created_at
    }

    organizations {
        uuid id PK
        string name
        string org_type
        string official_email
        string phone
        string address
        string province
        string city
        string legal_doc_url
        string verification_status
        uuid verified_by FK
        datetime verified_at
        string rejection_reason
        string status
        datetime created_at
    }

    organizer_accounts {
        uuid id PK
        uuid organization_id FK
        string email
        string password_hash
        string full_name
        string phone
        string position_title
        string org_role
        boolean two_factor_enabled
        string status
        datetime invited_at
        datetime created_at
    }

    organization_bank_accounts {
        uuid id PK
        uuid organization_id FK
        string bank_name
        string account_number_encrypted
        string account_holder
        string verification_status
        uuid verified_by FK
        datetime verified_at
        boolean is_active
    }

    admin_users {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string admin_role
        boolean two_factor_enabled
        string status
        datetime created_at
    }

    users ||--o{ user_documents : "punya"
    organizations ||--|{ organizer_accounts : "beranggota"
    organizations ||--o{ organization_bank_accounts : "memiliki rekening"
    admin_users ||--o{ organizations : "memverifikasi"
    admin_users ||--o{ organization_bank_accounts : "memverifikasi"
```

**Catatan**
- `users.email` unik di tabel `users`. Email boleh sama dengan `organizer_accounts.email` (registrasi terpisah, login memilih konteks).
- `organizer_accounts.org_role`: `owner`, `verifier`, `racepack_staff`, `finance`.
- `admin_users.admin_role`: `super_admin`, `support`, `finance`.
- Akun yang membuat organisasi otomatis `owner`.

---

## 3. Diagram: Event dan Kebijakan

```mermaid
erDiagram
    organizations {
        uuid id PK
        string name
    }

    admin_users {
        uuid id PK
        string full_name
    }

    events {
        uuid id PK
        uuid organization_id FK "null untuk event eksternal"
        uuid reviewed_by FK
        string event_type "native atau external"
        string title
        string slug UK
        text description
        string location_name
        string province
        string city
        decimal latitude
        decimal longitude
        datetime event_start_at
        datetime event_end_at
        datetime registration_open_at
        datetime registration_close_at
        string status
        string external_url "untuk event eksternal"
        string cover_url
        string route_gpx_url
        text mandatory_gear
        text terms
        boolean is_featured
        uuid refund_policy_id FK
        datetime published_at
        datetime created_at
    }

    event_categories {
        uuid id PK
        uuid event_id FK
        string name
        decimal distance_km
        int elevation_gain_m
        string difficulty
        decimal price
        int quota
        int min_age
        int cutoff_minutes
        boolean requires_qualification
        string bib_prefix
        int bib_start
        int bib_end
        int bib_next
        datetime created_at
    }

    qualification_requirements {
        uuid id PK
        uuid category_id FK
        string requirement_type
        string label
        text description
        boolean is_required
        int sort_order
    }

    registration_form_fields {
        uuid id PK
        uuid event_id FK
        string field_key
        string label
        string field_type
        json options
        boolean is_required
        boolean is_sensitive
        int sort_order
    }

    refund_policies {
        uuid id PK
        uuid organization_id FK
        string name
        string policy_type
        text description
        int version
        datetime created_at
    }

    refund_policy_rules {
        uuid id PK
        uuid policy_id FK
        int days_before_event_min
        int days_before_event_max
        decimal refund_percent
    }

    organizations ||--o{ events : "menyelenggarakan"
    admin_users ||--o{ events : "mereview / input eksternal"
    events ||--|{ event_categories : "memiliki kategori"
    event_categories ||--o{ qualification_requirements : "mensyaratkan"
    events ||--o{ registration_form_fields : "mengatur form"
    organizations ||--o{ refund_policies : "membuat"
    refund_policies ||--o{ refund_policy_rules : "terdiri dari"
    refund_policies ||--o{ events : "dipakai oleh"
```

**Catatan**
- `events.event_type`: `native` (pendaftaran di platform) atau `external` (kalender saja, `external_url` terisi, `organization_id` boleh null).
- `events.status`: `draft`, `pending_review`, `published`, `registration_closed`, `cancelled`, `completed`, `suspended`.
- `qualification_requirements.requirement_type`: `finisher_certificate`, `race_result_link`, `profile_link` (misal Strava/ITRA), `medical_certificate`, `custom_text`.
- `registration_form_fields.field_type`: `text`, `number`, `select`, `date`, `file`, dan lain-lain. `is_sensitive` menandai data medis/kontak darurat yang harus dienkripsi dan dibatasi aksesnya.
- `refund_policy_rules`: aturan bertingkat berdasarkan jarak hari ke event, misalnya >= 30 hari sebelum event: 70 persen. Jika `policy_type = no_refund`, tidak ada rule.
- `refund_policies.version`: saat kebijakan berubah, buat versi baru agar transaksi lama tetap merujuk versi yang disetujui saat bayar.
- `event_categories.bib_next`: penghitung BIB berikutnya (update atomik saat penerbitan BIB).

---

## 4. Diagram: Pendaftaran, Pembayaran, dan Pasca-Lunas

```mermaid
erDiagram
    users {
        uuid id PK
        string full_name
    }

    organizer_accounts {
        uuid id PK
        string full_name
    }

    events {
        uuid id PK
        string title
    }

    event_categories {
        uuid id PK
        string name
    }

    qualification_requirements {
        uuid id PK
        string label
    }

    registration_form_fields {
        uuid id PK
        string label
    }

    registrations {
        uuid id PK
        uuid user_id FK
        uuid event_id FK
        uuid category_id FK
        string status
        string full_name_snapshot
        date birth_date_snapshot
        int waitlist_position
        uuid reviewed_by FK
        datetime submitted_at
        datetime reviewed_at
        string rejection_reason
        datetime payment_deadline_at
        datetime approved_at
        datetime paid_at
        datetime data_locked_at
        string bib_number
        uuid refund_policy_id FK
        int refund_policy_version
        datetime created_at
    }

    registration_qualification_submissions {
        uuid id PK
        uuid registration_id FK
        uuid requirement_id FK
        string value_text
        string file_url
        string external_link
        string status
        text reviewer_note
        datetime created_at
    }

    registration_answers {
        uuid id PK
        uuid registration_id FK
        uuid field_id FK
        text value
        boolean is_encrypted
    }

    registration_status_logs {
        uuid id PK
        uuid registration_id FK
        string from_status
        string to_status
        string actor_type
        uuid actor_id
        text note
        datetime created_at
    }

    payments {
        uuid id PK
        uuid registration_id FK
        string order_id UK
        string gateway
        string gateway_ref
        string method
        decimal amount
        decimal platform_fee
        decimal gateway_fee
        string status
        datetime expires_at
        datetime paid_at
        json raw_payload
        datetime created_at
    }

    refunds {
        uuid id PK
        uuid payment_id FK
        uuid registration_id FK
        decimal amount
        string reason_type
        string status
        string gateway_ref
        string fee_borne_by
        uuid processed_by FK
        datetime requested_at
        datetime processed_at
    }

    tickets {
        uuid id PK
        uuid registration_id FK
        string qr_code UK
        string status
        datetime issued_at
    }

    racepack_checkins {
        uuid id PK
        uuid ticket_id FK
        uuid checked_in_by FK
        string pickup_type "self atau representative"
        string representative_name
        string representative_note
        boolean created_offline
        datetime scanned_at
        datetime synced_at
    }

    users ||--o{ registrations : "mendaftar"
    events ||--o{ registrations : "menerima"
    event_categories ||--o{ registrations : "dipilih"
    organizer_accounts ||--o{ registrations : "memverifikasi"
    registrations ||--o{ registration_qualification_submissions : "mengirim dokumen"
    qualification_requirements ||--o{ registration_qualification_submissions : "dipenuhi oleh"
    registrations ||--o{ registration_answers : "mengisi"
    registration_form_fields ||--o{ registration_answers : "dijawab"
    registrations ||--o{ registration_status_logs : "dicatat"
    registrations ||--o{ payments : "dibayar lewat"
    payments ||--o{ refunds : "dikembalikan"
    registrations ||--o| tickets : "menerbitkan"
    tickets ||--o{ racepack_checkins : "dipindai"
    organizer_accounts ||--o{ racepack_checkins : "melakukan"
```

**Catatan**
- `registrations` dibatasi unik pada (`user_id`, `event_id`) untuk status aktif (satu peserta satu kategori per event).
- `full_name_snapshot` dan `birth_date_snapshot` menyimpan data saat pendaftaran supaya tidak berubah walau profil user berubah (data peserta terkunci setelah lunas).
- `registrations.refund_policy_id` + `refund_policy_version` menyimpan kebijakan yang berlaku saat peserta membayar.
- `registration_answers.is_encrypted`: true untuk kolom form sensitif.
- `registration_qualification_submissions.status`: `submitted`, `accepted`, `rejected`.
- `payments.platform_fee` dan `gateway_fee` dipisah agar rekonsiliasi dan perhitungan pencairan akurat.
- `payments.order_id` unik dan dipakai untuk idempotensi webhook.
- `refunds.reason_type`: `event_cancelled`, `participant_cancel`, `payment_error`, `overbooked`, `other`. `fee_borne_by`: `platform`, `organizer`, `participant`.
- `racepack_checkins.pickup_type`: `self`, `representative`. `created_offline` dan `synced_at` mendukung check-in offline.
- Unik pada `racepack_checkins(ticket_id)` untuk mencegah pengambilan ganda (atau gunakan status tiket `used`).

---

## 5. Diagram: Pencairan, Sengketa, dan Pendukung

```mermaid
erDiagram
    events {
        uuid id PK
        string title
    }

    organizations {
        uuid id PK
        string name
    }

    organization_bank_accounts {
        uuid id PK
        string bank_name
    }

    admin_users {
        uuid id PK
        string full_name
    }

    registrations {
        uuid id PK
        string status
    }

    disbursements {
        uuid id PK
        uuid event_id FK
        uuid organization_id FK
        uuid bank_account_id FK
        int stage "1, 2, 3"
        decimal percentage
        decimal amount
        string status
        uuid approved_by FK
        datetime requested_at
        datetime approved_at
        datetime paid_at
        string payout_ref
        text note
    }

    disbursement_conditions {
        uuid id PK
        uuid disbursement_id FK
        string condition_key
        string description
        boolean is_met
        uuid checked_by FK
        datetime checked_at
    }

    disputes {
        uuid id PK
        uuid event_id FK
        uuid registration_id FK
        string reporter_type
        uuid reporter_id
        string dispute_type
        text description
        string status
        uuid handled_by FK
        text resolution
        datetime created_at
        datetime resolved_at
    }

    broadcasts {
        uuid id PK
        uuid event_id FK
        uuid sent_by
        string channel
        string subject
        text message
        datetime sent_at
    }

    notifications {
        uuid id PK
        string recipient_type
        uuid recipient_id
        string channel
        string template_key
        json payload
        string status
        datetime sent_at
        datetime created_at
    }

    audit_logs {
        uuid id PK
        string actor_type
        uuid actor_id
        string action
        string entity_type
        uuid entity_id
        json before_data
        json after_data
        string ip_address
        datetime created_at
    }

    events ||--o{ disbursements : "dicairkan per tahap"
    organizations ||--o{ disbursements : "menerima"
    organization_bank_accounts ||--o{ disbursements : "tujuan"
    admin_users ||--o{ disbursements : "menyetujui"
    disbursements ||--o{ disbursement_conditions : "memiliki syarat"
    events ||--o{ disputes : "terkait"
    registrations ||--o{ disputes : "terkait"
    admin_users ||--o{ disputes : "menangani"
    events ||--o{ broadcasts : "mengirim info"
```

**Catatan**
- `disbursements.status`: `pending`, `eligible`, `approved`, `paid`, `held`, `rejected`.
- `disbursement_conditions.condition_key` contoh: `org_verified`, `venue_permit_uploaded`, `vendor_contract_uploaded`, `racepack_ready`, `event_completed`, `no_open_dispute`.
- Validasi bisnis: jumlah pencairan kumulatif tidak boleh melebihi persentase yang diizinkan dari **dana terkumpul** (pembayaran `paid` dikurangi refund).
- `audit_logs`, `notifications`, dan `disputes` memakai `actor_type` / `reporter_type` / `recipient_type` bertipe polimorfik (`user`, `organizer`, `admin`, `system`), sehingga `actor_id` tidak memakai foreign key keras.
- `disputes.dispute_type`: `payment`, `rejection`, `event_cancelled`, `refund`, `organizer_fraud`, `other`.

---

## 6. State Machine

### 6.1 `registrations.status`

```mermaid
stateDiagram-v2
    [*] --> pending_verification: kirim (event berkualifikasi)
    [*] --> awaiting_payment: konfirmasi (event terbuka)

    pending_verification --> approved: organizer setujui
    pending_verification --> rejected: organizer tolak (alasan wajib)
    pending_verification --> waitlisted: kuota penuh

    approved --> awaiting_payment: tagihan dibuat
    awaiting_payment --> paid: webhook pembayaran valid
    awaiting_payment --> expired: batas waktu lewat

    waitlisted --> approved: slot tersedia

    rejected --> pending_verification: ajukan ulang (bila diizinkan)

    paid --> refunded: refund (event batal / kebijakan)
    paid --> checked_in: racepack diambil
    expired --> [*]
    rejected --> [*]
    refunded --> [*]
    checked_in --> [*]
```

Nilai status: `pending_verification`, `approved`, `awaiting_payment`, `paid`, `rejected`, `expired`, `waitlisted`, `cancelled`, `refunded`, `checked_in`.

### 6.2 `events.status`

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> pending_review: organizer kirim
    pending_review --> published: admin setujui
    pending_review --> draft: admin minta revisi
    published --> registration_closed: pendaftaran tutup / kuota penuh
    published --> cancelled: dibatalkan
    registration_closed --> completed: event selesai
    registration_closed --> cancelled: dibatalkan
    published --> suspended: pelanggaran
    suspended --> published: dipulihkan
    completed --> [*]
    cancelled --> [*]
```

### 6.3 `payments.status`

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> paid: webhook valid
    pending --> expired: tagihan kedaluwarsa
    pending --> failed: gagal
    paid --> partially_refunded
    paid --> refunded
    partially_refunded --> refunded
    expired --> [*]
    failed --> [*]
    refunded --> [*]
```

---

## 7. Daftar Constraint dan Indeks Penting

| Tabel | Constraint / Indeks | Tujuan |
|---|---|---|
| `users` | UNIQUE(`email`) | Satu akun peserta per email |
| `organizer_accounts` | UNIQUE(`organization_id`, `email`) | Tidak ada anggota ganda |
| `events` | UNIQUE(`slug`); INDEX(`status`, `event_start_at`); INDEX(`province`, `city`) | Discovery dan filter |
| `event_categories` | INDEX(`event_id`); CHECK(`quota` >= 0) | Kuota valid |
| `registrations` | UNIQUE(`user_id`, `event_id`) untuk status aktif; INDEX(`event_id`, `category_id`, `status`) | Satu kategori per peserta; hitung kuota cepat |
| `registrations` | INDEX(`payment_deadline_at`) | Job kedaluwarsa otomatis |
| `registrations` | UNIQUE(`category_id`, `bib_number`) | BIB tidak ganda |
| `payments` | UNIQUE(`order_id`); UNIQUE(`gateway`, `gateway_ref`) | Idempotensi webhook |
| `tickets` | UNIQUE(`qr_code`); UNIQUE(`registration_id`) | Satu tiket per pendaftaran |
| `racepack_checkins` | UNIQUE(`ticket_id`) | Mencegah pengambilan ganda |
| `disbursements` | UNIQUE(`event_id`, `stage`) | Satu pencairan per tahap per event |
| `audit_logs` | INDEX(`entity_type`, `entity_id`); INDEX(`created_at`) | Penelusuran audit |

**Konsistensi kuota.** Hitungan slot terisi = jumlah `registrations` pada kategori dengan status `approved`, `awaiting_payment`, `paid`, `checked_in`. Pembuatan slot (transisi ke `approved`/`awaiting_payment`) harus dilakukan dalam transaksi dengan penguncian baris (`SELECT ... FOR UPDATE` pada kategori) agar tidak terjadi overselling saat trafik tinggi.

---

## 8. Pemetaan Singkat PRD ke Tabel

| Bagian PRD | Tabel utama |
|---|---|
| Auth dan peran (05, 16) | `users`, `organizer_accounts`, `admin_users`, `organizations` |
| Event dan discovery (08, 10.2-10.3) | `events`, `event_categories`, `qualification_requirements`, `registration_form_fields` |
| Pendaftaran dan verifikasi (06, 09, 10.4) | `registrations`, `registration_qualification_submissions`, `registration_answers`, `registration_status_logs` |
| Pembayaran dan refund (15) | `payments`, `refunds`, `refund_policies`, `refund_policy_rules` |
| BIB, tiket, racepack (10.6) | `registrations.bib_number`, `event_categories.bib_*`, `tickets`, `racepack_checkins` |
| Pencairan bertahap (15.4) | `disbursements`, `disbursement_conditions`, `organization_bank_accounts` |
| Sengketa dan komunikasi (12, 10.7) | `disputes`, `broadcasts`, `notifications` |
| Log audit (16, AR-08) | `audit_logs` |

---

## 9. Tabel Pasca-MVP (belum digambar)

- `wishlists` (`user_id`, `event_id`), `runner_profiles`, `race_history`, `badges`
- `addons`, `registration_addons` (penginapan, transport, jersey ekstra)
- `referral_links`, `referral_conversions` (komisi referral)
- `featured_placements` (promosi berbayar)
- `organization_members` terpisah dari `organizer_accounts` bila satu akun perlu tergabung di banyak organisasi
