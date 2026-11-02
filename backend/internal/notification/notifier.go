package notification

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
)

type Notifier struct {
	q      *gen.Queries
	mailer Mailer
	log    *slog.Logger
}

func NewNotifier(q *gen.Queries, mailer Mailer, log *slog.Logger) *Notifier {
	return &Notifier{q: q, mailer: mailer, log: log}
}

// Notify menyimpan notifikasi in-app dan mengirim email bila alamat tersedia.
func (n *Notifier) Notify(ctx context.Context, recipientType string, recipientID uuid.UUID, email, templateKey, title, body string) {
	if _, err := n.q.CreateNotification(ctx, gen.CreateNotificationParams{
		RecipientType: recipientType,
		RecipientID:   recipientID,
		Channel:       "in_app",
		TemplateKey:   templateKey,
		Title:         title,
		Body:          body,
		Status:        "sent",
	}); err != nil {
		n.log.Error("gagal menyimpan notifikasi", "template", templateKey, "error", err)
	}

	if email == "" {
		return
	}
	if err := n.mailer.Send(ctx, Message{
		To:      email,
		Subject: title,
		Text:    body,
	}); err != nil {
		n.log.Warn("gagal mengirim email notifikasi", "to", email, "error", err)
	}
}
