package registration

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/aripinilham/jejak_trail/backend/internal/config"
	"github.com/aripinilham/jejak_trail/backend/internal/db"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/notification"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/crypto"
	"github.com/aripinilham/jejak_trail/backend/internal/storage"
)

type Service struct {
	db       *db.DB
	q        *gen.Queries
	cfg      *config.Config
	enc      *crypto.Encryptor
	notifier *notification.Notifier
	storage  storage.Storage
	log      *slog.Logger
}

func NewService(
	database *db.DB,
	cfg *config.Config,
	enc *crypto.Encryptor,
	notifier *notification.Notifier,
	store storage.Storage,
	log *slog.Logger,
) *Service {
	return &Service{
		db:       database,
		q:        gen.New(database.Pool),
		cfg:      cfg,
		enc:      enc,
		notifier: notifier,
		storage:  store,
		log:      log,
	}
}

type AnswerInput struct {
	FieldID uuid.UUID
	Value   string
}

type QualificationInput struct {
	RequirementID uuid.UUID
	ValueText     string
	FileKey       string
	ExternalLink  string
}

type SubmitInput struct {
	CategoryID     uuid.UUID
	FullName       string
	BirthDate      string
	Answers        []AnswerInput
	Qualifications []QualificationInput
}

func (s *Service) SubmitByEventSlug(ctx context.Context, userID uuid.UUID, slug string, in SubmitInput) (RegistrationDTO, error) {
	event, err := s.q.GetPublicEventBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return RegistrationDTO{}, apperr.NotFound("Event tidak ditemukan.")
		}
		return RegistrationDTO{}, apperr.Internal(err)
	}
	if event.EventType != "native" || event.Status != "published" {
		return RegistrationDTO{}, apperr.Conflict("Event ini tidak menerima pendaftaran di platform.")
	}
	now := time.Now()
	if event.RegistrationOpenAt != nil && now.Before(*event.RegistrationOpenAt) {
		return RegistrationDTO{}, apperr.Conflict("Pendaftaran belum dibuka.")
	}
	if event.RegistrationCloseAt != nil && now.After(*event.RegistrationCloseAt) {
		return RegistrationDTO{}, apperr.Conflict("Pendaftaran sudah ditutup.")
	}

	category, err := s.q.GetEventCategoryByID(ctx, in.CategoryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return RegistrationDTO{}, apperr.Validation(map[string]string{"categoryId": "Kategori tidak ditemukan."})
		}
		return RegistrationDTO{}, apperr.Internal(err)
	}
	if category.EventID != event.ID {
		return RegistrationDTO{}, apperr.Validation(map[string]string{"categoryId": "Kategori bukan milik event ini."})
	}

	user, err := s.q.GetUserByID(ctx, userID)
	if err != nil {
		return RegistrationDTO{}, apperr.Unauthorized("Akun tidak ditemukan.")
	}
	if user.Status != "active" {
		return RegistrationDTO{}, apperr.Forbidden("Akun ini sedang ditangguhkan.")
	}

	fullName := strings.TrimSpace(in.FullName)
	if fullName == "" {
		fullName = user.FullName
	}

	birthDate := user.BirthDate
	if strings.TrimSpace(in.BirthDate) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(in.BirthDate))
		if err != nil {
			return RegistrationDTO{}, apperr.Validation(map[string]string{"birthDate": "Format tanggal harus YYYY-MM-DD."})
		}
		birthDate = &parsed
	}
	if category.MinAge > 0 {
		if birthDate == nil {
			return RegistrationDTO{}, apperr.Validation(map[string]string{"birthDate": "Tanggal lahir wajib diisi untuk kategori ini."})
		}
		if ageAt(*birthDate, event.EventStartAt) < int(category.MinAge) {
			return RegistrationDTO{}, apperr.Validation(map[string]string{
				"birthDate": fmt.Sprintf("Usia minimal untuk kategori ini adalah %d tahun.", category.MinAge),
			})
		}
	}

	fields, err := s.q.ListRegistrationFormFieldsByEventID(ctx, event.ID)
	if err != nil {
		return RegistrationDTO{}, apperr.Internal(err)
	}
	answers, err := s.validateAnswers(userID, fields, in.Answers)
	if err != nil {
		return RegistrationDTO{}, err
	}

	requirements, err := s.q.ListQualificationRequirementsByCategoryID(ctx, category.ID)
	if err != nil {
		return RegistrationDTO{}, apperr.Internal(err)
	}
	qualifications, err := s.validateQualifications(userID, requirements, category.RequiresQualification, in.Qualifications)
	if err != nil {
		return RegistrationDTO{}, err
	}

	var refundPolicyID *uuid.UUID
	var refundVersion *int32
	if event.RefundPolicyID != nil {
		policy, err := s.q.GetRefundPolicyByID(ctx, *event.RefundPolicyID)
		if err == nil {
			refundPolicyID = &policy.ID
			refundVersion = &policy.Version
		}
	}

	var created gen.Registration
	err = s.db.WithTx(ctx, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)

		locked, err := q.GetEventCategoryForUpdate(ctx, category.ID)
		if err != nil {
			return err
		}
		active, err := q.CountActiveRegistrationsByCategory(ctx, locked.ID)
		if err != nil {
			return err
		}

		status := "pending_verification"
		var waitlistPosition *int32
		var paymentDeadline *time.Time
		var approvedAt *time.Time

		if locked.RequiresQualification {
			if active >= int64(locked.Quota) {
				position, err := q.GetNextWaitlistPosition(ctx, locked.ID)
				if err != nil {
					return err
				}
				status = "waitlisted"
				waitlistPosition = &position
			}
		} else if active >= int64(locked.Quota) {
			position, err := q.GetNextWaitlistPosition(ctx, locked.ID)
			if err != nil {
				return err
			}
			status = "waitlisted"
			waitlistPosition = &position
		} else {
			status = "awaiting_payment"
			deadline := now.Add(s.cfg.PaymentWindow)
			paymentDeadline = &deadline
		}

		submittedAt := now
		reg, err := q.CreateRegistration(ctx, gen.CreateRegistrationParams{
			UserID:              userID,
			EventID:             event.ID,
			CategoryID:          category.ID,
			Status:              status,
			FullNameSnapshot:    fullName,
			BirthDateSnapshot:   birthDate,
			PriceAmount:         locked.Price,
			WaitlistPosition:    waitlistPosition,
			SubmittedAt:         &submittedAt,
			PaymentDeadlineAt:   paymentDeadline,
			ApprovedAt:          approvedAt,
			RefundPolicyID:      refundPolicyID,
			RefundPolicyVersion: refundVersion,
		})
		if err != nil {
			if isUniqueViolation(err) {
				return apperr.Conflict("Anda sudah memiliki pendaftaran aktif untuk event ini.")
			}
			return err
		}
		created = reg

		for _, answer := range answers {
			if _, err := q.CreateRegistrationAnswer(ctx, gen.CreateRegistrationAnswerParams{
				RegistrationID: reg.ID,
				FieldID:        answer.FieldID,
				Value:          answer.Value,
				IsEncrypted:    answer.IsEncrypted,
			}); err != nil {
				return err
			}
		}

		for _, qualification := range qualifications {
			if _, err := q.CreateQualificationSubmission(ctx, gen.CreateQualificationSubmissionParams{
				RegistrationID: reg.ID,
				RequirementID:  qualification.RequirementID,
				ValueText:      optString(qualification.ValueText),
				FileKey:        optString(qualification.FileKey),
				ExternalLink:   optString(qualification.ExternalLink),
			}); err != nil {
				return err
			}
		}

		if status == "awaiting_payment" {
			if _, err := createPendingPayment(ctx, q, s.cfg, reg.ID, locked.Price, *paymentDeadline); err != nil {
				return err
			}
		}

		if _, err := q.CreateRegistrationStatusLog(ctx, gen.CreateRegistrationStatusLogParams{
			RegistrationID: reg.ID,
			FromStatus:     nil,
			ToStatus:       status,
			ActorType:      "user",
			ActorID:        &userID,
			ActorName:      user.FullName,
			Note:           nil,
		}); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if appErr, ok := apperr.As(err); ok {
			return RegistrationDTO{}, appErr
		}
		return RegistrationDTO{}, apperr.Internal(err)
	}

	s.notifyStatus(ctx, created, user.Email, event.Title, nil)
	return s.GetForUser(ctx, userID, created.ID)
}

