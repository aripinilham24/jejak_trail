package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/aripinilham/jejak_trail/backend/internal/config"
	"github.com/aripinilham/jejak_trail/backend/internal/db"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/notification"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/crypto"
)

type Service struct {
	db     *db.DB
	q      *gen.Queries
	tokens *TokenManager
	cfg    *config.Config
	enc    *crypto.Encryptor
	mailer notification.Mailer
	log    *slog.Logger
}

func NewService(
	database *db.DB,
	tokens *TokenManager,
	cfg *config.Config,
	enc *crypto.Encryptor,
	mailer notification.Mailer,
	log *slog.Logger,
) *Service {
	return &Service{
		db:     database,
		q:      gen.New(database.Pool),
		tokens: tokens,
		cfg:    cfg,
		enc:    enc,
		mailer: mailer,
		log:    log,
	}
}

type SessionMeta struct {
	IP        string
	UserAgent string
}

type RegisterAttendeeInput struct {
	Email                 string
	Password              string
	FullName              string
	Phone                 *string
	BirthDate             *string
	Gender                *string
	EmergencyContactName  *string
	EmergencyContactPhone *string
}

type RegisterOrganizerInput struct {
	OrganizationName   string
	OrgType            string
	OrganizationEmail  string
	OrganizationPhone  string
	Address            string
	Province           string
	City               string
	LegalDocKey        *string
	OwnerEmail         string
	OwnerPassword      string
	OwnerFullName      string
	OwnerPhone         *string
	OwnerPositionTitle *string
	BankName           string
	BankAccountNumber  string
	BankAccountHolder  string
}

type LoginInput struct {
	Email       string
	Password    string
	AccountType string
}

type UpdateProfileInput struct {
	FullName              string
	Phone                 *string
	BirthDate             *string
	Gender                *string
	EmergencyContactName  *string
	EmergencyContactPhone *string
}

