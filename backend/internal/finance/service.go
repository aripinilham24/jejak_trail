package finance

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/aripinilham/jejak_trail/backend/internal/audit"
	"github.com/aripinilham/jejak_trail/backend/internal/config"
	"github.com/aripinilham/jejak_trail/backend/internal/db"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/notification"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
)

type WaitlistPromoter interface {
	PromoteWaitlist(ctx context.Context, categoryID uuid.UUID) error
}

type Service struct {
	db       *db.DB
	q        *gen.Queries
	cfg      *config.Config
	audit    *audit.Writer
	notifier *notification.Notifier
	promoter WaitlistPromoter
}

func NewService(
	database *db.DB,
	cfg *config.Config,
	auditWriter *audit.Writer,
	notifier *notification.Notifier,
	promoter WaitlistPromoter,
) *Service {
	return &Service{
		db:       database,
		q:        gen.New(database.Pool),
		cfg:      cfg,
		audit:    auditWriter,
		notifier: notifier,
		promoter: promoter,
	}
}

type RefundDTO struct {
	ID               string  `json:"id"`
	PaymentID        string  `json:"paymentId"`
	RegistrationID   string  `json:"registrationId"`
	Amount           int64   `json:"amount"`
	ReasonType       string  `json:"reasonType"`
	Status           string  `json:"status"`
	GatewayRef       *string `json:"gatewayRef,omitempty"`
	FeeBorneBy       string  `json:"feeBorneBy"`
	ProcessedBy      *string `json:"processedBy,omitempty"`
	RequestedAt      string  `json:"requestedAt"`
	ProcessedAt      *string `json:"processedAt,omitempty"`
	Note             *string `json:"note,omitempty"`
	EventTitle       string  `json:"eventTitle"`
	OrganizationName string  `json:"organizationName"`
	ParticipantName  string  `json:"participantName"`
	OrderID          string  `json:"orderId"`
}

type DisbursementDTO struct {
	ID                 string  `json:"id"`
	EventID            string  `json:"eventId"`
	OrganizationID     string  `json:"organizationId"`
	BankAccountID      string  `json:"bankAccountId"`
	Stage              int32   `json:"stage"`
	Percentage         float64 `json:"percentage"`
	Amount             int64   `json:"amount"`
	Status             string  `json:"status"`
	ApprovedBy         *string `json:"approvedBy,omitempty"`
	RequestedAt        *string `json:"requestedAt,omitempty"`
	ApprovedAt         *string `json:"approvedAt,omitempty"`
	PaidAt             *string `json:"paidAt,omitempty"`
	PayoutRef          *string `json:"payoutRef,omitempty"`
	Note               *string `json:"note,omitempty"`
	CreatedAt          string  `json:"createdAt"`
	EventTitle         string  `json:"eventTitle"`
	OrganizationName   *string `json:"organizationName,omitempty"`
	BankName           *string `json:"bankName,omitempty"`
	AccountNumberLast4 *string `json:"accountNumberLast4,omitempty"`
}

type SummaryDTO struct {
	GMV                  int64 `json:"gmv"`
	PlatformRevenue      int64 `json:"platformRevenue"`
	Collected            int64 `json:"collected"`
	Refunded             int64 `json:"refunded"`
	Disbursed            int64 `json:"disbursed"`
	Held                 int64 `json:"held"`
	PendingDisbursements int32 `json:"pendingDisbursements"`
	PendingRefunds       int32 `json:"pendingRefunds"`
}

type RefundInput struct {
	ReasonType string
	Amount     *int64
	Note       string
	ActorID    uuid.UUID
	ActorName  string
	IPAddress  string
}

