package audit

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
)

type Writer struct {
	q   *gen.Queries
	log *slog.Logger
}

func NewWriter(q *gen.Queries, log *slog.Logger) *Writer {
	return &Writer{q: q, log: log}
}

type Entry struct {
	ActorType  string
	ActorID    *uuid.UUID
	ActorName  string
	Action     string
	EntityType string
	EntityID   *uuid.UUID
	Before     any
	After      any
	IPAddress  string
}

func (w *Writer) Write(ctx context.Context, e Entry) {
	var before, after []byte
	if e.Before != nil {
		if raw, err := json.Marshal(e.Before); err == nil {
			before = raw
		}
	}
	if e.After != nil {
		if raw, err := json.Marshal(e.After); err == nil {
			after = raw
		}
	}

	var ip *string
	if e.IPAddress != "" {
		ip = &e.IPAddress
	}

	if _, err := w.q.CreateAuditLog(ctx, gen.CreateAuditLogParams{
		ActorType:  e.ActorType,
		ActorID:    e.ActorID,
		ActorName:  e.ActorName,
		Action:     e.Action,
		EntityType: e.EntityType,
		EntityID:   e.EntityID,
		BeforeData: before,
		AfterData:  after,
		IpAddress:  ip,
	}); err != nil {
		w.log.Error("gagal menulis audit log", "action", e.Action, "error", err)
	}
}