func (s *Service) RegisterAttendee(ctx context.Context, in RegisterAttendeeInput, meta SessionMeta) (AuthResponse, string, error) {
	if fields := validateAttendeeRegistration(in); len(fields) > 0 {
		return AuthResponse{}, "", apperr.Validation(fields)
	}

	email := strings.ToLower(strings.TrimSpace(in.Email))
	if _, err := s.q.GetUserByEmail(ctx, email); err == nil {
		return AuthResponse{}, "", apperr.Validation(map[string]string{"email": "Email sudah terdaftar."})
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	hash, err := crypto.HashPassword(in.Password)
	if err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	birthDate, err := parseDate(in.BirthDate)
	if err != nil {
		return AuthResponse{}, "", apperr.Validation(map[string]string{"birthDate": "Format tanggal harus YYYY-MM-DD."})
	}

	user, err := s.q.CreateUser(ctx, gen.CreateUserParams{
		Email:                 email,
		PasswordHash:          hash,
		Phone:                 in.Phone,
		FullName:              strings.TrimSpace(in.FullName),
		BirthDate:             birthDate,
		Gender:                in.Gender,
		EmergencyContactName:  in.EmergencyContactName,
		EmergencyContactPhone: in.EmergencyContactPhone,
		EmailVerifiedAt:       nil,
	})
	if err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	s.sendEmailVerification(ctx, user.ID.String(), user.Email)

	resp, refresh, err := s.issueSession(ctx, AccountAttendee, user.ID.String(), "", "", meta)
	if err != nil {
		return AuthResponse{}, "", err
	}
	return resp, refresh, nil
}

func (s *Service) RegisterOrganizer(ctx context.Context, in RegisterOrganizerInput, meta SessionMeta) (AuthResponse, string, error) {
	if fields := validateOrganizerRegistration(in); len(fields) > 0 {
		return AuthResponse{}, "", apperr.Validation(fields)
	}
	if s.enc == nil {
		return AuthResponse{}, "", apperr.Internal(fmt.Errorf("ENCRYPTION_KEY belum dikonfigurasi"))
	}

	email := strings.ToLower(strings.TrimSpace(in.OwnerEmail))
	if _, err := s.q.GetOrganizerByEmail(ctx, email); err == nil {
		return AuthResponse{}, "", apperr.Validation(map[string]string{"owner.email": "Email sudah terdaftar sebagai organizer."})
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	passwordHash, err := crypto.HashPassword(in.OwnerPassword)
	if err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	accountNumber := strings.ReplaceAll(strings.TrimSpace(in.BankAccountNumber), " ", "")
	encrypted, err := s.enc.Encrypt(accountNumber)
	if err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}
	last4 := accountNumber
	if len(last4) > 4 {
		last4 = last4[len(last4)-4:]
	}

	var owner gen.OrganizerAccount
	err = s.db.WithTx(ctx, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)

		org, err := q.CreateOrganization(ctx, gen.CreateOrganizationParams{
			Name:          strings.TrimSpace(in.OrganizationName),
			OrgType:       in.OrgType,
			OfficialEmail: strings.ToLower(strings.TrimSpace(in.OrganizationEmail)),
			Phone:         strings.TrimSpace(in.OrganizationPhone),
			Address:       strings.TrimSpace(in.Address),
			Province:      strings.TrimSpace(in.Province),
			City:          strings.TrimSpace(in.City),
			LegalDocKey:   in.LegalDocKey,
		})
		if err != nil {
			return err
		}

		owner, err = q.CreateOrganizerAccount(ctx, gen.CreateOrganizerAccountParams{
			OrganizationID: org.ID,
			Email:          email,
			PasswordHash:   passwordHash,
			FullName:       strings.TrimSpace(in.OwnerFullName),
			Phone:          in.OwnerPhone,
			PositionTitle:  in.OwnerPositionTitle,
			OrgRole:        RoleOwner,
			Status:         "active",
		})
		if err != nil {
			return err
		}

		_, err = q.CreateBankAccount(ctx, gen.CreateBankAccountParams{
			OrganizationID:         org.ID,
			BankName:               strings.TrimSpace(in.BankName),
			AccountNumberEncrypted: encrypted,
			AccountNumberLast4:     last4,
			AccountHolder:          strings.TrimSpace(in.BankAccountHolder),
		})
		return err
	})
	if err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	resp, refresh, err := s.issueSession(ctx, AccountOrganizer, owner.ID.String(), owner.OrgRole, owner.OrganizationID.String(), meta)
	if err != nil {
		return AuthResponse{}, "", err
	}
	return resp, refresh, nil
}

func (s *Service) Login(ctx context.Context, in LoginInput, meta SessionMeta) (AuthResponse, string, error) {
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if email == "" || in.Password == "" {
		return AuthResponse{}, "", apperr.Validation(map[string]string{
			"email":    "Email wajib diisi.",
			"password": "Password wajib diisi.",
		})
	}

	generic := apperr.Unauthorized("Email atau password salah.")

	switch in.AccountType {
	case AccountAttendee:
		user, err := s.q.GetUserByEmail(ctx, email)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return AuthResponse{}, "", generic
			}
			return AuthResponse{}, "", apperr.Internal(err)
		}
		if user.Status != "active" {
			return AuthResponse{}, "", apperr.Forbidden("Akun ini sedang ditangguhkan.")
		}
		ok, err := crypto.VerifyPassword(user.PasswordHash, in.Password)
		if err != nil || !ok {
			return AuthResponse{}, "", generic
		}
		resp, refresh, err := s.issueSession(ctx, AccountAttendee, user.ID.String(), "", "", meta)
		return resp, refresh, err

	case AccountOrganizer:
		organizer, err := s.q.GetOrganizerByEmail(ctx, email)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return AuthResponse{}, "", generic
			}
			return AuthResponse{}, "", apperr.Internal(err)
		}
		if organizer.Status != "active" {
			return AuthResponse{}, "", apperr.Forbidden("Akun organizer ini sedang tidak aktif.")
		}
		ok, err := crypto.VerifyPassword(organizer.PasswordHash, in.Password)
		if err != nil || !ok {
			return AuthResponse{}, "", generic
		}
		resp, refresh, err := s.issueSession(ctx, AccountOrganizer, organizer.ID.String(), organizer.OrgRole, organizer.OrganizationID.String(), meta)
		return resp, refresh, err

	case AccountAdmin:
		admin, err := s.q.GetAdminByEmail(ctx, email)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return AuthResponse{}, "", generic
			}
			return AuthResponse{}, "", apperr.Internal(err)
		}
		if admin.Status != "active" {
			return AuthResponse{}, "", apperr.Forbidden("Akun admin ini sedang tidak aktif.")
		}
		ok, err := crypto.VerifyPassword(admin.PasswordHash, in.Password)
		if err != nil || !ok {
			return AuthResponse{}, "", generic
		}
		resp, refresh, err := s.issueSession(ctx, AccountAdmin, admin.ID.String(), admin.AdminRole, "", meta)
		return resp, refresh, err

	default:
		return AuthResponse{}, "", apperr.Validation(map[string]string{
			"accountType": "Pilih accountType: attendee, organizer, atau admin.",
		})
	}
}

