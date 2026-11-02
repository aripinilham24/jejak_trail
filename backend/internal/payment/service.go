package payment

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
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
	db       *db.DB
	q        *gen.Queries
	cfg      *config.Config
	notifier *notification.Notifier
	log      *slog.Logger
	gateway  Gateway
}

func NewService(database *db.DB, cfg *config.Config, notifier *notification.Notifier, log *slog.Logger, gateway Gateway) *Service {
	return &Service{
		db:       database,
		q:        gen.New(database.Pool),
		cfg:      cfg,
		notifier: notifier,
		log:      log,
		gateway:  gateway,
	}
}

type notificationJob struct {
	recipientID uuid.UUID
	email       string
	template    string
	title       string
	body        string
}

func (s *Service) HandleWebhook(ctx context.Context, gateway string, event WebhookEvent) error {
	var jobs []notificationJob

	err := s.db.WithTx(ctx, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)

		hook, err := q.CreateWebhookEvent(ctx, gen.CreateWebhookEventParams{
			Gateway: gateway,
			EventID: event.ID,
			Payload: event.Raw,
		})
		if errors.Is(err, pgx.ErrNoRows) {
			// Event sudah pernah diproses.
			return nil
		}
		if err != nil {
			return err
		}

		payment, err := q.GetPaymentByOrderIDForUpdate(ctx, event.OrderID)
		if err != nil {
			return err
		}

		switch event.Status {
		case "paid":
			jobs, err = s.applyPaid(ctx, q, payment, event)
		case "expired":
			jobs, err = s.applyExpired(ctx, q, payment, event)
		case "failed":
			_, err = q.UpdatePaymentStatus(ctx, gen.UpdatePaymentStatusParams{
				ID:         payment.ID,
				Status:     "failed",
				GatewayRef: &event.ID,
				RawPayload: event.Raw,
			})
		}
		if err != nil {
			return err
		}

		return q.MarkWebhookProcessed(ctx, hook.ID)
	})
	if err != nil {
		if appErr, ok := apperr.As(err); ok {
			return appErr
		}
		return apperr.Internal(err)
	}

	for _, job := range jobs {
		s.notifier.Notify(ctx, "attendee", job.recipientID, job.email, job.template, job.title, job.body)
	}
	return nil
}

