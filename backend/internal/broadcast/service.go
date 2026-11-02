package broadcast

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/aripinilham/jejak_trail/backend/internal/db"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/notification"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
)

type Service struct {
	db       *db.DB
	q        *gen.Queries
	notifier *notification.Notifier
}

func NewService(database *db.DB, notifier *notification.Notifier) *Service {
	return &Service{db: database, q: gen.New(database.Pool), notifier: notifier}
}

type BroadcastDTO struct {
	ID         string  `json:"id"`
	EventID    string  `json:"eventId"`
	SentBy     *string `json:"sentBy,omitempty"`
	SentByName string  `json:"sentByName"`
	Channel    string  `json:"channel"`
	Subject    string  `json:"subject"`
	Message    string  `json:"message"`
	Recipients int32   `json:"recipients"`
	SentAt     string  `json:"sentAt"`
}

type Input struct {
	Channel string
	Subject string
	Message string
}

func (s *Service) Create(ctx context.Context, organizationID, eventID, actorID uuid.UUID, actorName string, in Input) (BroadcastDTO, error) {
	event, err := s.q.GetEventByIDForOrganization(ctx, gen.GetEventByIDForOrganizationParams{
		ID:             eventID,
		OrganizationID: &organizationID,
	})
	if err != nil {
		return BroadcastDTO{}, apperr.NotFound("Event tidak ditemukan.")
	}

	fields := map[string]string{}
	subject := strings.TrimSpace(in.Subject)
	message := strings.TrimSpace(in.Message)
	channel := strings.TrimSpace(in.Channel)
	if channel == "" {
		channel = "email"
	}
	if channel != "email" && channel != "in_app" {
		fields["channel"] = "Channel harus email atau in_app."
	}
	if subject == "" {
		fields["subject"] = "Subjek wajib diisi."
	}
	if message == "" {
		fields["message"] = "Pesan wajib diisi."
	}
	if len(fields) > 0 {
		return BroadcastDTO{}, apperr.Validation(fields)
	}

	recipients, err := s.q.ListBroadcastRecipients(ctx, event.ID)
	if err != nil {
		return BroadcastDTO{}, apperr.Internal(err)
	}

	row, err := s.q.CreateBroadcast(ctx, gen.CreateBroadcastParams{
		EventID:    event.ID,
		SentBy:     &actorID,
		SentByName: actorName,
		Channel:    channel,
		Subject:    subject,
		Message:    message,
		Recipients: int32(len(recipients)),
	})
	if err != nil {
		return BroadcastDTO{}, apperr.Internal(err)
	}

	for _, recipient := range recipients {
		s.notifier.Notify(ctx, "attendee", recipient.ID, recipient.Email, "broadcast.custom", subject, message)
	}

	return toDTO(row), nil
}

func (s *Service) List(ctx context.Context, organizationID, eventID uuid.UUID) ([]BroadcastDTO, error) {
	if _, err := s.q.GetEventByIDForOrganization(ctx, gen.GetEventByIDForOrganizationParams{
		ID:             eventID,
		OrganizationID: &organizationID,
	}); err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperr.NotFound("Event tidak ditemukan.")
		}
		return nil, apperr.Internal(err)
	}
	rows, err := s.q.ListBroadcastsByEvent(ctx, eventID)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	out := make([]BroadcastDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, toDTO(row))
	}
	return out, nil
}

func toDTO(row gen.Broadcast) BroadcastDTO {
	dto := BroadcastDTO{
		ID:         row.ID.String(),
		EventID:    row.EventID.String(),
		SentByName: row.SentByName,
		Channel:    row.Channel,
		Subject:    row.Subject,
		Message:    row.Message,
		Recipients: row.Recipients,
		SentAt:     row.SentAt.UTC().Format(time.RFC3339),
	}
	if row.SentBy != nil {
		value := row.SentBy.String()
		dto.SentBy = &value
	}
	return dto
}