func (s *Service) Refresh(ctx context.Context, rawToken string, meta SessionMeta) (AuthResponse, string, error) {
	if rawToken == "" {
		return AuthResponse{}, "", apperr.Unauthorized("Refresh token tidak ditemukan.")
	}

	existing, err := s.q.GetRefreshTokenByHash(ctx, HashToken(rawToken))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return AuthResponse{}, "", apperr.Unauthorized("Sesi tidak valid. Silakan login ulang.")
		}
		return AuthResponse{}, "", apperr.Internal(err)
	}

	if existing.RevokedAt != nil {
		// Token lama dipakai lagi: indikasi pencurian token. Revoke seluruh family.
		_ = s.q.RevokeRefreshTokenFamily(ctx, existing.FamilyID)
		s.log.Warn("refresh token reuse terdeteksi", "subject_id", existing.SubjectID)
		return AuthResponse{}, "", apperr.Unauthorized("Sesi tidak valid. Silakan login ulang.")
	}
	if time.Now().After(existing.ExpiresAt) {
		return AuthResponse{}, "", apperr.Unauthorized("Sesi sudah kedaluwarsa. Silakan login ulang.")
	}

	role, orgID, err := s.subjectRole(ctx, existing.SubjectType, existing.SubjectID.String())
	if err != nil {
		return AuthResponse{}, "", err
	}

	newRaw, err := crypto.RandomToken(32)
	if err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	err = s.db.WithTx(ctx, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		if err := q.RevokeRefreshToken(ctx, existing.ID); err != nil {
			return err
		}
		_, err := q.CreateRefreshToken(ctx, gen.CreateRefreshTokenParams{
			SubjectType: existing.SubjectType,
			SubjectID:   existing.SubjectID,
			TokenHash:   HashToken(newRaw),
			FamilyID:    existing.FamilyID,
			ExpiresAt:   time.Now().Add(s.cfg.RefreshTokenTTL),
			IpAddress:   stringPtr(meta.IP),
			UserAgent:   stringPtr(meta.UserAgent),
		})
		return err
	})
	if err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	access, expiresIn, err := s.tokens.IssueAccess(existing.SubjectID.String(), existing.SubjectType, role, orgID)
	if err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}
	identity, err := s.identity(ctx, existing.SubjectType, existing.SubjectID.String(), role, orgID)
	if err != nil {
		return AuthResponse{}, "", err
	}

	return AuthResponse{
		AccessToken: access,
		ExpiresIn:   expiresIn,
		Identity:    identity,
	}, newRaw, nil
}

func (s *Service) Logout(ctx context.Context, rawToken string) error {
	if rawToken == "" {
		return nil
	}
	token, err := s.q.GetRefreshTokenByHash(ctx, HashToken(rawToken))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return apperr.Internal(err)
	}
	if err := s.q.RevokeRefreshToken(ctx, token.ID); err != nil {
		return apperr.Internal(err)
	}
	return nil
}