func (s *Service) applyPaid(ctx context.Context, q *gen.Queries, payment gen.Payment, event WebhookEvent) ([]notificationJob, error) {
	if payment.Status == "paid" {
		return nil, nil
	}

	paidAt := event.PaidAt
	if paidAt.IsZero() {
		paidAt = time.Now()
	}
	gatewayRef := event.ID
	if _, err := q.UpdatePaymentStatus(ctx, gen.UpdatePaymentStatusParams{
		ID:         payment.ID,
		Status:     "paid",
		GatewayRef: &gatewayRef,
		PaidAt:     &paidAt,
		RawPayload: event.Raw,
	}); err != nil {
		return nil, err
	}

	reg, err := q.GetRegistrationForUpdate(ctx, payment.RegistrationID)
	if err != nil {
		return nil, err
	}
	if reg.Status == "paid" || reg.Status == "checked_in" {
		return nil, nil
	}
	if reg.Status != "awaiting_payment" && reg.Status != "expired" {
		s.log.Warn("pembayaran diterima untuk status yang tidak dikenal", "registration_id", reg.ID, "status", reg.Status)
		return nil, nil
	}

	category, err := q.GetEventCategoryByID(ctx, reg.CategoryID)
	if err != nil {
		return nil, err
	}
	if reg.Status == "expired" {
		active, err := q.CountActiveRegistrationsByCategory(ctx, reg.CategoryID)
		if err != nil {
			return nil, err
		}
		if active >= int64(category.Quota) {
			s.log.Error("pembayaran diterima setelah slot habis", "registration_id", reg.ID, "order_id", payment.OrderID)
			return nil, nil
		}
	}

	bib, err := q.AssignCategoryBib(ctx, reg.CategoryID)
	if err != nil {
		return nil, err
	}
	if bib.AssignedNumber > bib.BibEnd {
		return nil, apperr.Conflict("Kuota BIB kategori habis. Hubungi admin platform.")
	}
	bibNumber := fmt.Sprintf("%s-%04d", bib.BibPrefix, bib.AssignedNumber)

	updated, err := q.MarkRegistrationPaid(ctx, gen.MarkRegistrationPaidParams{
		ID:        reg.ID,
		PaidAt:    &paidAt,
		BibNumber: &bibNumber,
	})
	if err != nil {
		return nil, err
	}

	qr, err := crypto.RandomToken(24)
	if err != nil {
		return nil, err
	}
	if _, err := q.CreateTicket(ctx, gen.CreateTicketParams{
		RegistrationID: reg.ID,
		QrCode:         "JT-" + qr,
	}); err != nil {
		return nil, err
	}

	from := reg.Status
	if _, err := q.CreateRegistrationStatusLog(ctx, gen.CreateRegistrationStatusLogParams{
		RegistrationID: reg.ID,
		FromStatus:     &from,
		ToStatus:       "paid",
		ActorType:      "system",
		ActorName:      "Payment Gateway",
		Note:           strPtr("Pembayaran diterima. Data dikunci, BIB dan tiket diterbitkan."),
	}); err != nil {
		return nil, err
	}

	user, err := q.GetUserByID(ctx, updated.UserID)
	if err != nil {
		return nil, err
	}
	eventRow, err := q.GetEventByID(ctx, updated.EventID)
	if err != nil {
		return nil, err
	}

	return []notificationJob{{
		recipientID: updated.UserID,
		email:       user.Email,
		template:    "registration.paid",
		title:       "Pembayaran berhasil",
		body: fmt.Sprintf(
			"Pembayaran Anda untuk %s berhasil. BIB Anda %s. Tiket QR sudah aktif dan dapat dilihat di menu Tiket.",
			eventRow.Title, bibNumber,
		),
	}}, nil
}

func (s *Service) applyExpired(ctx context.Context, q *gen.Queries, payment gen.Payment, event WebhookEvent) ([]notificationJob, error) {
	if payment.Status != "pending" {
		return nil, nil
	}

	gatewayRef := event.ID
	if _, err := q.UpdatePaymentStatus(ctx, gen.UpdatePaymentStatusParams{
		ID:         payment.ID,
		Status:     "expired",
		GatewayRef: &gatewayRef,
		RawPayload: event.Raw,
	}); err != nil {
		return nil, err
	}

	reg, err := q.GetRegistrationForUpdate(ctx, payment.RegistrationID)
	if err != nil {
		return nil, err
	}

	var jobs []notificationJob
	if reg.Status == "awaiting_payment" {
		from := reg.Status
		updated, err := q.UpdateRegistrationStatus(ctx, gen.UpdateRegistrationStatusParams{
			ID:                reg.ID,
			Status:            "expired",
			PaymentDeadlineAt: nil,
		})
		if err != nil {
			return nil, err
		}
		if _, err := q.CreateRegistrationStatusLog(ctx, gen.CreateRegistrationStatusLogParams{
			RegistrationID: reg.ID,
			FromStatus:     &from,
			ToStatus:       "expired",
			ActorType:      "system",
			ActorName:      "Payment Gateway",
			Note:           strPtr("Batas waktu pembayaran terlewat. Slot dilepas ke waitlist."),
		}); err != nil {
			return nil, err
		}
		user, err := q.GetUserByID(ctx, updated.UserID)
		if err != nil {
			return nil, err
		}
		eventRow, err := q.GetEventByID(ctx, updated.EventID)
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, notificationJob{
			recipientID: updated.UserID,
			email:       user.Email,
			template:    "registration.expired",
			title:       "Pendaftaran kedaluwarsa",
			body:        fmt.Sprintf("Batas waktu pembayaran untuk %s terlewat sehingga slot Anda dilepas.", eventRow.Title),
		})
	}

	promoted, err := s.promoteWaitlist(ctx, q, reg.CategoryID)
	if err != nil {
		return nil, err
	}
	jobs = append(jobs, promoted...)
	return jobs, nil
}

