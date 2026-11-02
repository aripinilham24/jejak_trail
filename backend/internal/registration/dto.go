package registration

import (
	"time"

	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
)

type EventSummaryDTO struct {
	ID            string `json:"id"`
	Slug          string `json:"slug"`
	Title         string `json:"title"`
	EventType     string `json:"eventType"`
	Status        string `json:"status"`
	LocationName  string `json:"locationName"`
	Province      string `json:"province"`
	City          string `json:"city"`
	EventStartAt  string `json:"eventStartAt"`
	EventEndAt    string `json:"eventEndAt"`
	CoverURL      string `json:"coverUrl"`
	OrganizerName string `json:"organizerName"`
}

type CategorySummaryDTO struct {
	ID                    string  `json:"id"`
	EventID               string  `json:"eventId"`
	Name                  string  `json:"name"`
	DistanceKm            float64 `json:"distanceKm"`
	ElevationGainM        int32   `json:"elevationGainM"`
	Difficulty            string  `json:"difficulty"`
	Price                 int64   `json:"price"`
	Quota                 int32   `json:"quota"`
	MinAge                int32   `json:"minAge"`
	CutoffMinutes         int32   `json:"cutoffMinutes"`
	RequiresQualification bool    `json:"requiresQualification"`
	BibPrefix             string  `json:"bibPrefix"`
	BibNext               int32   `json:"bibNext"`
}

type PaymentDTO struct {
	ID             string  `json:"id"`
	RegistrationID string  `json:"registrationId"`
	OrderID        string  `json:"orderId"`
	Gateway        string  `json:"gateway"`
	GatewayRef     *string `json:"gatewayRef,omitempty"`
	Method         string  `json:"method"`
	Amount         int64   `json:"amount"`
	PlatformFee    int64   `json:"platformFee"`
	GatewayFee     int64   `json:"gatewayFee"`
	Status         string  `json:"status"`
	ExpiresAt      string  `json:"expiresAt"`
	PaidAt         *string `json:"paidAt,omitempty"`
	CreatedAt      string  `json:"createdAt"`
}

type AnswerDTO struct {
	ID             string `json:"id"`
	RegistrationID string `json:"registrationId"`
	FieldID        string `json:"fieldId"`
	FieldKey       string `json:"fieldKey"`
	FieldLabel     string `json:"fieldLabel"`
	Value          string `json:"value"`
	IsEncrypted    bool   `json:"isEncrypted"`
}

type SubmissionDTO struct {
	ID               string  `json:"id"`
	RegistrationID   string  `json:"registrationId"`
	RequirementID    string  `json:"requirementId"`
	RequirementLabel string  `json:"requirementLabel"`
	RequirementType  string  `json:"requirementType"`
	ValueText        *string `json:"valueText,omitempty"`
	FileURL          *string `json:"fileUrl,omitempty"`
	ExternalLink     *string `json:"externalLink,omitempty"`
	Status           string  `json:"status"`
	ReviewerNote     *string `json:"reviewerNote,omitempty"`
	CreatedAt        string  `json:"createdAt"`
}

type TicketSummaryDTO struct {
	ID             string `json:"id"`
	RegistrationID string `json:"registrationId"`
	QRCode         string `json:"qrCode"`
	Status         string `json:"status"`
	IssuedAt       string `json:"issuedAt"`
}

type StatusLogDTO struct {
	ID             string  `json:"id"`
	RegistrationID string  `json:"registrationId"`
	FromStatus     *string `json:"fromStatus"`
	ToStatus       string  `json:"toStatus"`
	ActorType      string  `json:"actorType"`
	ActorName      string  `json:"actorName"`
	Note           *string `json:"note,omitempty"`
	CreatedAt      string  `json:"createdAt"`
}

type RegistrationDTO struct {
	ID                       string              `json:"id"`
	UserID                   string              `json:"userId"`
	EventID                  string              `json:"eventId"`
	CategoryID               string              `json:"categoryId"`
	Status                   string              `json:"status"`
	FullNameSnapshot         string              `json:"fullNameSnapshot"`
	BirthDateSnapshot        *string             `json:"birthDateSnapshot,omitempty"`
	WaitlistPosition         *int32              `json:"waitlistPosition,omitempty"`
	ReviewedBy               *string             `json:"reviewedBy,omitempty"`
	SubmittedAt              *string             `json:"submittedAt,omitempty"`
	ReviewedAt               *string             `json:"reviewedAt,omitempty"`
	RejectionReason          *string             `json:"rejectionReason,omitempty"`
	PaymentDeadlineAt        *string             `json:"paymentDeadlineAt,omitempty"`
	ApprovedAt               *string             `json:"approvedAt,omitempty"`
	PaidAt                   *string             `json:"paidAt,omitempty"`
	DataLockedAt             *string             `json:"dataLockedAt,omitempty"`
	BibNumber                *string             `json:"bibNumber,omitempty"`
	RefundPolicyID           *string             `json:"refundPolicyId,omitempty"`
	RefundPolicyVersion      *int32              `json:"refundPolicyVersion,omitempty"`
	CreatedAt                string              `json:"createdAt"`
	Event                    *EventSummaryDTO    `json:"event,omitempty"`
	Category                 *CategorySummaryDTO `json:"category,omitempty"`
	Payment                  *PaymentDTO         `json:"payment,omitempty"`
	Ticket                   *TicketSummaryDTO   `json:"ticket,omitempty"`
	Answers                  []AnswerDTO         `json:"answers"`
	QualificationSubmissions []SubmissionDTO     `json:"qualificationSubmissions"`
	StatusLogs               []StatusLogDTO      `json:"statusLogs"`
}

