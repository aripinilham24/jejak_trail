package analytics

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/auth"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/httpx"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Organizer(c fiber.Ctx) error {
	claims, ok := auth.ClaimsFrom(c)
	if !ok || claims.OrganizationID == "" {
		return apperr.Unauthorized("")
	}
	orgID, err := uuid.Parse(claims.OrganizationID)
	if err != nil {
		return apperr.Unauthorized("")
	}
	data, err := h.service.OrganizerDashboard(c.Context(), orgID)
	if err != nil {
		return err
	}
	return httpx.OK(c, data)
}

func (h *Handler) Admin(c fiber.Ctx) error {
	data, err := h.service.AdminDashboard(c.Context())
	if err != nil {
		return err
	}
	return httpx.OK(c, data)
}