func (s *Service) ListForUser(ctx context.Context, userID uuid.UUID) ([]RegistrationDTO, error) {
	rows, err := s.q.ListRegistrationsByUser(ctx, userID)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	out := make([]RegistrationDTO, 0, len(rows))
	for _, row := range rows {
		dto := toRegistrationDTO(row)
		s.attachSummary(ctx, &dto, row)
		out = append(out, dto)
	}
	return out, nil
}

func (s *Service) GetForUser(ctx context.Context, userID, registrationID uuid.UUID) (RegistrationDTO, error) {
	row, err := s.q.GetRegistrationByIDForUser(ctx, gen.GetRegistrationByIDForUserParams{
		ID:     registrationID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return RegistrationDTO{}, apperr.NotFound("Pendaftaran tidak ditemukan.")
		}
		return RegistrationDTO{}, apperr.Internal(err)
	}
	return s.buildDetail(ctx, row)
}

func (s *Service) ListForOrganization(ctx context.Context, organizationID uuid.UUID, eventID *uuid.UUID, status, query string, page, limit int, offset int32) ([]RegistrationDTO, int64, error) {
	rows, err := s.q.ListRegistrationsForOrganization(ctx, gen.ListRegistrationsForOrganizationParams{
		OrganizationID: &organizationID,
		EventID:        eventID,
		Status:         optString(status),
		Q:              optString(query),
		PageLimit:      int32(limit),
		PageOffset:     offset,
	})
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	count, err := s.q.CountRegistrationsForOrganization(ctx, gen.CountRegistrationsForOrganizationParams{
		OrganizationID: &organizationID,
		EventID:        eventID,
		Status:         optString(status),
		Q:              optString(query),
	})
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	out := make([]RegistrationDTO, 0, len(rows))
	for _, row := range rows {
		dto := toRegistrationDTO(row)
		s.attachSummary(ctx, &dto, row)
		out = append(out, dto)
	}
	return out, count, nil
}