func (s *Service) promoteWaitlist(ctx context.Context, q *gen.Queries, categoryID uuid.UUID) ([]notificationJob, error) {
	waiting, err := q.GetOldestWaitlistedForCategory(ctx, categoryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	category, err := q.GetEventCategoryByID(ctx, categoryID)
	if err != nil {
		return nil, err
	}

	status := "awaiting_payment"
	if category.RequiresQualification {
		submissions, err := q.ListQualificationSubmissionsByRegistration(ctx, waiting.ID)
		if err != nil {
			return nil, err
		}
		accepted := len(submissions) > 0
		for _, submission := range submissions {
			if submission.Status != "accepted" {
				accepted = false
				break
			}
		}
		if !accepted {
			status = "pending_verification"
		}
	}

	now := time.Now()
	var deadline *time.Time
	var approvedAt *time.Time
	if status == "awaiting_payment" {
		value := now.Add(s.cfg.PaymentWindow)
		deadline = &value
		approvedAt = &now
	}

	updated, err := q.UpdateRegistrationStatus(ctx, gen.UpdateRegistrationStatusParams{
		ID:                waiting.ID,
		Status:            status,
		PaymentDeadlineAt: deadline,
		ApprovedAt:        approvedAt,
		WaitlistPosition:  nil,
	})
	if err != nil {
		return nil, err
	}

	if status == "awaiting_payment" {
		if _, err := s.createPendingPayment(ctx, q, updated.ID, updated.PriceAmount, *deadline); err != nil {
			return nil, err
		}
	}

	from := waiting.Status
	if _, err := q.CreateRegistrationStatusLog(ctx, gen.CreateRegistrationStatusLogParams{
		RegistrationID: waiting.ID,
		FromStatus:     &from,
		ToStatus:       status,
		ActorType:      "system",
		ActorName:      "Sistem",
		Note:           strPtr("Slot tersedia dari pendaftaran yang kedaluwarsa."),
	}); err != nil {
		return nil, err
	}

	user, err := q.GetUserByID(ctx, updated.UserID)
	if err != nil {
		return nil, err
	}
	eventRow, err := q.GetEventByID(ctx, updated.EventID)
	if err != nil {
		return nil, err
	}

	return []notificationJob{{
		recipientID: updated.UserID,
		email:       user.Email,
		template:    "registration.waitlist_promoted",
		title:       "Slot tersedia",
		body:        fmt.Sprintf("Slot untuk %s tersedia. Status pendaftaran Anda sekarang %s.", eventRow.Title, status),
	}}, nil
}

func (s *Service) ExpireDue(ctx context.Context) error {
	payments, err := s.q.ListExpiredPendingPayments(ctx, 100)
	if err != nil {
		return err
	}
	for _, payment := range payments {
		raw := []byte(fmt.Sprintf(`{"id":"expiry-%s","order_id":"%s","status":"expired"}`, payment.ID, payment.OrderID))
		if err := s.HandleWebhook(ctx, "mock", WebhookEvent{
			ID:      "expiry-" + payment.ID.String(),
			OrderID: payment.OrderID,
			Status:  "expired",
			Raw:     raw,
		}); err != nil {
			s.log.Error("gagal memproses pembayaran kedaluwarsa", "order_id", payment.OrderID, "error", err)
		}
	}
	return nil
}

func (s *Service) SimulatePaid(ctx context.Context, userID uuid.UUID, orderID string) error {
	payment, err := s.q.GetPaymentByOrderID(ctx, orderID)
	if err != nil {
		return apperr.NotFound("Tagihan tidak ditemukan.")
	}
	if _, err := s.q.GetRegistrationByIDForUser(ctx, gen.GetRegistrationByIDForUserParams{
		ID:     payment.RegistrationID,
		UserID: userID,
	}); err != nil {
		return apperr.NotFound("Tagihan tidak ditemukan.")
	}
	raw := []byte(fmt.Sprintf(`{"id":"sim-paid-%s","order_id":"%s","status":"paid","paid_at":"%s"}`,
		payment.ID, payment.OrderID, time.Now().UTC().Format(time.RFC3339)))
	return s.HandleWebhook(ctx, "mock", WebhookEvent{
		ID:      "sim-paid-" + payment.ID.String(),
		OrderID: payment.OrderID,
		Status:  "paid",
		PaidAt:  time.Now(),
		Raw:     raw,
	})
}

func (s *Service) SimulateExpire(ctx context.Context, userID uuid.UUID, orderID string) error {
	payment, err := s.q.GetPaymentByOrderID(ctx, orderID)
	if err != nil {
		return apperr.NotFound("Tagihan tidak ditemukan.")
	}
	if _, err := s.q.GetRegistrationByIDForUser(ctx, gen.GetRegistrationByIDForUserParams{
		ID:     payment.RegistrationID,
		UserID: userID,
	}); err != nil {
		return apperr.NotFound("Tagihan tidak ditemukan.")
	}
	raw := []byte(fmt.Sprintf(`{"id":"sim-expire-%s","order_id":"%s","status":"expired"}`, payment.ID, payment.OrderID))
	return s.HandleWebhook(ctx, "mock", WebhookEvent{
		ID:      "sim-expire-" + payment.ID.String(),
		OrderID: payment.OrderID,
		Status:  "expired",
		Raw:     raw,
	})
}

func (s *Service) ListTickets(ctx context.Context, userID uuid.UUID) ([]TicketDTO, error) {
	rows, err := s.q.ListTicketsByUser(ctx, userID)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	out := make([]TicketDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, toTicketDTO(row))
	}
	return out, nil
}

