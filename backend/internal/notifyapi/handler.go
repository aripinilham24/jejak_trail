package notifyapi

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/auth"
	"github.com/aripinilham/jejak_trail/backend/internal/notification"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/httpx"
)

type Handler struct {
	service *notification.Service
}

func NewHandler(service *notification.Service) *Handler {
	return &Handler{service: service}
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
	items, unread, err := h.service.List(c.Context(), auth.AccountAttendee, userID)
	if err != nil {
		return err
	}
	return httpx.List(c, items, httpx.Meta{Page: 1, Limit: len(items), Total: int64(len(items)), Unread: unread})
}

func (h *Handler) MarkRead(c fiber.Ctx) error {
	claims, ok := auth.ClaimsFrom(c)
	if !ok {
		return apperr.Unauthorized("")
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return apperr.Unauthorized("")
	}
	notificationID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Notifikasi tidak ditemukan.")
	}
	if err := h.service.MarkRead(c.Context(), auth.AccountAttendee, userID, notificationID); err != nil {
		return err
	}
	return httpx.NoContent(c)
}

func (h *Handler) MarkAllRead(c fiber.Ctx) error {
	claims, ok := auth.ClaimsFrom(c)
	if !ok {
		return apperr.Unauthorized("")
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return apperr.Unauthorized("")
	}
	if err := h.service.MarkAllRead(c.Context(), auth.AccountAttendee, userID); err != nil {
		return err
	}
	return httpx.NoContent(c)
}