func (s *Service) GetForOrganization(ctx context.Context, organizationID, registrationID uuid.UUID) (RegistrationDTO, error) {
	row, err := s.q.GetRegistrationForOrganization(ctx, gen.GetRegistrationForOrganizationParams{
		ID:             registrationID,
		OrganizationID: &organizationID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return RegistrationDTO{}, apperr.NotFound("Pendaftaran tidak ditemukan.")
		}
		return RegistrationDTO{}, apperr.Internal(err)
	}
	return s.buildDetail(ctx, row)
}

type ReviewInput struct {
	Approve bool
	Reason  string
	ActorID uuid.UUID
	Actor   string
}

func (s *Service) Review(ctx context.Context, organizationID, registrationID uuid.UUID, in ReviewInput) (RegistrationDTO, error) {
	before, err := s.q.GetRegistrationForOrganization(ctx, gen.GetRegistrationForOrganizationParams{
		ID:             registrationID,
		OrganizationID: &organizationID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return RegistrationDTO{}, apperr.NotFound("Pendaftaran tidak ditemukan.")
		}
		return RegistrationDTO{}, apperr.Internal(err)
	}
	if before.Status != "pending_verification" {
		return RegistrationDTO{}, apperr.Conflict("Hanya pendaftaran yang menunggu verifikasi yang dapat direview.")
	}

	reason := strings.TrimSpace(in.Reason)
	if !in.Approve && reason == "" {
		return RegistrationDTO{}, apperr.Validation(map[string]string{"reason": "Alasan penolakan wajib diisi."})
	}

	var updated gen.Registration
	var email, eventTitle string
	err = s.db.WithTx(ctx, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)

		if !in.Approve {
			reg, err := q.UpdateRegistrationStatus(ctx, gen.UpdateRegistrationStatusParams{
				ID:              registrationID,
				Status:          "rejected",
				ReviewedBy:      &in.ActorID,
				RejectionReason: &reason,
				ReviewedAt:      ptrTime(time.Now()),
			})
			if err != nil {
				return err
			}
			updated = reg
			if err := q.SetQualificationSubmissionsStatus(ctx, gen.SetQualificationSubmissionsStatusParams{
				RegistrationID: registrationID,
				Status:         "rejected",
				ReviewerNote:   &reason,
			}); err != nil {
				return err
			}
		} else {
			locked, err := q.GetEventCategoryForUpdate(ctx, before.CategoryID)
			if err != nil {
				return err
			}
			active, err := q.CountActiveRegistrationsByCategory(ctx, locked.ID)
			if err != nil {
				return err
			}

			now := time.Now()
			status := "awaiting_payment"
			var deadline *time.Time
			var waitlistPosition *int32
			if active >= int64(locked.Quota) {
				position, err := q.GetNextWaitlistPosition(ctx, locked.ID)
				if err != nil {
					return err
				}
				status = "waitlisted"
				waitlistPosition = &position
			} else {
				value := now.Add(s.cfg.PaymentWindow)
				deadline = &value
			}

			reg, err := q.UpdateRegistrationStatus(ctx, gen.UpdateRegistrationStatusParams{
				ID:                registrationID,
				Status:            status,
				ReviewedBy:        &in.ActorID,
				PaymentDeadlineAt: deadline,
				ApprovedAt:        &now,
				ReviewedAt:        &now,
				WaitlistPosition:  waitlistPosition,
			})
			if err != nil {
				return err
			}
			updated = reg
			if status == "awaiting_payment" {
				if _, err := createPendingPayment(ctx, q, s.cfg, registrationID, reg.PriceAmount, *deadline); err != nil {
					return err
				}
			}
			if err := q.SetQualificationSubmissionsStatus(ctx, gen.SetQualificationSubmissionsStatusParams{
				RegistrationID: registrationID,
				Status:         "accepted",
			}); err != nil {
				return err
			}
		}

		if _, err := q.CreateRegistrationStatusLog(ctx, gen.CreateRegistrationStatusLogParams{
			RegistrationID: registrationID,
			FromStatus:     &before.Status,
			ToStatus:       updated.Status,
			ActorType:      "organizer",
			ActorID:        &in.ActorID,
			ActorName:      in.Actor,
			Note:           optString(reason),
		}); err != nil {
			return err
		}

		event, err := q.GetEventByID(ctx, before.EventID)
		if err != nil {
			return err
		}
		eventTitle = event.Title
		user, err := q.GetUserByID(ctx, before.UserID)
		if err != nil {
			return err
		}
		email = user.Email
		return nil
	})
	if err != nil {
		if appErr, ok := apperr.As(err); ok {
			return RegistrationDTO{}, appErr
		}
		return RegistrationDTO{}, apperr.Internal(err)
	}

	s.notifyStatus(ctx, updated, email, eventTitle, optString(reason))
	return s.GetForOrganization(ctx, organizationID, registrationID)
}

