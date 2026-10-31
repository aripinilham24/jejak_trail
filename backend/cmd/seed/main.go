package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/aripinilham/jejak_trail/backend/internal/config"
	"github.com/aripinilham/jejak_trail/backend/internal/db"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/crypto"
)

const (
	adminID          = "00000000-0000-0000-0000-000000000001"
	attendeeID       = "00000000-0000-0000-0000-000000000002"
	orgID            = "00000000-0000-0000-0000-000000000010"
	organizerID      = "00000000-0000-0000-0000-000000000011"
	bankAccountID    = "00000000-0000-0000-0000-000000000012"
	pendingOrgID     = "00000000-0000-0000-0000-000000000020"
	pendingOwnerID   = "00000000-0000-0000-0000-000000000021"
	rejectedOrgID    = "00000000-0000-0000-0000-000000000030"
	rejectedOwnerID  = "00000000-0000-0000-0000-000000000031"
	refundPolicyID   = "00000000-0000-0000-0000-000000000040"
	eventSundoroID   = "00000000-0000-0000-0000-000000000100"
	eventRinjaniID   = "00000000-0000-0000-0000-000000000200"
	eventBromoID     = "00000000-0000-0000-0000-000000000300"
	eventMerbabuID   = "00000000-0000-0000-0000-000000000400"
	eventSemeruID    = "00000000-0000-0000-0000-000000000500"
	eventSumbaID     = "00000000-0000-0000-0000-000000000600"
	seedPassword     = "Password123!"
	seedAttendeeMail = "pelari@jejak.local"
)

func main() {
	if err := run(); err != nil {
		slog.Error("seed gagal", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if cfg.IsProduction() {
		return fmt.Errorf("seed tidak boleh dijalankan di production")
	}

	ctx := context.Background()
	database, err := db.Open(ctx, cfg.DatabaseURL, 4, 1)
	if err != nil {
		return err
	}
	defer database.Close()

	passwordHash, err := crypto.HashPassword(seedPassword)
	if err != nil {
		return err
	}

	var encryptor *crypto.Encryptor
	if cfg.EncryptionKey != "" {
		encryptor, err = crypto.NewEncryptor(cfg.EncryptionKey)
		if err != nil {
			return err
		}
	}

	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := truncate(ctx, tx); err != nil {
		return err
	}
	if err := seed(ctx, tx, passwordHash, encryptor); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}

	fmt.Println("seed selesai")
	fmt.Println("login admin     : admin@jejak.local /", seedPassword)
	fmt.Println("login attendee  :", seedAttendeeMail, "/", seedPassword)
	fmt.Println("login organizer : owner@jejaknusantara.local /", seedPassword)
	return nil
}

func truncate(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, `
		TRUNCATE TABLE
			webhook_events, audit_logs, notifications, broadcasts, disputes,
			disbursement_conditions, disbursements, racepack_checkins, tickets,
			refunds, payments, registration_status_logs, registration_answers,
			registration_qualification_submissions, registrations,
			registration_form_fields, qualification_requirements, event_categories,
			events, refund_policy_rules, refund_policies, auth_tokens, refresh_tokens,
			user_documents, organization_bank_accounts, organizer_accounts,
			organizations, users, admin_users
		RESTART IDENTITY CASCADE
	`)
	if err != nil {
		return fmt.Errorf("truncate: %w", err)
	}
	return nil
}

