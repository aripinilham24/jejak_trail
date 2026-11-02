package audit

import (
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/httpx"
)

type Handler struct {
	q *gen.Queries
}

func NewHandler(q *gen.Queries) *Handler {
	return &Handler{q: q}
}

type LogDTO struct {
	ID         string          `json:"id"`
	ActorType  string          `json:"actorType"`
	ActorID    *string         `json:"actorId,omitempty"`
	ActorName  string          `json:"actorName"`
	Action     string          `json:"action"`
	EntityType string          `json:"entityType"`
	EntityID   *string         `json:"entityId,omitempty"`
	Before     json.RawMessage `json:"before,omitempty"`
	After      json.RawMessage `json:"after,omitempty"`
	IPAddress  *string         `json:"ipAddress,omitempty"`
	CreatedAt  string          `json:"createdAt"`
}

func (h *Handler) List(c fiber.Ctx) error {
	page, limit, offset := httpx.PageParams(c)

	var entityID *uuid.UUID
	if raw := c.Query("entityId"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return apperr.Validation(map[string]string{"entityId": "Entity ID tidak valid."})
		}
		entityID = &parsed
	}

	rows, err := h.q.ListAuditLogs(c.Context(), gen.ListAuditLogsParams{
		ActorType:  optString(c.Query("actorType")),
		EntityType: optString(c.Query("entityType")),
		EntityID:   entityID,
		PageOffset: offset,
		PageLimit:  int32(limit),
	})
	if err != nil {
		return apperr.Internal(err)
	}
	total, err := h.q.CountAuditLogs(c.Context(), gen.CountAuditLogsParams{
		ActorType:  optString(c.Query("actorType")),
		EntityType: optString(c.Query("entityType")),
		EntityID:   entityID,
	})
	if err != nil {
		return apperr.Internal(err)
	}

	out := make([]LogDTO, 0, len(rows))
	for _, row := range rows {
		dto := LogDTO{
			ID:         row.ID.String(),
			ActorType:  row.ActorType,
			ActorName:  row.ActorName,
			Action:     row.Action,
			EntityType: row.EntityType,
			IPAddress:  row.IpAddress,
			CreatedAt:  row.CreatedAt.UTC().Format(time.RFC3339),
		}
		if row.ActorID != nil {
			v := row.ActorID.String()
			dto.ActorID = &v
		}
		if row.EntityID != nil {
			v := row.EntityID.String()
			dto.EntityID = &v
		}
		if len(row.BeforeData) > 0 {
			dto.Before = json.RawMessage(row.BeforeData)
		}
		if len(row.AfterData) > 0 {
			dto.After = json.RawMessage(row.AfterData)
		}
		out = append(out, dto)
	}
	return httpx.List(c, out, httpx.Meta{Page: page, Limit: limit, Total: total})
}

func optString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
