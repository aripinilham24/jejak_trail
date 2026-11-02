package dispute

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
	EventID        string  `json:"eventId"`
	RegistrationID *string `json:"registrationId"`
	DisputeType    string  `json:"disputeType"`
	Description    string  `json:"description"`
}

func (h *Handler) Create(c fiber.Ctx) error {
	claims, ok := auth.ClaimsFrom(c)
	if !ok {
		return apperr.Unauthorized("")
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return apperr.Unauthorized("")
	}
	user, err := h.q.GetUserByID(c.Context(), userID)
	if err != nil {
		return apperr.Unauthorized("")
	}

	var req createRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}
	eventID, err := uuid.Parse(req.EventID)
	if err != nil {
		return apperr.Validation(map[string]string{"eventId": "Event ID tidak valid."})
	}
	var registrationID *uuid.UUID
	if req.RegistrationID != nil && *req.RegistrationID != "" {
		parsed, err := uuid.Parse(*req.RegistrationID)
		if err != nil {
			return apperr.Validation(map[string]string{"registrationId": "Registration ID tidak valid."})
		}
		registrationID = &parsed
	}
	result, err := h.service.Create(c.Context(), userID, user.FullName, CreateInput{
		EventID:        eventID,
		RegistrationID: registrationID,
		DisputeType:    req.DisputeType,
		Description:    req.Description,
	})
	if err != nil {
		return err
	}
	return httpx.Created(c, result)
}

func (h *Handler) ListMine(c fiber.Ctx) error {
	claims, ok := auth.ClaimsFrom(c)
	if !ok {
		return apperr.Unauthorized("")
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return apperr.Unauthorized("")
	}
	items, err := h.service.ListMine(c.Context(), userID)
	if err != nil {
		return err
	}
	return httpx.List(c, items, httpx.Meta{Page: 1, Limit: len(items), Total: int64(len(items))})
}

func (h *Handler) AdminList(c fiber.Ctx) error {
	page, limit, offset := httpx.PageParams(c)
	items, total, err := h.service.AdminList(c.Context(), c.Query("status"), page, limit, offset)
	if err != nil {
		return err
	}
	return httpx.List(c, items, httpx.Meta{Page: page, Limit: limit, Total: total})
}

type resolutionRequest struct {
	Resolution string `json:"resolution"`
}

func (h *Handler) Review(c fiber.Ctx) error {
	return h.setStatus(c, "in_review")
}

func (h *Handler) Resolve(c fiber.Ctx) error {
	return h.setStatus(c, "resolved")
}

func (h *Handler) Reject(c fiber.Ctx) error {
	return h.setStatus(c, "rejected")
}

func (h *Handler) setStatus(c fiber.Ctx, status string) error {
	adminID, adminName, err := h.adminActor(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Sengketa tidak ditemukan.")
	}
	var req resolutionRequest
	_ = c.Bind().Body(&req)
	item, err := h.service.SetStatus(c.Context(), adminID, adminName, c.IP(), id, status, req.Resolution)
	if err != nil {
		return err
	}
	return httpx.OK(c, item)
}

func (h *Handler) adminActor(c fiber.Ctx) (uuid.UUID, string, error) {
	claims, ok := auth.ClaimsFrom(c)
	if !ok {
		return uuid.Nil, "", apperr.Unauthorized("")
	}
	id, err := uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, "", apperr.Unauthorized("")
	}
	admin, err := h.q.GetAdminByID(c.Context(), id)
	if err != nil {
		return uuid.Nil, "", apperr.Unauthorized("")
	}
	return id, admin.FullName, nil
}