func (s *Service) attachSummary(ctx context.Context, dto *RegistrationDTO, row gen.Registration) {
	event, err := s.q.GetEventByID(ctx, row.EventID)
	if err == nil {
		organizerName := "Event eksternal"
		if event.OrganizationID != nil {
			if org, err := s.q.GetOrganizationByID(ctx, *event.OrganizationID); err == nil {
				organizerName = org.Name
			}
		}
		dto.Event = toEventSummary(event, organizerName)
	}
	category, err := s.q.GetEventCategoryByID(ctx, row.CategoryID)
	if err == nil {
		dto.Category = toCategorySummary(category)
	}
	payment, err := s.q.GetPaymentByRegistration(ctx, row.ID)
	if err == nil {
		dto.Payment = toPaymentDTO(payment)
	}
	ticket, err := s.q.GetTicketByRegistration(ctx, row.ID)
	if err == nil {
		dto.Ticket = toTicketDTO(ticket)
	}
}

func (s *Service) buildDetail(ctx context.Context, row gen.Registration) (RegistrationDTO, error) {
	dto := toRegistrationDTO(row)
	s.attachSummary(ctx, &dto, row)

	answers, err := s.q.ListRegistrationAnswersByRegistration(ctx, row.ID)
	if err != nil {
		return RegistrationDTO{}, apperr.Internal(err)
	}
	for _, answer := range answers {
		value := answer.Value
		if answer.IsEncrypted {
			decrypted, err := s.decrypt(answer.Value)
			if err != nil {
				value = "[tidak dapat didekripsi]"
			} else {
				value = decrypted
			}
		}
		dto.Answers = append(dto.Answers, toAnswerDTO(answer, value))
	}

	submissions, err := s.q.ListQualificationSubmissionsByRegistration(ctx, row.ID)
	if err != nil {
		return RegistrationDTO{}, apperr.Internal(err)
	}
	for _, submission := range submissions {
		var fileURL *string
		if submission.FileKey != nil && s.storage != nil {
			if value, err := s.storage.PresignGet(ctx, *submission.FileKey, 15*time.Minute); err == nil {
				fileURL = &value
			}
		}
		dto.QualificationSubmissions = append(dto.QualificationSubmissions, toSubmissionDTO(submission, fileURL))
	}

	logs, err := s.q.ListRegistrationStatusLogs(ctx, row.ID)
	if err != nil {
		return RegistrationDTO{}, apperr.Internal(err)
	}
	for _, entry := range logs {
		dto.StatusLogs = append(dto.StatusLogs, toStatusLogDTO(entry))
	}

	return dto, nil
}