func (s *Service) CreateRefund(ctx context.Context, registrationID uuid.UUID, in RefundInput) (RefundDTO, error) {
	reason := strings.TrimSpace(in.ReasonType)
	if !validRefundReason(reason) {
		return RefundDTO{}, apperr.Validation(map[string]string{"reasonType": "Reason type tidak dikenal."})
	}

	reg, err := s.q.GetRegistrationByID(ctx, registrationID)
	if err != nil {
		return RefundDTO{}, apperr.NotFound("Pendaftaran tidak ditemukan.")
	}
	if reg.Status != "paid" && reg.Status != "checked_in" {
		return RefundDTO{}, apperr.Conflict("Hanya pendaftaran lunas yang dapat direfund.")
	}
	payment, err := s.q.GetPaymentByRegistration(ctx, registrationID)
	if err != nil {
		return RefundDTO{}, apperr.Conflict("Pembayaran tidak ditemukan.")
	}
	if payment.Status != "paid" && payment.Status != "partially_refunded" {
		return RefundDTO{}, apperr.Conflict("Pembayaran tidak dalam status yang dapat direfund.")
	}

	prior, err := s.q.SumRefundedByPayment(ctx, payment.ID)
	if err != nil {
		return RefundDTO{}, apperr.Internal(err)
	}
	remaining := payment.Amount - prior
	if remaining <= 0 {
		return RefundDTO{}, apperr.Conflict("Pembayaran sudah direfund seluruhnya.")
	}

	percent, err := s.refundPercent(ctx, reg, reason)
	if err != nil {
		return RefundDTO{}, err
	}
	eligible := remaining * percent / 100
	if eligible <= 0 && in.Amount == nil {
		return RefundDTO{}, apperr.Validation(map[string]string{"amount": "Tidak ada nominal refund yang memenuhi kebijakan."})
	}

	amount := eligible
	if in.Amount != nil {
		amount = *in.Amount
	}
	if amount <= 0 {
		return RefundDTO{}, apperr.Validation(map[string]string{"amount": "Nominal refund harus lebih dari 0."})
	}
	if amount > eligible {
		return RefundDTO{}, apperr.Validation(map[string]string{
			"amount": fmt.Sprintf("Nominal refund melebihi batas kebijakan (%d).", eligible),
		})
	}

	event, err := s.q.GetEventByID(ctx, reg.EventID)
	if err != nil {
		return RefundDTO{}, apperr.Internal(err)
	}
	org, err := s.q.GetOrganizationByID(ctx, *event.OrganizationID)
	if err != nil {
		return RefundDTO{}, apperr.Internal(err)
	}
	user, err := s.q.GetUserByID(ctx, reg.UserID)
	if err != nil {
		return RefundDTO{}, apperr.Internal(err)
	}

	gatewayRef := "RF-" + strings.ToUpper(strings.ReplaceAll(uuid.NewString()[:8], "-", ""))
	now := time.Now()
	var refund gen.Refund
	fullRefund := false

	err = s.db.WithTx(ctx, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)

		created, err := q.CreateRefund(ctx, gen.CreateRefundParams{
			PaymentID:      payment.ID,
			RegistrationID: reg.ID,
			Amount:         amount,
			ReasonType:     reason,
			Status:         "refunded",
			GatewayRef:     &gatewayRef,
			FeeBorneBy:     "platform",
			ProcessedBy:    &in.ActorID,
			ProcessedAt:    &now,
			Note:           optString(in.Note),
		})
		if err != nil {
			return err
		}
		refund = created

		total := prior + amount
		paymentStatus := "partially_refunded"
		if total >= payment.Amount {
			paymentStatus = "refunded"
			fullRefund = true
		}
		if _, err := q.SetPaymentRefundStatus(ctx, gen.SetPaymentRefundStatusParams{
			ID:     payment.ID,
			Status: paymentStatus,
		}); err != nil {
			return err
		}

		if fullRefund {
			if _, err := q.SetRegistrationRefunded(ctx, reg.ID); err != nil {
				return err
			}
			if err := q.RevokeTicketByRegistration(ctx, reg.ID); err != nil {
				return err
			}
			from := reg.Status
			if _, err := q.CreateRegistrationStatusLog(ctx, gen.CreateRegistrationStatusLogParams{
				RegistrationID: reg.ID,
				FromStatus:     &from,
				ToStatus:       "refunded",
				ActorType:      "admin",
				ActorID:        &in.ActorID,
				ActorName:      in.ActorName,
				Note:           optString("Refund diproses: " + reason),
			}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		if appErr, ok := apperr.As(err); ok {
			return RefundDTO{}, appErr
		}
		return RefundDTO{}, apperr.Internal(err)
	}

	s.audit.Write(ctx, audit.Entry{
		ActorType:  "admin",
		ActorID:    &in.ActorID,
		ActorName:  in.ActorName,
		Action:     "refund.process",
		EntityType: "refunds",
		EntityID:   &refund.ID,
		After:      map[string]any{"amount": amount, "reason": reason, "full": fullRefund},
		IPAddress:  in.IPAddress,
	})

	s.notifier.Notify(ctx, "attendee", reg.UserID, user.Email, "refund.processed", "Refund diproses",
		fmt.Sprintf("Refund sebesar Rp%d untuk %s sudah diproses.", amount, event.Title))

	if fullRefund && s.promoter != nil {
		_ = s.promoter.PromoteWaitlist(ctx, reg.CategoryID)
	}

	return RefundDTO{
		ID:               refund.ID.String(),
		PaymentID:        refund.PaymentID.String(),
		RegistrationID:   refund.RegistrationID.String(),
		Amount:           refund.Amount,
		ReasonType:       refund.ReasonType,
		Status:           refund.Status,
		GatewayRef:       refund.GatewayRef,
		FeeBorneBy:       refund.FeeBorneBy,
		ProcessedBy:      uuidString(refund.ProcessedBy),
		RequestedAt:      refund.RequestedAt.UTC().Format(time.RFC3339),
		ProcessedAt:      timeString(refund.ProcessedAt),
		Note:             refund.Note,
		EventTitle:       event.Title,
		OrganizationName: org.Name,
		ParticipantName:  user.FullName,
		OrderID:          payment.OrderID,
	}, nil
}

func (s *Service) refundPercent(ctx context.Context, reg gen.Registration, reason string) (int64, error) {
	switch reason {
	case "event_cancelled", "payment_error", "overbooked":
		return 100, nil
	}
	if reg.RefundPolicyID == nil {
		return 0, nil
	}
	policy, err := s.q.GetRefundPolicyByID(ctx, *reg.RefundPolicyID)
	if err != nil {
		return 0, apperr.Internal(err)
	}
	switch policy.PolicyType {
	case "full_refund":
		return 100, nil
	case "no_refund":
		return 0, nil
	}
	rules, err := s.q.ListRefundPolicyRulesByPolicyID(ctx, policy.ID)
	if err != nil {
		return 0, apperr.Internal(err)
	}
	event, err := s.q.GetEventByID(ctx, reg.EventID)
	if err != nil {
		return 0, apperr.Internal(err)
	}
	days := int64(event.EventStartAt.Sub(time.Now()).Hours() / 24)
	for _, rule := range rules {
		if days < int64(rule.DaysBeforeEventMin) {
			continue
		}
		if rule.DaysBeforeEventMax != nil && days > int64(*rule.DaysBeforeEventMax) {
			continue
		}
		return int64(rule.RefundPercent), nil
	}
	return 0, nil
}

func (s *Service) ListRefunds(ctx context.Context, status string, page, limit int, offset int32) ([]RefundDTO, int64, error) {
	rows, err := s.q.ListRefunds(ctx, gen.ListRefundsParams{
		Status:     optString(status),
		PageLimit:  int32(limit),
		PageOffset: offset,
	})
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	count, err := s.q.CountRefunds(ctx, optString(status))
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	out := make([]RefundDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, RefundDTO{
			ID:               row.ID.String(),
			PaymentID:        row.PaymentID.String(),
			RegistrationID:   row.RegistrationID.String(),
			Amount:           row.Amount,
			ReasonType:       row.ReasonType,
			Status:           row.Status,
			GatewayRef:       row.GatewayRef,
			FeeBorneBy:       row.FeeBorneBy,
			ProcessedBy:      uuidString(row.ProcessedBy),
			RequestedAt:      row.RequestedAt.UTC().Format(time.RFC3339),
			ProcessedAt:      timeString(row.ProcessedAt),
			Note:             row.Note,
			EventTitle:       row.EventTitle,
			OrganizationName: row.OrganizationName,
			ParticipantName:  row.ParticipantName,
			OrderID:          row.OrderID,
		})
	}
	return out, count, nil
}

