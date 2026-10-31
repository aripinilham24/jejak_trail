package notification

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"mime"
	"net/mail"
	"net/smtp"
	"strings"

	"github.com/aripinilham/jejak_trail/backend/internal/config"
)

type Message struct {
	To      string
	Subject string
	Text    string
}

type Mailer interface {
	Send(ctx context.Context, msg Message) error
}

func NewMailer(cfg *config.Config, log *slog.Logger) Mailer {
	if cfg.SMTPHost == "" {
		return &LogMailer{log: log}
	}
	envelopeFrom := cfg.MailFrom
	if parsed, err := mail.ParseAddress(cfg.MailFrom); err == nil {
		envelopeFrom = parsed.Address
	}
	return &SMTPMailer{
		addr:         fmt.Sprintf("%s:%d", cfg.SMTPHost, cfg.SMTPPort),
		from:         cfg.MailFrom,
		envelopeFrom: envelopeFrom,
		username:     cfg.SMTPUsername,
		password:     cfg.SMTPPassword,
		log:          log,
	}
}

type SMTPMailer struct {
	addr         string
	from         string
	envelopeFrom string
	username     string
	password     string
	log          *slog.Logger
}

func (m *SMTPMailer) Send(_ context.Context, msg Message) error {
	var auth smtp.Auth
	if m.username != "" {
		auth = smtp.PlainAuth("", m.username, m.password, strings.Split(m.addr, ":")[0])
	}

	var body bytes.Buffer
	fmt.Fprintf(&body, "From: %s\r\n", m.from)
	fmt.Fprintf(&body, "To: %s\r\n", msg.To)
	fmt.Fprintf(&body, "Subject: %s\r\n", mime.QEncoding.Encode("utf-8", msg.Subject))
	fmt.Fprintf(&body, "MIME-Version: 1.0\r\n")
	fmt.Fprintf(&body, "Content-Type: text/plain; charset=UTF-8\r\n")
	fmt.Fprintf(&body, "\r\n%s\r\n", msg.Text)

	if err := smtp.SendMail(m.addr, auth, m.envelopeFrom, []string{msg.To}, body.Bytes()); err != nil {
		m.log.Error("kirim email gagal", "to", msg.To, "subject", msg.Subject, "error", err)
		return fmt.Errorf("kirim email: %w", err)
	}
	m.log.Info("email terkirim", "to", msg.To, "subject", msg.Subject)
	return nil
}

// LogMailer dipakai bila SMTP tidak dikonfigurasi (misalnya unit test).
type LogMailer struct {
	log *slog.Logger
}

func (m *LogMailer) Send(_ context.Context, msg Message) error {
	m.log.Info("email (log only)", "to", msg.To, "subject", msg.Subject, "body", msg.Text)
	return nil
}