func seed(ctx context.Context, tx pgx.Tx, passwordHash string, encryptor *crypto.Encryptor) error {
	now := time.Now().UTC()

	// Admin platform
	if _, err := tx.Exec(ctx, `
		INSERT INTO admin_users (id, email, password_hash, full_name, admin_role, status, created_at)
		VALUES ($1, 'admin@jejak.local', $2, 'Sekar Ayu Larasati', 'super_admin', 'active', $3)
	`, adminID, passwordHash, now.AddDate(0, 0, -400)); err != nil {
		return fmt.Errorf("insert admin: %w", err)
	}

	// Attendee utama
	if err := insertUser(ctx, tx, userRow{
		ID: attendeeID, Email: seedAttendeeMail, PasswordHash: passwordHash,
		FullName: "Aripin Ilham", Phone: ptrString("081200000001"), BirthDate: date(1994, 5, 17),
		Gender: "male", EmergencyName: "Siti Rahma", EmergencyPhone: "081200000002",
		VerifiedAt: ptrTime(now.AddDate(0, 0, -200)), CreatedAt: now.AddDate(0, 0, -200),
	}); err != nil {
		return err
	}

	// Organisasi terverifikasi + owner + rekening
	if err := insertOrganization(ctx, tx, organizationRow{
		ID: orgID, Name: "Jejak Nusantara Events", OrgType: "event_organizer",
		OfficialEmail: "hello@jejaknusantara.local", Phone: "0221234567",
		Address: "Jl. Cihampelas 120", Province: "Jawa Barat", City: "Bandung",
		Verification: "verified", VerifiedBy: adminID, VerifiedAt: ptrTime(now.AddDate(0, 0, -300)),
		CreatedAt: now.AddDate(0, 0, -320),
	}); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO organizer_accounts (id, organization_id, email, password_hash, full_name, phone, position_title, org_role, status, created_at)
		VALUES ($1, $2, 'owner@jejaknusantara.local', $3, 'Rangga Pratama', '081300000001', 'Race Director', 'owner', 'active', $4)
	`, organizerID, orgID, passwordHash, now.AddDate(0, 0, -320)); err != nil {
		return fmt.Errorf("insert organizer owner: %w", err)
	}

	bankEncrypted := "seed-plain:1234567890"
	if encryptor != nil {
		enc, err := encryptor.Encrypt("1234567890")
		if err != nil {
			return err
		}
		bankEncrypted = enc
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO organization_bank_accounts (
			id, organization_id, bank_name, account_number_encrypted, account_number_last4,
			account_holder, verification_status, verified_by, verified_at, is_active
		) VALUES ($1, $2, 'BCA', $3, '7890', 'Jejak Nusantara Events', 'verified', $4, $5, true)
	`, bankAccountID, orgID, bankEncrypted, adminID, now.AddDate(0, 0, -300)); err != nil {
		return fmt.Errorf("insert bank account: %w", err)
	}

	// Organisasi pending (untuk demo verifikasi admin)
	if err := insertOrganization(ctx, tx, organizationRow{
		ID: pendingOrgID, Name: "Kalimantan Forest Run", OrgType: "community",
		OfficialEmail: "halo@kalimantanforest.local", Phone: "0542123456",
		Address: "Jl. Bukit Hijau 8", Province: "Kalimantan Timur", City: "Balikpapan",
		Verification: "pending", CreatedAt: now.AddDate(0, 0, -9),
	}); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO organizer_accounts (id, organization_id, email, password_hash, full_name, phone, position_title, org_role, status, created_at)
		VALUES ($1, $2, 'owner@kalimantanforest.local', $3, 'Dewi Lestari', '081300000002', 'Ketua Komunitas', 'owner', 'active', $4)
	`, pendingOwnerID, pendingOrgID, passwordHash, now.AddDate(0, 0, -9)); err != nil {
		return fmt.Errorf("insert pending owner: %w", err)
	}

	// Organisasi ditolak
	if err := insertOrganization(ctx, tx, organizationRow{
		ID: rejectedOrgID, Name: "Papua Sky Trail", OrgType: "event_organizer",
		OfficialEmail: "info@paputrail.local", Phone: "0967123456",
		Address: "Jl. Wamena Baru 2", Province: "Papua", City: "Wamena",
		Verification: "rejected", RejectionReason: ptrString("Dokumen legalitas belum lengkap."),
		VerifiedAt: ptrTime(now.AddDate(0, 0, -30)), CreatedAt: now.AddDate(0, 0, -60),
	}); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO organizer_accounts (id, organization_id, email, password_hash, full_name, org_role, status, created_at)
		VALUES ($1, $2, 'owner@paputrail.local', $3, 'Yohanes Wenda', 'owner', 'active', $4)
	`, rejectedOwnerID, rejectedOrgID, passwordHash, now.AddDate(0, 0, -60)); err != nil {
		return fmt.Errorf("insert rejected owner: %w", err)
	}

	// Kebijakan refund
	if _, err := tx.Exec(ctx, `
		INSERT INTO refund_policies (id, organization_id, name, policy_type, description, version)
		VALUES ($1, $2, 'Kebijakan Refund Standar', 'tiered',
			'Refund bertingkat berdasarkan jarak hari ke hari event.', 1)
	`, refundPolicyID, orgID); err != nil {
		return fmt.Errorf("insert refund policy: %w", err)
	}
	for _, rule := range []struct {
		min, max int
		percent  int
	}{
		{30, 0, 70},
		{14, 29, 50},
		{7, 13, 25},
		{0, 6, 0},
	} {
		rule := rule
		var max any = rule.max
		if rule.min == 30 {
			max = nil
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO refund_policy_rules (policy_id, days_before_event_min, days_before_event_max, refund_percent)
			VALUES ($1, $2, $3, $4)
		`, refundPolicyID, rule.min, max, rule.percent); err != nil {
			return fmt.Errorf("insert refund rule: %w", err)
		}
	}

	// Event
	events := []eventRow{
		{
			ID: eventSundoroID, OrgID: orgID, EventType: "native",
			Title: "Sundoro Trail Challenge", Slug: "sundoro-trail-challenge",
			Description:  "Menantang punggungan Sundoro dengan jalur vulkanik dan hutan pinus. Tersedia kategori 21K, 42K, dan 100K.",
			LocationName: "Basecamp Sundoro, Wonosobo", Province: "Jawa Tengah", City: "Wonosobo",
			Latitude: -7.3, Longitude: 109.99, StartDays: 45, EndDays: 45,
			RegOpenDays: -10, RegCloseDays: 30, Status: "published", Featured: true,
			Terms: "Peserta wajib membawa mandatory gear yang ditentukan.", RefundPolicyID: refundPolicyID,
			PublishedAt: ptrTime(now.AddDate(0, 0, -20)), CreatedAt: ptrTime(now.AddDate(0, 0, -30)),
		},
		{
			ID: eventRinjaniID, OrgID: orgID, EventType: "native",
			Title: "Rinjani Ultra", Slug: "rinjani-ultra",
			Description:  "Ultra trail 60K mengelilingi Danau Segara Anak dengan elevasi ekstrem.",
			LocationName: "Sembalun, Lombok Timur", Province: "Nusa Tenggara Barat", City: "Lombok Timur",
			Latitude: -8.35, Longitude: 116.4, StartDays: 90, EndDays: 91,
			RegOpenDays: -5, RegCloseDays: 70, Status: "pending_review",
			Terms: "Wajib lolos verifikasi kualifikasi finisher 42K.", RefundPolicyID: refundPolicyID,
			CreatedAt: ptrTime(now.AddDate(0, 0, -5)),
		},
		{
			ID: eventBromoID, OrgID: orgID, EventType: "native",
			Title: "Bromo Tengger Trail", Slug: "bromo-tengger-trail",
			Description:  "Berlari di lautan pasir Bromo dengan latar Gunung Semeru.",
			LocationName: "Cemoro Lawang, Probolinggo", Province: "Jawa Timur", City: "Probolinggo",
			Latitude: -7.94, Longitude: 112.95, StartDays: 70, EndDays: 70,
			RegOpenDays: -30, RegCloseDays: 55, Status: "published",
			Terms: "Suhu dingin, wajib jaket dan buff.", RefundPolicyID: refundPolicyID,
			PublishedAt: ptrTime(now.AddDate(0, 0, -40)), CreatedAt: ptrTime(now.AddDate(0, 0, -50)),
		},
		{
			ID: eventMerbabuID, OrgID: orgID, EventType: "native",
			Title: "Merbabu Sky Race", Slug: "merbabu-sky-race",
			Description:  "Draft event untuk menguji alur pembuatan event organizer.",
			LocationName: "Seloliman, Mojokerto", Province: "Jawa Timur", City: "Mojokerto",
			Latitude: -7.45, Longitude: 112.45, StartDays: 120, EndDays: 120,
			RegOpenDays: 10, RegCloseDays: 100, Status: "draft",
			Terms: "Detail menyusul.", RefundPolicyID: refundPolicyID,
			CreatedAt: ptrTime(now.AddDate(0, 0, -2)),
		},
		{
			ID: eventSemeruID, EventType: "external",
			Title: "Tapak Tilas Semeru", Slug: "tapak-tilas-semeru",
			Description:  "Event eksternal yang dikurasi admin. Pendaftaran di website penyelenggara.",
			LocationName: "Ranupane, Lumajang", Province: "Jawa Timur", City: "Lumajang",
			Latitude: -8.1, Longitude: 112.92, StartDays: 60, EndDays: 61,
			Status: "published", ExternalURL: "https://example.com/tapak-tilas-semeru",
			Terms: "Informasi lengkap di website penyelenggara.", SourceUpdatedAt: ptrTime(now.AddDate(0, 0, -3)),
			PublishedAt: ptrTime(now.AddDate(0, 0, -3)), CreatedAt: ptrTime(now.AddDate(0, 0, -6)),
		},
		{
			ID: eventSumbaID, EventType: "external",
			Title: "Sumba Trail Festival", Slug: "sumba-trail-festival",
			Description:  "Festival trail di padang savana Sumba. Dikelola pihak ketiga.",
			LocationName: "Waikabubak", Province: "Nusa Tenggara Timur", City: "Sumba Barat",
			Latitude: -9.63, Longitude: 119.42, StartDays: 110, EndDays: 111,
			Status: "published", ExternalURL: "https://example.com/sumba-trail",
			Terms: "Informasi lengkap di website penyelenggara.", SourceUpdatedAt: ptrTime(now.AddDate(0, 0, -1)),
			PublishedAt: ptrTime(now.AddDate(0, 0, -1)), CreatedAt: ptrTime(now.AddDate(0, 0, -4)),
		},
	}
	for _, e := range events {
		if err := insertEvent(ctx, tx, e); err != nil {
			return err
		}
	}

	// Kategori event Sundoro
	sundoroCategories := []categoryRow{
		{ID: "00000000-0000-0000-0000-000000000101", EventID: eventSundoroID, Name: "21K", Distance: 21.5, Elevation: 1200, Difficulty: "moderate", Price: 450000, Quota: 300, MinAge: 18, Cutoff: 360, Prefix: "SD21", BibStart: 1, BibEnd: 300},
		{ID: "00000000-0000-0000-0000-000000000102", EventID: eventSundoroID, Name: "42K", Distance: 42.2, Elevation: 2400, Difficulty: "hard", Price: 750000, Quota: 200, MinAge: 18, Cutoff: 720, Qual: true, Prefix: "SD42", BibStart: 1, BibEnd: 200},
		{ID: "00000000-0000-0000-0000-000000000103", EventID: eventSundoroID, Name: "100K", Distance: 102.0, Elevation: 4800, Difficulty: "extreme", Price: 1500000, Quota: 100, MinAge: 20, Cutoff: 1800, Qual: true, Prefix: "SD100", BibStart: 1, BibEnd: 100},
	}
	for _, c := range sundoroCategories {
		if err := insertCategory(ctx, tx, c); err != nil {
			return err
		}
	}

	// Kategori event lain
	otherCategories := []categoryRow{
		{ID: "00000000-0000-0000-0000-000000000201", EventID: eventRinjaniID, Name: "60K", Distance: 60, Elevation: 3800, Difficulty: "extreme", Price: 1250000, Quota: 150, MinAge: 20, Cutoff: 1200, Qual: true, Prefix: "RJ60", BibStart: 1, BibEnd: 150},
		{ID: "00000000-0000-0000-0000-000000000301", EventID: eventBromoID, Name: "30K", Distance: 30, Elevation: 900, Difficulty: "moderate", Price: 550000, Quota: 250, MinAge: 18, Cutoff: 480, Prefix: "BR30", BibStart: 1, BibEnd: 250},
		{ID: "00000000-0000-0000-0000-000000000302", EventID: eventBromoID, Name: "50K", Distance: 50, Elevation: 1600, Difficulty: "hard", Price: 850000, Quota: 150, MinAge: 18, Cutoff: 780, Qual: true, Prefix: "BR50", BibStart: 1, BibEnd: 150},
		{ID: "00000000-0000-0000-0000-000000000401", EventID: eventMerbabuID, Name: "25K", Distance: 25, Elevation: 1100, Difficulty: "moderate", Price: 400000, Quota: 200, MinAge: 18, Cutoff: 420, Prefix: "MB25", BibStart: 1, BibEnd: 200},
	}
	for _, c := range otherCategories {
		if err := insertCategory(ctx, tx, c); err != nil {
			return err
		}
	}

	// Syarat kualifikasi
	requirements := []struct {
		ID, CategoryID, Type, Label, Description string
		Required                                 bool
		Order                                    int
	}{
		{"00000000-0000-0000-0000-000000000111", "00000000-0000-0000-0000-000000000102", "finisher_certificate", "Sertifikat finisher 21K+", "Unggah sertifikat finisher minimal 21K dalam 24 bulan terakhir.", true, 1},
		{"00000000-0000-0000-0000-000000000112", "00000000-0000-0000-0000-000000000102", "medical_certificate", "Surat sehat", "Surat keterangan sehat dari dokter maksimal 6 bulan terakhir.", true, 2},
		{"00000000-0000-0000-0000-000000000113", "00000000-0000-0000-0000-000000000103", "finisher_certificate", "Sertifikat finisher 42K+", "Unggah sertifikat finisher minimal 42K dalam 24 bulan terakhir.", true, 1},
		{"00000000-0000-0000-0000-000000000114", "00000000-0000-0000-0000-000000000103", "race_result_link", "Tautan hasil race", "Tautan hasil race (ITRA/Strava/website resmi).", true, 2},
		{"00000000-0000-0000-0000-000000000115", "00000000-0000-0000-0000-000000000103", "medical_certificate", "Surat sehat", "Surat keterangan sehat dari dokter maksimal 6 bulan terakhir.", true, 3},
	}
	for _, r := range requirements {
		r := r
		if _, err := tx.Exec(ctx, `
			INSERT INTO qualification_requirements (id, category_id, requirement_type, label, description, is_required, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, r.ID, r.CategoryID, r.Type, r.Label, r.Description, r.Required, r.Order); err != nil {
			return fmt.Errorf("insert requirement: %w", err)
		}
	}

	// Form fields event Sundoro
	fields := []struct {
		ID, Key, Label, Type string
		Options              []string
		Required, Sensitive  bool
		Order                int
	}{
		{"00000000-0000-0000-0000-000000000121", "jersey_size", "Ukuran jersey", "select", []string{"S", "M", "L", "XL", "XXL"}, true, false, 1},
		{"00000000-0000-0000-0000-000000000122", "emergency_contact_name", "Nama kontak darurat", "text", nil, true, true, 2},
		{"00000000-0000-0000-0000-000000000123", "emergency_contact_phone", "Nomor kontak darurat", "text", nil, true, true, 3},
		{"00000000-0000-0000-0000-000000000124", "running_club", "Komunitas lari", "text", nil, false, false, 4},
		{"00000000-0000-0000-0000-000000000125", "medical_history", "Riwayat penyakit", "textarea", nil, false, true, 5},
	}
	for _, f := range fields {
		f := f
		options, _ := json.Marshal(f.Options)
		if f.Options == nil {
			options = []byte("[]")
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO registration_form_fields (id, event_id, field_key, label, field_type, options, is_required, is_sensitive, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
		`, f.ID, eventSundoroID, f.Key, f.Label, f.Type, string(options), f.Required, f.Sensitive, f.Order); err != nil {
			return fmt.Errorf("insert form field: %w", err)
		}
	}

	// User tambahan untuk pendaftaran demo
	userIDs := []string{attendeeID}
	names := []string{
		"Bagas Saputra", "Citra Kirana", "Dimas Prakoso", "Eka Wulandari", "Fajar Nugroho",
		"Gita Lestari", "Hendra Wijaya", "Intan Permata", "Joko Susilo", "Kartika Sari",
		"Lukman Hakim", "Maya Anggraini", "Naufal Rizky", "Oki Setiana", "Putri Handayani",
		"Qori Amalia", "Raka Aditya", "Sinta Dewi", "Taufik Hidayat", "Umi Kalsum",
		"Vina Oktaviani", "Wahyu Pratama", "Yoga Pratama", "Zahra Nabila", "Ayu Lestari",
		"Bima Arya", "Cahya Putri", "Doni Setiawan", "Eva Marlina", "Farid Maulana",
		"Gina Sonia", "Hana Fauziah",
	}
	for i, name := range names {
		id := uuid.NewString()
		userIDs = append(userIDs, id)
		if err := insertUser(ctx, tx, userRow{
			ID: id, Email: fmt.Sprintf("pelari%02d@jejak.local", i+1), PasswordHash: passwordHash,
			FullName: name, Phone: nil, BirthDate: date(1990+i%8, time.Month((i%12)+1), (i%27)+1),
			Gender: genderFor(i), EmergencyName: "Kontak Darurat", EmergencyPhone: fmt.Sprintf("0812555%04d", i),
			VerifiedAt: ptrTime(now.AddDate(0, 0, -30-i)), CreatedAt: now.AddDate(0, 0, -30-i),
		}); err != nil {
			return err
		}
	}

	// Pendaftaran demo untuk event Sundoro
	type regPlan struct {
		count    int
		statuses []string
	}
	plans := []struct {
		categoryID string
		prefix     string
		price      int64
		statuses   []string
	}{
		{"00000000-0000-0000-0000-000000000102", "SD42", 750000, []string{
			"paid", "paid", "paid", "paid", "paid", "paid", "paid", "paid",
			"checked_in", "checked_in", "checked_in",
			"awaiting_payment", "awaiting_payment", "awaiting_payment",
			"pending_verification", "pending_verification",
			"approved", "approved",
			"rejected", "waitlisted", "expired", "refunded", "cancelled",
		}},
		{"00000000-0000-0000-0000-000000000101", "SD21", 450000, []string{
			"paid", "paid", "paid", "awaiting_payment", "pending_verification",
		}},
		{"00000000-0000-0000-0000-000000000103", "SD100", 1500000, []string{
			"paid", "paid",
		}},
	}

	userIndex := 0
	for _, plan := range plans {
		for i, status := range plan.statuses {
			if userIndex >= len(userIDs) {
				break
			}
			userID := userIDs[userIndex]
			userIndex++

			reg := registrationRow{
				UserID: userID, EventID: eventSundoroID, CategoryID: plan.categoryID,
				Status: status, PriceAmount: plan.price, RefundPolicyID: refundPolicyID,
				RefundPolicyVersion: 1,
			}
			if status == "checked_in" {
				reg.Status = "checked_in"
			}
			reg.FullName = names[(userIndex-1)%len(names)]
			reg.BirthDate = date(1990+(userIndex%8), time.Month((userIndex%12)+1), (userIndex%27)+1)

			if err := insertRegistration(ctx, tx, reg, plan.prefix, i+1, now); err != nil {
				return err
			}
		}
	}

	// Notifikasi contoh untuk attendee utama
	for i, n := range []struct {
		title, body, key string
	}{
		{"Pendaftaran disetujui", "Dokumen kualifikasi Anda sesuai. Silakan lanjutkan pembayaran.", "registration.approved"},
		{"Pembayaran berhasil", "Tiket QR dan BIB Anda sudah aktif. Cek menu Tiket.", "registration.paid"},
	} {
		if _, err := tx.Exec(ctx, `
			INSERT INTO notifications (recipient_type, recipient_id, channel, template_key, title, body, status, read_at, sent_at, created_at)
			VALUES ('attendee', $1, 'email', $2, $3, $4, 'sent', $5, $6, $6)
		`, attendeeID, n.key, n.title, n.body, nil, now.Add(-time.Duration(i+1)*time.Hour)); err != nil {
			return fmt.Errorf("insert notification: %w", err)
		}
	}

	// Audit log contoh
	if _, err := tx.Exec(ctx, `
		INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id, after_data, ip_address, created_at)
		VALUES ('admin', $1, 'Sekar Ayu Larasati', 'organization.verify', 'organizations', $2, $3::jsonb, '127.0.0.1', $4)
	`, adminID, orgID, `{"verification_status":"verified"}`, now.AddDate(0, 0, -300)); err != nil {
		return fmt.Errorf("insert audit log: %w", err)
	}

	// Simpan password hash seed agar mudah di-reset
	slog.Info("seed selesai", "events", len(events), "users", len(userIDs))
	return nil
}

type userRow struct {
	ID, Email, PasswordHash, FullName string
	Phone                             *string
	BirthDate                         *time.Time
	Gender                            string
	EmergencyName, EmergencyPhone     string
	VerifiedAt                        *time.Time
	CreatedAt                         time.Time
}

func insertUser(ctx context.Context, tx pgx.Tx, u userRow) error {
	if _, err := tx.Exec(ctx, `
		INSERT INTO users (
			id, email, password_hash, phone, full_name, birth_date, gender,
			emergency_contact_name, emergency_contact_phone, email_verified_at, created_at
		) VALUES ($1, lower($2), $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, u.ID, u.Email, u.PasswordHash, u.Phone, u.FullName, u.BirthDate, u.Gender,
		u.EmergencyName, u.EmergencyPhone, u.VerifiedAt, u.CreatedAt); err != nil {
		return fmt.Errorf("insert user %s: %w", u.Email, err)
	}
	return nil
}

type organizationRow struct {
	ID, Name, OrgType, OfficialEmail, Phone, Address, Province, City string
	Verification                                                     string
	VerifiedBy                                                       string
	VerifiedAt                                                       *time.Time
	RejectionReason                                                  *string
	CreatedAt                                                        time.Time
}

func insertOrganization(ctx context.Context, tx pgx.Tx, o organizationRow) error {
	var verifiedBy any
	if o.VerifiedBy != "" {
		verifiedBy = o.VerifiedBy
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO organizations (
			id, name, org_type, official_email, phone, address, province, city,
			verification_status, verified_by, verified_at, rejection_reason, created_at
		) VALUES ($1, $2, $3, lower($4), $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`, o.ID, o.Name, o.OrgType, o.OfficialEmail, o.Phone, o.Address, o.Province, o.City,
		o.Verification, verifiedBy, o.VerifiedAt, o.RejectionReason, o.CreatedAt); err != nil {
		return fmt.Errorf("insert organization %s: %w", o.Name, err)
	}
	return nil
}

type eventRow struct {
	ID, OrgID, EventType, Title, Slug, Description, LocationName, Province, City string
	Latitude, Longitude                                                          float64
	StartDays, EndDays, RegOpenDays, RegCloseDays                                int
	Status, ExternalURL, Terms, RefundPolicyID                                   string
	Featured                                                                     bool
	PublishedAt, SourceUpdatedAt, CreatedAt                                      *time.Time
}

func insertEvent(ctx context.Context, tx pgx.Tx, e eventRow) error {
	start := atHour(time.Now().UTC().AddDate(0, 0, e.StartDays), 22)
	end := atHour(time.Now().UTC().AddDate(0, 0, e.EndDays+1), 10)
	var regOpen, regClose any
	if e.RegOpenDays != 0 {
		t := atHour(time.Now().UTC().AddDate(0, 0, e.RegOpenDays), 9)
		regOpen = t
	}
	if e.RegCloseDays != 0 {
		t := atHour(time.Now().UTC().AddDate(0, 0, e.RegCloseDays), 23)
		regClose = t
	}
	var orgID any
	if e.OrgID != "" {
		orgID = e.OrgID
	}
	var externalURL any
	if e.ExternalURL != "" {
		externalURL = e.ExternalURL
	}
	var refundPolicyID any
	if e.RefundPolicyID != "" {
		refundPolicyID = e.RefundPolicyID
	}
	var createdAt time.Time
	if e.CreatedAt != nil {
		createdAt = *e.CreatedAt
	} else {
		createdAt = time.Now().UTC()
	}

	routeProfile := `[{"km":0,"elevation":1200},{"km":5,"elevation":1800},{"km":10,"elevation":2400},{"km":15,"elevation":2100},{"km":21,"elevation":1500}]`
	mandatoryGear := `["Jaket tahan angin","Buff","Headlamp","Botol minum 1L","Emergency blanket"]`

	if e.EventType == "external" {
		routeProfile = `[]`
		mandatoryGear = `[]`
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO events (
			id, organization_id, event_type, title, slug, description, location_name,
			province, city, latitude, longitude, event_start_at, event_end_at,
			registration_open_at, registration_close_at, status, external_url,
			route_profile, mandatory_gear, terms, is_featured, refund_policy_id,
			published_at, source_updated_at, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18::jsonb, $19::jsonb, $20, $21, $22, $23, $24, $25
		)
	`, e.ID, orgID, e.EventType, e.Title, e.Slug, e.Description, e.LocationName,
		e.Province, e.City, e.Latitude, e.Longitude, start, end, regOpen, regClose,
		e.Status, externalURL, routeProfile, mandatoryGear, e.Terms, e.Featured,
		refundPolicyID, e.PublishedAt, e.SourceUpdatedAt, createdAt); err != nil {
		return fmt.Errorf("insert event %s: %w", e.Title, err)
	}
	return nil
}

type categoryRow struct {
	ID, EventID, Name string
	Distance          float64
	Elevation, Quota  int
	Difficulty        string
	Price             int64
	MinAge, Cutoff    int
	Qual              bool
	Prefix            string
	BibStart, BibEnd  int
}

func insertCategory(ctx context.Context, tx pgx.Tx, c categoryRow) error {
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_categories (
			id, event_id, name, distance_km, elevation_gain_m, difficulty, price,
			quota, min_age, cutoff_minutes, requires_qualification, bib_prefix,
			bib_start, bib_end, bib_next
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1)
	`, c.ID, c.EventID, c.Name, c.Distance, c.Elevation, c.Difficulty, c.Price,
		c.Quota, c.MinAge, c.Cutoff, c.Qual, c.Prefix, c.BibStart, c.BibEnd); err != nil {
		return fmt.Errorf("insert category %s: %w", c.Name, err)
	}
	return nil
}

type registrationRow struct {
	UserID, EventID, CategoryID, Status string
	FullName                            string
	BirthDate                           *time.Time
	PriceAmount                         int64
	RefundPolicyID                      string
	RefundPolicyVersion                 int
}

func insertRegistration(ctx context.Context, tx pgx.Tx, r registrationRow, prefix string, seq int, now time.Time) error {
	regID := uuid.NewString()
	submittedAt := now.Add(-time.Duration(seq) * 45 * time.Minute)

	var reviewedAt, rejectionReason, paymentDeadline, approvedAt, paidAt, dataLockedAt, waitlistPosition any
	var bibNumber any
	var status = r.Status

	switch status {
	case "pending_verification":
		// submitted saja
	case "approved":
		approvedAt = submittedAt.Add(2 * time.Hour)
		reviewedAt = approvedAt
	case "awaiting_payment":
		approvedAt = submittedAt.Add(2 * time.Hour)
		reviewedAt = approvedAt
		paymentDeadline = now.Add(20 * time.Hour)
	case "paid", "checked_in":
		approvedAt = submittedAt.Add(2 * time.Hour)
		reviewedAt = approvedAt
		paidAt = submittedAt.Add(4 * time.Hour)
		dataLockedAt = paidAt
		bibNumber = fmt.Sprintf("%s-%04d", prefix, seq)
	case "rejected":
		reviewedAt = submittedAt.Add(3 * time.Hour)
		rejectionReason = "Sertifikat finisher tidak sesuai ketentuan."
	case "waitlisted":
		waitlistPosition = seq
	case "expired":
		approvedAt = submittedAt.Add(2 * time.Hour)
		reviewedAt = approvedAt
		paymentDeadline = now.Add(-2 * time.Hour)
	case "refunded":
		approvedAt = submittedAt.Add(2 * time.Hour)
		reviewedAt = approvedAt
		paidAt = submittedAt.Add(4 * time.Hour)
		dataLockedAt = paidAt
		bibNumber = fmt.Sprintf("%s-%04d", prefix, seq)
	case "cancelled":
		// tidak ada aksi
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO registrations (
			id, user_id, event_id, category_id, status, full_name_snapshot,
			birth_date_snapshot, price_amount, waitlist_position, submitted_at,
			reviewed_at, rejection_reason, payment_deadline_at, approved_at,
			paid_at, data_locked_at, bib_number, refund_policy_id,
			refund_policy_version, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18, $19, $10
		)
	`, regID, r.UserID, r.EventID, r.CategoryID, status, r.FullName, r.BirthDate,
		r.PriceAmount, waitlistPosition, submittedAt, reviewedAt, rejectionReason,
		paymentDeadline, approvedAt, paidAt, dataLockedAt, bibNumber,
		r.RefundPolicyID, r.RefundPolicyVersion); err != nil {
		return fmt.Errorf("insert registration: %w", err)
	}

	// Status log awal
	if _, err := tx.Exec(ctx, `
		INSERT INTO registration_status_logs (registration_id, from_status, to_status, actor_type, actor_name, note, created_at)
		VALUES ($1, NULL, $2, 'system', 'Seed', 'Data demo', $3)
	`, regID, status, submittedAt); err != nil {
		return fmt.Errorf("insert status log: %w", err)
	}

	// Pembayaran untuk status yang relevan
	if status == "awaiting_payment" || status == "paid" || status == "checked_in" || status == "expired" || status == "refunded" {
		paymentStatus := "pending"
		var paidAtAny any
		switch status {
		case "paid", "checked_in", "refunded":
			paymentStatus = "paid"
			paidAtAny = paidAt
		case "expired":
			paymentStatus = "expired"
		}

		paymentID := uuid.NewString()
		orderID := fmt.Sprintf("JT-SEED-%s-%04d", prefix, seq)
		expiresAt := now.Add(20 * time.Hour)
		if status == "expired" {
			expiresAt = now.Add(-48 * time.Hour)
		}
		platformFee := r.PriceAmount * 3 / 100
		gatewayFee := r.PriceAmount * 14 / 1000
		if _, err := tx.Exec(ctx, `
			INSERT INTO payments (
				id, registration_id, order_id, gateway, method, amount, platform_fee,
				gateway_fee, status, expires_at, paid_at, created_at
			) VALUES ($1, $2, $3, 'mock', 'va', $4, $5, $6, $7, $8, $9, $10)
		`, paymentID, regID, orderID, r.PriceAmount, platformFee, gatewayFee,
			paymentStatus, expiresAt, paidAtAny, submittedAt.Add(2*time.Hour)); err != nil {
			return fmt.Errorf("insert payment: %w", err)
		}

		if status == "paid" || status == "checked_in" || status == "refunded" {
			ticketID := uuid.NewString()
			qr, _ := crypto.RandomToken(20)
			ticketStatus := "issued"
			if status == "checked_in" {
				ticketStatus = "used"
			}
			if _, err := tx.Exec(ctx, `
				INSERT INTO tickets (id, registration_id, qr_code, status, issued_at)
				VALUES ($1, $2, $3, $4, $5)
			`, ticketID, regID, "JT-"+qr, ticketStatus, paidAt); err != nil {
				return fmt.Errorf("insert ticket: %w", err)
			}

			if status == "checked_in" {
				if _, err := tx.Exec(ctx, `
					INSERT INTO racepack_checkins (ticket_id, checked_in_by, pickup_type, scanned_at, synced_at)
					VALUES ($1, $2, 'self', $3, $3)
				`, ticketID, organizerID, now.Add(-90*time.Minute)); err != nil {
					return fmt.Errorf("insert checkin: %w", err)
				}
			}

			if status == "refunded" {
				if _, err := tx.Exec(ctx, `
					UPDATE payments SET status = 'refunded' WHERE id = $1
				`, paymentID); err != nil {
					return fmt.Errorf("update refunded payment: %w", err)
				}
				if _, err := tx.Exec(ctx, `
					INSERT INTO refunds (payment_id, registration_id, amount, reason_type, status, fee_borne_by, requested_at, processed_at)
					VALUES ($1, $2, $3, 'participant_cancel', 'refunded', 'platform', $4, $5)
				`, paymentID, regID, r.PriceAmount*70/100, now.Add(-24*time.Hour), now.Add(-20*time.Hour)); err != nil {
					return fmt.Errorf("insert refund: %w", err)
				}
			}
		}
	}

	return nil
}

func date(year int, month time.Month, day int) *time.Time {
	t := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	return &t
}

func atHour(t time.Time, hour int) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, hour, 0, 0, 0, time.UTC)
}

func genderFor(i int) string {
	if i%2 == 0 {
		return "male"
	}
	return "female"
}

func ptrString(v string) *string     { return &v }
func ptrTime(v time.Time) *time.Time { return &v }