type DisbursementInput struct {
	Stage      int32
	Percentage float64
	Amount     *int64
	Note       string
}

func (s *Service) CreateDisbursement(ctx context.Context, actorID uuid.UUID, actorName, ip string, eventID uuid.UUID, in DisbursementInput) (DisbursementDTO, error) {
	event, err := s.q.GetEventByID(ctx, eventID)
	if err != nil {
		return DisbursementDTO{}, apperr.NotFound("Event tidak ditemukan.")
	}
	if event.OrganizationID == nil {
		return DisbursementDTO{}, apperr.Conflict("Event eksternal tidak memiliki pencairan.")
	}
	orgID := *event.OrganizationID
	org, err := s.q.GetOrganizationByID(ctx, orgID)
	if err != nil {
		return DisbursementDTO{}, apperr.Internal(err)
	}
	bank, err := s.q.GetActiveBankAccountByOrganization(ctx, orgID)
	if err != nil {
		return DisbursementDTO{}, apperr.Conflict("Organisasi belum memiliki rekening aktif.")
	}

	fields := map[string]string{}
	if in.Stage < 1 || in.Stage > 3 {
		fields["stage"] = "Stage harus 1, 2, atau 3."
	}
	if in.Percentage <= 0 || in.Percentage > 100 {
		fields["percentage"] = "Persentase harus 1-100."
	}
	if len(fields) > 0 {
		return DisbursementDTO{}, apperr.Validation(fields)
	}

	if _, err := s.q.GetDisbursementByEventAndStage(ctx, gen.GetDisbursementByEventAndStageParams{
		EventID: eventID,
		Stage:   in.Stage,
	}); err == nil {
		return DisbursementDTO{}, apperr.Conflict("Pencairan untuk tahap ini sudah ada.")
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return DisbursementDTO{}, apperr.Internal(err)
	}

	collected, err := s.q.GetEventCollected(ctx, eventID)
	if err != nil {
		return DisbursementDTO{}, apperr.Internal(err)
	}
	if collected <= 0 {
		return DisbursementDTO{}, apperr.Conflict("Belum ada dana terkumpul untuk event ini.")
	}
	maxAmount := int64(float64(collected) * in.Percentage / 100)
	if maxAmount <= 0 {
		return DisbursementDTO{}, apperr.Validation(map[string]string{"amount": "Nominal pencairan tidak valid."})
	}
	amount := maxAmount
	if in.Amount != nil {
		amount = *in.Amount
	}
	if amount > maxAmount {
		return DisbursementDTO{}, apperr.Validation(map[string]string{
			"amount": fmt.Sprintf("Nominal melebihi batas persentase (%d).", maxAmount),
		})
	}
	if amount <= 0 {
		return DisbursementDTO{}, apperr.Validation(map[string]string{"amount": "Nominal pencairan harus lebih dari 0."})
	}
	cumulative, err := s.q.SumDisbursementsByEvent(ctx, eventID)
	if err != nil {
		return DisbursementDTO{}, apperr.Internal(err)
	}
	if cumulative+amount > collected {
		return DisbursementDTO{}, apperr.Conflict("Total pencairan melebihi dana terkumpul.")
	}

	row, err := s.q.CreateDisbursement(ctx, gen.CreateDisbursementParams{
		EventID:        eventID,
		OrganizationID: orgID,
		BankAccountID:  bank.ID,
		Stage:          in.Stage,
		Percentage:     in.Percentage,
		Amount:         amount,
		Status:         "eligible",
		Note:           optString(in.Note),
	})
	if err != nil {
		if isUniqueViolation(err) {
			return DisbursementDTO{}, apperr.Conflict("Pencairan untuk tahap ini sudah ada.")
		}
		return DisbursementDTO{}, apperr.Internal(err)
	}

	s.audit.Write(ctx, audit.Entry{
		ActorType:  "admin",
		ActorID:    &actorID,
		ActorName:  actorName,
		Action:     "disbursement.create",
		EntityType: "disbursements",
		EntityID:   &row.ID,
		After:      map[string]any{"stage": row.Stage, "amount": row.Amount, "percentage": row.Percentage},
		IPAddress:  ip,
	})

	orgName := org.Name
	bankName := bank.BankName
	last4 := bank.AccountNumberLast4
	return disbursementDTO(row, event.Title, &orgName, &bankName, &last4), nil
}