func (s *Service) Me(ctx context.Context, claims *Claims) (Identity, error) {
	return s.identity(ctx, claims.AccountType, claims.Subject, claims.Role, claims.OrganizationID)
}

func (s *Service) UpdateProfile(ctx context.Context, userID string, in UpdateProfileInput) (UserDTO, error) {
	fields := map[string]string{}
	if strings.TrimSpace(in.FullName) == "" {
		fields["fullName"] = "Nama lengkap wajib diisi."
	}
	if in.Gender != nil && *in.Gender != "male" && *in.Gender != "female" {
		fields["gender"] = "Nilai harus male atau female."
	}
	if len(fields) > 0 {
		return UserDTO{}, apperr.Validation(fields)
	}

	birthDate, err := parseDate(in.BirthDate)
	if err != nil {
		return UserDTO{}, apperr.Validation(map[string]string{"birthDate": "Format tanggal harus YYYY-MM-DD."})
	}

	id, err := uuid.Parse(userID)
	if err != nil {
		return UserDTO{}, apperr.Unauthorized("")
	}

	user, err := s.q.UpdateUserProfile(ctx, gen.UpdateUserProfileParams{
		ID:                    id,
		FullName:              strings.TrimSpace(in.FullName),
		Phone:                 in.Phone,
		BirthDate:             birthDate,
		Gender:                in.Gender,
		EmergencyContactName:  in.EmergencyContactName,
		EmergencyContactPhone: in.EmergencyContactPhone,
	})
	if err != nil {
		return UserDTO{}, apperr.Internal(err)
	}
	return toUserDTO(user), nil
}

func (s *Service) VerifyEmail(ctx context.Context, rawToken string) error {
	if rawToken == "" {
		return apperr.BadRequest("Token verifikasi tidak ditemukan.")
	}
	token, err := s.q.GetAuthTokenByHash(ctx, gen.GetAuthTokenByHashParams{
		TokenHash: HashToken(rawToken),
		Purpose:   "email_verification",
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperr.BadRequest("Token verifikasi tidak valid atau sudah kedaluwarsa.")
		}
		return apperr.Internal(err)
	}

	err = s.db.WithTx(ctx, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		if err := q.ConsumeAuthToken(ctx, token.ID); err != nil {
			return err
		}
		return q.SetUserEmailVerified(ctx, token.SubjectID)
	})
	if err != nil {
		return apperr.Internal(err)
	}
	return nil
}

func (s *Service) issueSession(ctx context.Context, accountType, subjectID, role, orgID string, meta SessionMeta) (AuthResponse, string, error) {
	access, expiresIn, err := s.tokens.IssueAccess(subjectID, accountType, role, orgID)
	if err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	raw, err := crypto.RandomToken(32)
	if err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	subjectUUID, err := uuid.Parse(subjectID)
	if err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	if _, err := s.q.CreateRefreshToken(ctx, gen.CreateRefreshTokenParams{
		SubjectType: accountType,
		SubjectID:   subjectUUID,
		TokenHash:   HashToken(raw),
		FamilyID:    uuid.New(),
		ExpiresAt:   time.Now().Add(s.cfg.RefreshTokenTTL),
		IpAddress:   stringPtr(meta.IP),
		UserAgent:   stringPtr(meta.UserAgent),
	}); err != nil {
		return AuthResponse{}, "", apperr.Internal(err)
	}

	identity, err := s.identity(ctx, accountType, subjectID, role, orgID)
	if err != nil {
		return AuthResponse{}, "", err
	}

	return AuthResponse{
		AccessToken: access,
		ExpiresIn:   expiresIn,
		Identity:    identity,
	}, raw, nil
}