func (s *Service) GetTicket(ctx context.Context, userID, ticketID uuid.UUID) (TicketDTO, error) {
	rows, err := s.q.ListTicketsByUser(ctx, userID)
	if err != nil {
		return TicketDTO{}, apperr.Internal(err)
	}
	for _, row := range rows {
		if row.ID == ticketID {
			return toTicketDTO(row), nil
		}
	}
	return TicketDTO{}, apperr.NotFound("Tiket tidak ditemukan.")
}

func (s *Service) createPendingPayment(ctx context.Context, q *gen.Queries, registrationID uuid.UUID, amount int64, expiresAt time.Time) (gen.Payment, error) {
	orderID := fmt.Sprintf("JT-%s-%s", time.Now().Format("20060102"), strings.ToUpper(strings.ReplaceAll(uuid.NewString()[:8], "-", "")))
	platformFee := amount * s.cfg.PlatformFeeBPS / 10000
	gatewayFee := s.cfg.GatewayFeeFixed + amount*s.cfg.GatewayFeeBPS/10000
	return q.CreatePayment(ctx, gen.CreatePaymentParams{
		RegistrationID: registrationID,
		OrderID:        orderID,
		Gateway:        s.cfg.PaymentDriver,
		Method:         "va",
		Amount:         amount,
		PlatformFee:    platformFee,
		GatewayFee:     gatewayFee,
		Status:         "pending",
		ExpiresAt:      expiresAt,
	})
}

func strPtr(value string) *string { return &value }

func (s *Service) PromoteWaitlist(ctx context.Context, categoryID uuid.UUID) error {
	var jobs []notificationJob
	err := s.db.WithTx(ctx, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		created, err := s.promoteWaitlist(ctx, q, categoryID)
		if err != nil {
			return err
		}
		jobs = created
		return nil
	})
	if err != nil {
		return err
	}
	for _, job := range jobs {
		s.notifier.Notify(ctx, "attendee", job.recipientID, job.email, job.template, job.title, job.body)
	}
	return nil
}