func (s *Service) ReviewDisbursement(ctx context.Context, actorID uuid.UUID, actorName, ip string, id uuid.UUID, approve bool, note string) (DisbursementDTO, error) {
	before, err := s.q.GetDisbursementByID(ctx, id)
	if err != nil {
		return DisbursementDTO{}, apperr.NotFound("Pencairan tidak ditemukan.")
	}
	if before.Status != "eligible" && before.Status != "pending" {
		return DisbursementDTO{}, apperr.Conflict("Hanya pencairan eligible/pending yang dapat direview.")
	}

	now := time.Now()
	status := "held"
	var approvedAt, paidAt *time.Time
	var payoutRef *string
	if approve {
		status = "paid"
		approvedAt = &now
		paidAt = &now
		ref := "PO-" + strings.ToUpper(strings.ReplaceAll(uuid.NewString()[:8], "-", ""))
		payoutRef = &ref
	}

	row, err := s.q.UpdateDisbursementStatus(ctx, gen.UpdateDisbursementStatusParams{
		ID:         id,
		Status:     status,
		ApprovedBy: &actorID,
		ApprovedAt: approvedAt,
		PaidAt:     paidAt,
		PayoutRef:  payoutRef,
		Note:       optString(note),
	})
	if err != nil {
		return DisbursementDTO{}, apperr.Internal(err)
	}

	event, err := s.q.GetEventByID(ctx, row.EventID)
	if err != nil {
		return DisbursementDTO{}, apperr.Internal(err)
	}
	org, err := s.q.GetOrganizationByID(ctx, row.OrganizationID)
	if err != nil {
		return DisbursementDTO{}, apperr.Internal(err)
	}
	bank, err := s.q.GetActiveBankAccountByOrganization(ctx, row.OrganizationID)
	if err != nil {
		return DisbursementDTO{}, apperr.Internal(err)
	}

	action := "disbursement.hold"
	if approve {
		action = "disbursement.approve"
	}
	s.audit.Write(ctx, audit.Entry{
		ActorType:  "admin",
		ActorID:    &actorID,
		ActorName:  actorName,
		Action:     action,
		EntityType: "disbursements",
		EntityID:   &id,
		Before:     map[string]any{"status": before.Status},
		After:      map[string]any{"status": status, "amount": row.Amount},
		IPAddress:  ip,
	})

	orgName := org.Name
	bankName := bank.BankName
	last4 := bank.AccountNumberLast4
	return disbursementDTO(row, event.Title, &orgName, &bankName, &last4), nil
}

