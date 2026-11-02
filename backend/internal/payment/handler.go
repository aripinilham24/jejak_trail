package payment

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/auth"
	"github.com/aripinilham/jejak_trail/backend/internal/config"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/httpx"
)

type Handler struct {
	service *Service
	cfg     *config.Config
	gateway Gateway
}

func NewHandler(service *Service, cfg *config.Config, gateway Gateway) *Handler {
	return &Handler{service: service, cfg: cfg, gateway: gateway}
}

func (h *Handler) Webhook(c fiber.Ctx) error {
	if c.Params("gateway") != h.gateway.Name() {
		return apperr.NotFound("Gateway pembayaran tidak dikenal.")
	}

	event, err := h.gateway.VerifyAndParse(c.Body(), c.Get("X-Webhook-Signature"))
	if err != nil {
		return apperr.Unauthorized("Signature webhook tidak valid.")
	}
	if err := h.service.HandleWebhook(c.Context(), h.gateway.Name(), event); err != nil {
		return err
	}
	return httpx.OK(c, fiber.Map{"received": true})
}

func (h *Handler) SimulatePaid(c fiber.Ctx) error {
	if h.cfg.IsProduction() {
		return apperr.NotFound("Endpoint tidak tersedia.")
	}
	userID, err := attendeeID(c)
	if err != nil {
		return err
	}
	if err := h.service.SimulatePaid(c.Context(), userID, c.Params("orderId")); err != nil {
		return err
	}
	return httpx.OK(c, fiber.Map{"status": "paid"})
}

func (h *Handler) SimulateExpire(c fiber.Ctx) error {
	if h.cfg.IsProduction() {
		return apperr.NotFound("Endpoint tidak tersedia.")
	}
	userID, err := attendeeID(c)
	if err != nil {
		return err
	}
	if err := h.service.SimulateExpire(c.Context(), userID, c.Params("orderId")); err != nil {
		return err
	}
	return httpx.OK(c, fiber.Map{"status": "expired"})
}

func (h *Handler) ListTickets(c fiber.Ctx) error {
	userID, err := attendeeID(c)
	if err != nil {
		return err
	}
	tickets, err := h.service.ListTickets(c.Context(), userID)
	if err != nil {
		return err
	}
	return httpx.List(c, tickets, httpx.Meta{Page: 1, Limit: len(tickets), Total: int64(len(tickets))})
}

func (h *Handler) GetTicket(c fiber.Ctx) error {
	userID, err := attendeeID(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Tiket tidak ditemukan.")
	}
	ticket, err := h.service.GetTicket(c.Context(), userID, id)
	if err != nil {
		return err
	}
	return httpx.OK(c, ticket)
}

func attendeeID(c fiber.Ctx) (uuid.UUID, error) {
	claims, ok := auth.ClaimsFrom(c)
	if !ok {
		return uuid.Nil, apperr.Unauthorized("")
	}
	id, err := uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, apperr.Unauthorized("")
	}
	return id, nil
}
