package notification

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/db"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
)

type Service struct {
	q *gen.Queries
}

func NewService(database *db.DB) *Service {
	return &Service{q: gen.New(database.Pool)}
}

type NotificationDTO struct {
	ID            string  `json:"id"`
	RecipientType string  `json:"recipientType"`
	RecipientID   string  `json:"recipientId"`
	Channel       string  `json:"channel"`
	TemplateKey   string  `json:"templateKey"`
	Title         string  `json:"title"`
	Body          string  `json:"body"`
	Status        string  `json:"status"`
	ReadAt        *string `json:"readAt,omitempty"`
	SentAt        *string `json:"sentAt,omitempty"`
	CreatedAt     string  `json:"createdAt"`
}

func (s *Service) List(ctx context.Context, recipientType string, recipientID uuid.UUID) ([]NotificationDTO, int64, error) {
	rows, err := s.q.ListNotificationsByRecipient(ctx, gen.ListNotificationsByRecipientParams{
		RecipientType: recipientType,
		RecipientID:   recipientID,
	})
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	out := make([]NotificationDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, NotificationDTO{
			ID:            row.ID.String(),
			RecipientType: row.RecipientType,
			RecipientID:   row.RecipientID.String(),
			Channel:       row.Channel,
			TemplateKey:   row.TemplateKey,
			Title:         row.Title,
			Body:          row.Body,
			Status:        row.Status,
			ReadAt:        timeString(row.ReadAt),
			SentAt:        timeString(row.SentAt),
			CreatedAt:     row.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	unread, err := s.q.CountUnreadNotifications(ctx, gen.CountUnreadNotificationsParams{
		RecipientType: recipientType,
		RecipientID:   recipientID,
	})
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	return out, unread, nil
}

func (s *Service) MarkRead(ctx context.Context, recipientType string, recipientID, notificationID uuid.UUID) error {
	if err := s.q.MarkNotificationRead(ctx, gen.MarkNotificationReadParams{
		ID:            notificationID,
		RecipientType: recipientType,
		RecipientID:   recipientID,
	}); err != nil {
		return apperr.Internal(err)
	}
	return nil
}

func (s *Service) MarkAllRead(ctx context.Context, recipientType string, recipientID uuid.UUID) error {
	if err := s.q.MarkAllNotificationsRead(ctx, gen.MarkAllNotificationsReadParams{
		RecipientType: recipientType,
		RecipientID:   recipientID,
	}); err != nil {
		return apperr.Internal(err)
	}
	return nil
}

func timeString(t *time.Time) *string {
	if t == nil {
		return nil
	}
	v := t.UTC().Format(time.RFC3339)
	return &v
}