type validatedAnswer struct {
	FieldID     uuid.UUID
	Value       string
	IsEncrypted bool
}

func (s *Service) validateAnswers(userID uuid.UUID, fields []gen.RegistrationFormField, inputs []AnswerInput) ([]validatedAnswer, error) {
	fieldMap := map[uuid.UUID]gen.RegistrationFormField{}
	for _, field := range fields {
		fieldMap[field.ID] = field
	}
	answerMap := map[uuid.UUID]string{}
	for _, input := range inputs {
		answerMap[input.FieldID] = strings.TrimSpace(input.Value)
	}

	fieldsErrors := map[string]string{}
	out := make([]validatedAnswer, 0, len(inputs))
	for _, field := range fields {
		value, present := answerMap[field.ID]
		if field.IsRequired && (!present || value == "") {
			fieldsErrors[field.FieldKey] = "Field ini wajib diisi."
			continue
		}
		if !present || value == "" {
			continue
		}
		if err := validateFieldValue(field, value); err != "" {
			fieldsErrors[field.FieldKey] = err
			continue
		}
		if field.FieldType == "file" && !validUserFileKey(userID, value) {
			fieldsErrors[field.FieldKey] = "Berkas tidak valid. Unggah ulang melalui form ini."
			continue
		}
		if field.IsSensitive {
			if s.enc == nil {
				return nil, apperr.Internal(fmt.Errorf("ENCRYPTION_KEY belum dikonfigurasi"))
			}
			encrypted, err := s.enc.Encrypt(value)
			if err != nil {
				return nil, apperr.Internal(err)
			}
			out = append(out, validatedAnswer{FieldID: field.ID, Value: encrypted, IsEncrypted: true})
			continue
		}
		out = append(out, validatedAnswer{FieldID: field.ID, Value: value})
	}
	if len(fieldsErrors) > 0 {
		return nil, apperr.Validation(fieldsErrors)
	}
	return out, nil
}

func validateFieldValue(field gen.RegistrationFormField, value string) string {
	switch field.FieldType {
	case "number":
		if _, err := strconv.ParseFloat(value, 64); err != nil {
			return "Nilai harus berupa angka."
		}
	case "date":
		if _, err := time.Parse("2006-01-02", value); err != nil {
			return "Format tanggal harus YYYY-MM-DD."
		}
	case "checkbox":
		if value != "true" && value != "false" {
			return "Nilai harus true atau false."
		}
	case "select":
		var options []string
		_ = json.Unmarshal(field.Options, &options)
		found := false
		for _, option := range options {
			if option == value {
				found = true
				break
			}
		}
		if !found {
			return "Pilihan tidak valid."
		}
	}
	return ""
}