func (s *Service) identity(ctx context.Context, accountType, subjectID, role, orgID string) (Identity, error) {
	id, err := uuid.Parse(subjectID)
	if err != nil {
		return Identity{}, apperr.Unauthorized("")
	}

	switch accountType {
	case AccountAttendee:
		user, err := s.q.GetUserByID(ctx, id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return Identity{}, apperr.Unauthorized("Akun tidak ditemukan.")
			}
			return Identity{}, apperr.Internal(err)
		}
		dto := toUserDTO(user)
		return Identity{AccountType: accountType, User: &dto}, nil

	case AccountOrganizer:
		organizer, err := s.q.GetOrganizerByID(ctx, id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return Identity{}, apperr.Unauthorized("Akun organizer tidak ditemukan.")
			}
			return Identity{}, apperr.Internal(err)
		}
		org, err := s.q.GetOrganizationWithEventCount(ctx, organizer.OrganizationID)
		if err != nil {
			return Identity{}, apperr.Internal(err)
		}
		odto := toOrganizerDTO(organizer)
		orgdto := toOrganizationDTO(gen.Organization{
			ID:                 org.ID,
			Name:               org.Name,
			OrgType:            org.OrgType,
			OfficialEmail:      org.OfficialEmail,
			Phone:              org.Phone,
			Address:            org.Address,
			Province:           org.Province,
			City:               org.City,
			LegalDocKey:        org.LegalDocKey,
			VerificationStatus: org.VerificationStatus,
			VerifiedBy:         org.VerifiedBy,
			VerifiedAt:         org.VerifiedAt,
			RejectionReason:    org.RejectionReason,
			Status:             org.Status,
			CreatedAt:          org.CreatedAt,
			UpdatedAt:          org.UpdatedAt,
		}, org.EventCount)
		return Identity{AccountType: accountType, Organizer: &odto, Organization: &orgdto}, nil

	case AccountAdmin:
		admin, err := s.q.GetAdminByID(ctx, id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return Identity{}, apperr.Unauthorized("Akun admin tidak ditemukan.")
			}
			return Identity{}, apperr.Internal(err)
		}
		adto := toAdminDTO(admin)
		return Identity{AccountType: accountType, Admin: &adto}, nil

	default:
		return Identity{}, apperr.Unauthorized("")
	}
}

func (s *Service) subjectRole(ctx context.Context, accountType, subjectID string) (string, string, error) {
	id, err := uuid.Parse(subjectID)
	if err != nil {
		return "", "", apperr.Unauthorized("")
	}

	switch accountType {
	case AccountAttendee:
		user, err := s.q.GetUserByID(ctx, id)
		if err != nil {
			return "", "", apperr.Unauthorized("Sesi tidak valid.")
		}
		if user.Status != "active" {
			return "", "", apperr.Forbidden("Akun ini sedang ditangguhkan.")
		}
		return "", "", nil
	case AccountOrganizer:
		organizer, err := s.q.GetOrganizerByID(ctx, id)
		if err != nil {
			return "", "", apperr.Unauthorized("Sesi tidak valid.")
		}
		if organizer.Status != "active" {
			return "", "", apperr.Forbidden("Akun organizer ini sedang tidak aktif.")
		}
		return organizer.OrgRole, organizer.OrganizationID.String(), nil
	case AccountAdmin:
		admin, err := s.q.GetAdminByID(ctx, id)
		if err != nil {
			return "", "", apperr.Unauthorized("Sesi tidak valid.")
		}
		if admin.Status != "active" {
			return "", "", apperr.Forbidden("Akun admin ini sedang tidak aktif.")
		}
		return admin.AdminRole, "", nil
	default:
		return "", "", apperr.Unauthorized("")
	}
}

