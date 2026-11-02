package broadcast

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/auth"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/httpx"
)

type Handler struct {
	service *Service
	q       *gen.Queries
}

func NewHandler(service *Service, q *gen.Queries) *Handler {
	return &Handler{service: service, q: q}
}

type createRequest struct {
	Channel string `json:"channel"`
	Subject string `json:"subject"`
	Message string `json:"message"`
}

func (h *Handler) Create(c fiber.Ctx) error {
	orgID, actorID, actorName, err := h.actor(c)
	if err != nil {
		return err
	}
	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Event tidak ditemukan.")
	}

	var req createRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}
	result, err := h.service.Create(c.Context(), orgID, eventID, actorID, actorName, Input{
		Channel: req.Channel,
		Subject: req.Subject,
		Message: req.Message,
	})
	if err != nil {
		return err
	}
	return httpx.Created(c, result)
}

func (h *Handler) List(c fiber.Ctx) error {
	orgID, _, _, err := h.actor(c)
	if err != nil {
		return err
	}
	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Event tidak ditemukan.")
	}
	items, err := h.service.List(c.Context(), orgID, eventID)
	if err != nil {
		return err
	}
	return httpx.List(c, items, httpx.Meta{Page: 1, Limit: len(items), Total: int64(len(items))})
}

func (h *Handler) actor(c fiber.Ctx) (orgID, actorID uuid.UUID, actorName string, err error) {
	claims, ok := auth.ClaimsFrom(c)
	if !ok || claims.OrganizationID == "" {
		return uuid.Nil, uuid.Nil, "", apperr.Unauthorized("")
	}
	orgID, err = uuid.Parse(claims.OrganizationID)
	if err != nil {
		return uuid.Nil, uuid.Nil, "", apperr.Unauthorized("")
	}
	actorID, err = uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, uuid.Nil, "", apperr.Unauthorized("")
	}
	return orgID, actorID, h.organizerName(c, actorID), nil
}

func (h *Handler) organizerName(c fiber.Ctx, id uuid.UUID) string {
	organizer, err := h.q.GetOrganizerByID(c.Context(), id)
	if err != nil {
		return "Organizer"
	}
	return organizer.FullName
}