func (s *Service) validateQualifications(userID uuid.UUID, requirements []gen.QualificationRequirement, required bool, inputs []QualificationInput) ([]QualificationInput, error) {
	requirementMap := map[uuid.UUID]gen.QualificationRequirement{}
	for _, requirement := range requirements {
		requirementMap[requirement.ID] = requirement
	}
	inputMap := map[uuid.UUID]QualificationInput{}
	for _, input := range inputs {
		if _, ok := requirementMap[input.RequirementID]; !ok {
			continue
		}
		inputMap[input.RequirementID] = input
	}

	fieldsErrors := map[string]string{}
	out := make([]QualificationInput, 0, len(inputs))
	for _, requirement := range requirements {
		input, present := inputMap[requirement.ID]
		if present && strings.TrimSpace(input.FileKey) != "" && !validUserFileKey(userID, input.FileKey) {
			fieldsErrors[requirement.ID.String()] = "Berkas tidak valid. Unggah ulang melalui form ini."
			continue
		}
		hasValue := present && (strings.TrimSpace(input.ValueText) != "" || strings.TrimSpace(input.FileKey) != "" || strings.TrimSpace(input.ExternalLink) != "")
		if requirement.IsRequired && required && !hasValue {
			fieldsErrors[requirement.ID.String()] = "Syarat ini wajib dilengkapi."
			continue
		}
		if hasValue {
			out = append(out, input)
		}
	}
	if len(fieldsErrors) > 0 {
		return nil, apperr.Validation(fieldsErrors)
	}
	return out, nil
}

func createPendingPayment(ctx context.Context, q *gen.Queries, cfg *config.Config, registrationID uuid.UUID, amount int64, expiresAt time.Time) (gen.Payment, error) {
	orderID := fmt.Sprintf("JT-%s-%s", time.Now().Format("20060102"), strings.ToUpper(strings.ReplaceAll(uuid.NewString()[:8], "-", "")))
	platformFee := amount * cfg.PlatformFeeBPS / 10000
	gatewayFee := cfg.GatewayFeeFixed + amount*cfg.GatewayFeeBPS/10000
	return q.CreatePayment(ctx, gen.CreatePaymentParams{
		RegistrationID: registrationID,
		OrderID:        orderID,
		Gateway:        cfg.PaymentDriver,
		Method:         "va",
		Amount:         amount,
		PlatformFee:    platformFee,
		GatewayFee:     gatewayFee,
		Status:         "pending",
		ExpiresAt:      expiresAt,
	})
}

func (s *Service) notifyStatus(ctx context.Context, reg gen.Registration, email, eventTitle string, rejectionReason *string) {
	var title, body, template string
	switch reg.Status {
	case "pending_verification":
		template = "registration.pending_verification"
		title = "Pendaftaran menunggu verifikasi"
		body = fmt.Sprintf("Pendaftaran Anda untuk %s sudah dikirim. Organizer akan meninjau dokumen kualifikasi Anda.", eventTitle)
	case "awaiting_payment":
		template = "registration.awaiting_payment"
		title = "Pembayaran menunggu"
		body = fmt.Sprintf("Pendaftaran Anda untuk %s disetujui. Selesaikan pembayaran sebelum batas waktu.", eventTitle)
	case "waitlisted":
		template = "registration.waitlisted"
		title = "Anda masuk daftar tunggu"
		body = fmt.Sprintf("Kuota %s sedang penuh. Anda masuk daftar tunggu dan akan dihubungi bila slot tersedia.", eventTitle)
	case "rejected":
		template = "registration.rejected"
		title = "Pendaftaran ditolak"
		body = fmt.Sprintf("Pendaftaran Anda untuk %s ditolak.", eventTitle)
		if rejectionReason != nil {
			body += " Alasan: " + *rejectionReason
		}
	default:
		return
	}
	s.notifier.Notify(ctx, "attendee", reg.UserID, email, template, title, body)
}

func (s *Service) decrypt(value string) (string, error) {
	if s.enc == nil {
		return "", fmt.Errorf("encryption key tidak tersedia")
	}
	return s.enc.Decrypt(value)
}

func ageAt(birthDate, at time.Time) int {
	years := at.Year() - birthDate.Year()
	if at.Month() < birthDate.Month() || (at.Month() == birthDate.Month() && at.Day() < birthDate.Day()) {
		years--
	}
	return years
}

func validUserFileKey(userID uuid.UUID, key string) bool {
	return strings.HasPrefix(key, "attendee/"+userID.String()+"/")
}

func optString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func ptrTime(value time.Time) *time.Time { return &value }

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func (s *Service) OrganizerName(ctx context.Context, id uuid.UUID) string {
	organizer, err := s.q.GetOrganizerByID(ctx, id)
	if err != nil {
		return "Organizer"
	}
	return organizer.FullName
}