func (s *Service) ListDisbursements(ctx context.Context, status string, page, limit int, offset int32) ([]DisbursementDTO, int64, error) {
	rows, err := s.q.ListDisbursements(ctx, gen.ListDisbursementsParams{
		Status:     optString(status),
		PageLimit:  int32(limit),
		PageOffset: offset,
	})
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	count, err := s.q.CountDisbursements(ctx, optString(status))
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	out := make([]DisbursementDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, DisbursementDTO{
			ID:                 row.ID.String(),
			EventID:            row.EventID.String(),
			OrganizationID:     row.OrganizationID.String(),
			BankAccountID:      row.BankAccountID.String(),
			Stage:              row.Stage,
			Percentage:         row.Percentage,
			Amount:             row.Amount,
			Status:             row.Status,
			ApprovedBy:         uuidString(row.ApprovedBy),
			RequestedAt:        timeString(row.RequestedAt),
			ApprovedAt:         timeString(row.ApprovedAt),
			PaidAt:             timeString(row.PaidAt),
			PayoutRef:          row.PayoutRef,
			Note:               row.Note,
			CreatedAt:          row.CreatedAt.UTC().Format(time.RFC3339),
			EventTitle:         row.EventTitle,
			OrganizationName:   &row.OrganizationName,
			BankName:           row.BankName,
			AccountNumberLast4: row.AccountNumberLast4,
		})
	}
	return out, count, nil
}