func toRegistrationDTO(r gen.Registration) RegistrationDTO {
	dto := RegistrationDTO{
		ID:                       r.ID.String(),
		UserID:                   r.UserID.String(),
		EventID:                  r.EventID.String(),
		CategoryID:               r.CategoryID.String(),
		Status:                   r.Status,
		FullNameSnapshot:         r.FullNameSnapshot,
		BirthDateSnapshot:        dateString(r.BirthDateSnapshot),
		WaitlistPosition:         r.WaitlistPosition,
		ReviewedBy:               uuidString(r.ReviewedBy),
		SubmittedAt:              timeString(r.SubmittedAt),
		ReviewedAt:               timeString(r.ReviewedAt),
		RejectionReason:          r.RejectionReason,
		PaymentDeadlineAt:        timeString(r.PaymentDeadlineAt),
		ApprovedAt:               timeString(r.ApprovedAt),
		PaidAt:                   timeString(r.PaidAt),
		DataLockedAt:             timeString(r.DataLockedAt),
		BibNumber:                r.BibNumber,
		RefundPolicyID:           uuidString(r.RefundPolicyID),
		RefundPolicyVersion:      r.RefundPolicyVersion,
		CreatedAt:                r.CreatedAt.UTC().Format(time.RFC3339),
		Answers:                  []AnswerDTO{},
		QualificationSubmissions: []SubmissionDTO{},
		StatusLogs:               []StatusLogDTO{},
	}
	return dto
}

func toEventSummary(e gen.Event, organizerName string) *EventSummaryDTO {
	return &EventSummaryDTO{
		ID:            e.ID.String(),
		Slug:          e.Slug,
		Title:         e.Title,
		EventType:     e.EventType,
		Status:        e.Status,
		LocationName:  e.LocationName,
		Province:      e.Province,
		City:          e.City,
		EventStartAt:  e.EventStartAt.UTC().Format(time.RFC3339),
		EventEndAt:    e.EventEndAt.UTC().Format(time.RFC3339),
		OrganizerName: organizerName,
	}
}

func toCategorySummary(c gen.EventCategory) *CategorySummaryDTO {
	return &CategorySummaryDTO{
		ID:                    c.ID.String(),
		EventID:               c.EventID.String(),
		Name:                  c.Name,
		DistanceKm:            c.DistanceKm,
		ElevationGainM:        c.ElevationGainM,
		Difficulty:            c.Difficulty,
		Price:                 c.Price,
		Quota:                 c.Quota,
		MinAge:                c.MinAge,
		CutoffMinutes:         c.CutoffMinutes,
		RequiresQualification: c.RequiresQualification,
		BibPrefix:             c.BibPrefix,
		BibNext:               c.BibNext,
	}
}

func toPaymentDTO(p gen.Payment) *PaymentDTO {
	return &PaymentDTO{
		ID:             p.ID.String(),
		RegistrationID: p.RegistrationID.String(),
		OrderID:        p.OrderID,
		Gateway:        p.Gateway,
		GatewayRef:     p.GatewayRef,
		Method:         p.Method,
		Amount:         p.Amount,
		PlatformFee:    p.PlatformFee,
		GatewayFee:     p.GatewayFee,
		Status:         p.Status,
		ExpiresAt:      p.ExpiresAt.UTC().Format(time.RFC3339),
		PaidAt:         timeString(p.PaidAt),
		CreatedAt:      p.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func toAnswerDTO(row gen.ListRegistrationAnswersByRegistrationRow, value string) AnswerDTO {
	return AnswerDTO{
		ID:             row.ID.String(),
		RegistrationID: row.RegistrationID.String(),
		FieldID:        row.FieldID.String(),
		FieldKey:       row.FieldKey,
		FieldLabel:     row.FieldLabel,
		Value:          value,
		IsEncrypted:    row.IsEncrypted,
	}
}

func toSubmissionDTO(row gen.ListQualificationSubmissionsByRegistrationRow, fileURL *string) SubmissionDTO {
	return SubmissionDTO{
		ID:               row.ID.String(),
		RegistrationID:   row.RegistrationID.String(),
		RequirementID:    row.RequirementID.String(),
		RequirementLabel: row.RequirementLabel,
		RequirementType:  row.RequirementType,
		ValueText:        row.ValueText,
		FileURL:          fileURL,
		ExternalLink:     row.ExternalLink,
		Status:           row.Status,
		ReviewerNote:     row.ReviewerNote,
		CreatedAt:        row.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func toTicketDTO(t gen.Ticket) *TicketSummaryDTO {
	return &TicketSummaryDTO{
		ID:             t.ID.String(),
		RegistrationID: t.RegistrationID.String(),
		QRCode:         t.QrCode,
		Status:         t.Status,
		IssuedAt:       t.IssuedAt.UTC().Format(time.RFC3339),
	}
}

func toStatusLogDTO(l gen.RegistrationStatusLog) StatusLogDTO {
	return StatusLogDTO{
		ID:             l.ID.String(),
		RegistrationID: l.RegistrationID.String(),
		FromStatus:     l.FromStatus,
		ToStatus:       l.ToStatus,
		ActorType:      l.ActorType,
		ActorName:      l.ActorName,
		Note:           l.Note,
		CreatedAt:      l.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func timeString(t *time.Time) *string {
	if t == nil {
		return nil
	}
	v := t.UTC().Format(time.RFC3339)
	return &v
}

func dateString(t *time.Time) *string {
	if t == nil {
		return nil
	}
	v := t.Format("2006-01-02")
	return &v
}

func uuidString(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	v := id.String()
	return &v
}