func (s *Service) sendEmailVerification(ctx context.Context, userID, email string) {
	raw, err := crypto.RandomToken(32)
	if err != nil {
		s.log.Error("generate token verifikasi", "error", err)
		return
	}
	subjectID, err := uuid.Parse(userID)
	if err != nil {
		s.log.Error("parse user id", "error", err)
		return
	}
	if _, err := s.q.CreateAuthToken(ctx, gen.CreateAuthTokenParams{
		Purpose:     "email_verification",
		SubjectType: AccountAttendee,
		SubjectID:   subjectID,
		TokenHash:   HashToken(raw),
		ExpiresAt:   time.Now().Add(24 * time.Hour),
	}); err != nil {
		s.log.Error("simpan token verifikasi", "error", err)
		return
	}

	link := fmt.Sprintf("%s/api/v1/auth/verify-email?token=%s", s.cfg.AppBaseURL, raw)
	if err := s.mailer.Send(ctx, notification.Message{
		To:      email,
		Subject: "Verifikasi email Jejak Trail",
		Text:    "Halo,\n\nTerima kasih sudah mendaftar di Jejak Trail.\nVerifikasi email Anda melalui tautan berikut:\n\n" + link + "\n\nTautan berlaku 24 jam.",
	}); err != nil {
		s.log.Warn("email verifikasi gagal dikirim", "error", err)
	}
}

func validateAttendeeRegistration(in RegisterAttendeeInput) map[string]string {
	fields := map[string]string{}
	if !validEmail(in.Email) {
		fields["email"] = "Format email tidak valid."
	}
	if len(in.Password) < 8 {
		fields["password"] = "Password minimal 8 karakter."
	}
	if strings.TrimSpace(in.FullName) == "" {
		fields["fullName"] = "Nama lengkap wajib diisi."
	}
	if in.Gender != nil && *in.Gender != "male" && *in.Gender != "female" {
		fields["gender"] = "Nilai harus male atau female."
	}
	if _, err := parseDate(in.BirthDate); err != nil {
		fields["birthDate"] = "Format tanggal harus YYYY-MM-DD."
	}
	return fields
}

func validateOrganizerRegistration(in RegisterOrganizerInput) map[string]string {
	fields := map[string]string{}
	if strings.TrimSpace(in.OrganizationName) == "" {
		fields["organization.name"] = "Nama organisasi wajib diisi."
	}
	if in.OrgType != "community" && in.OrgType != "event_organizer" && in.OrgType != "foundation" {
		fields["organization.orgType"] = "Nilai harus community, event_organizer, atau foundation."
	}
	if !validEmail(in.OrganizationEmail) {
		fields["organization.officialEmail"] = "Format email tidak valid."
	}
	if strings.TrimSpace(in.OrganizationPhone) == "" {
		fields["organization.phone"] = "Nomor telepon wajib diisi."
	}
	if strings.TrimSpace(in.Address) == "" {
		fields["organization.address"] = "Alamat wajib diisi."
	}
	if strings.TrimSpace(in.Province) == "" {
		fields["organization.province"] = "Provinsi wajib diisi."
	}
	if strings.TrimSpace(in.City) == "" {
		fields["organization.city"] = "Kota wajib diisi."
	}
	if !validEmail(in.OwnerEmail) {
		fields["owner.email"] = "Format email tidak valid."
	}
	if len(in.OwnerPassword) < 8 {
		fields["owner.password"] = "Password minimal 8 karakter."
	}
	if strings.TrimSpace(in.OwnerFullName) == "" {
		fields["owner.fullName"] = "Nama lengkap wajib diisi."
	}
	if strings.TrimSpace(in.BankName) == "" {
		fields["bank.bankName"] = "Nama bank wajib diisi."
	}
	if len(strings.ReplaceAll(strings.TrimSpace(in.BankAccountNumber), " ", "")) < 6 {
		fields["bank.accountNumber"] = "Nomor rekening tidak valid."
	}
	if strings.TrimSpace(in.BankAccountHolder) == "" {
		fields["bank.accountHolder"] = "Nama pemilik rekening wajib diisi."
	}
	return fields
}

func validEmail(value string) bool {
	_, err := mail.ParseAddress(strings.TrimSpace(value))
	return err == nil
}

func parseDate(value *string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", strings.TrimSpace(*value))
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func stringPtr(v string) *string {
	if v == "" {
		return nil
	}
	return &v
}