func (s *Service) ListOrganizationDisbursements(ctx context.Context, organizationID uuid.UUID) ([]DisbursementDTO, error) {
	rows, err := s.q.ListDisbursementsByOrganization(ctx, organizationID)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	out := make([]DisbursementDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, DisbursementDTO{
			ID:                 row.ID.String(),
			EventID:            row.EventID.String(),
			OrganizationID:     row.OrganizationID.String(),
			BankAccountID:      row.BankAccountID.String(),
			Stage:              row.Stage,
			Percentage:         row.Percentage,
			Amount:             row.Amount,
			Status:             row.Status,
			ApprovedBy:         uuidString(row.ApprovedBy),
			RequestedAt:        timeString(row.RequestedAt),
			ApprovedAt:         timeString(row.ApprovedAt),
			PaidAt:             timeString(row.PaidAt),
			PayoutRef:          row.PayoutRef,
			Note:               row.Note,
			CreatedAt:          row.CreatedAt.UTC().Format(time.RFC3339),
			EventTitle:         row.EventTitle,
			BankName:           row.BankName,
			AccountNumberLast4: row.AccountNumberLast4,
		})
	}
	return out, nil
}

func (s *Service) OrganizerSummary(ctx context.Context, organizationID uuid.UUID) (SummaryDTO, error) {
	row, err := s.q.OrganizerFinanceSummary(ctx, &organizationID)
	if err != nil {
		return SummaryDTO{}, apperr.Internal(err)
	}
	return SummaryDTO{
		Collected: row.Collected,
		Refunded:  row.Refunded,
		Disbursed: row.Disbursed,
		Held:      row.Collected - row.Refunded - row.Disbursed,
	}, nil
}

func (s *Service) AdminSummary(ctx context.Context) (SummaryDTO, error) {
	row, err := s.q.AdminFinanceSummary(ctx)
	if err != nil {
		return SummaryDTO{}, apperr.Internal(err)
	}
	return SummaryDTO{
		GMV:                  row.Gmv,
		PlatformRevenue:      row.PlatformRevenue,
		Collected:            row.Gmv,
		Refunded:             row.Refunded,
		Disbursed:            row.Disbursed,
		Held:                 row.Gmv - row.Refunded - row.Disbursed,
		PendingDisbursements: row.PendingDisbursements,
		PendingRefunds:       row.PendingRefunds,
	}, nil
}

func disbursementDTO(row gen.Disbursement, eventTitle string, orgName, bankName, last4 *string) DisbursementDTO {
	return DisbursementDTO{
		ID:                 row.ID.String(),
		EventID:            row.EventID.String(),
		OrganizationID:     row.OrganizationID.String(),
		BankAccountID:      row.BankAccountID.String(),
		Stage:              row.Stage,
		Percentage:         row.Percentage,
		Amount:             row.Amount,
		Status:             row.Status,
		ApprovedBy:         uuidString(row.ApprovedBy),
		RequestedAt:        timeString(row.RequestedAt),
		ApprovedAt:         timeString(row.ApprovedAt),
		PaidAt:             timeString(row.PaidAt),
		PayoutRef:          row.PayoutRef,
		Note:               row.Note,
		CreatedAt:          row.CreatedAt.UTC().Format(time.RFC3339),
		EventTitle:         eventTitle,
		OrganizationName:   orgName,
		BankName:           bankName,
		AccountNumberLast4: last4,
	}
}

func validRefundReason(value string) bool {
	switch value {
	case "event_cancelled", "participant_cancel", "payment_error", "overbooked", "other":
		return true
	default:
		return false
	}
}

func optString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func uuidString(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	v := id.String()
	return &v
}

func timeString(t *time.Time) *string {
	if t == nil {
		return nil
	}
	v := t.UTC().Format(time.RFC3339)
	return &v
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
