package finance

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

type refundRequest struct {
	ReasonType string `json:"reasonType"`
	Amount     *int64 `json:"amount"`
	Note       string `json:"note"`
}

func (h *Handler) CreateRefund(c fiber.Ctx) error {
	actorID, actorName, err := h.adminActor(c)
	if err != nil {
		return err
	}
	registrationID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Pendaftaran tidak ditemukan.")
	}
	var req refundRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}
	result, err := h.service.CreateRefund(c.Context(), registrationID, RefundInput{
		ReasonType: req.ReasonType,
		Amount:     req.Amount,
		Note:       req.Note,
		ActorID:    actorID,
		ActorName:  actorName,
		IPAddress:  c.IP(),
	})
	if err != nil {
		return err
	}
	return httpx.Created(c, result)
}

func (h *Handler) ListRefunds(c fiber.Ctx) error {
	page, limit, offset := httpx.PageParams(c)
	items, total, err := h.service.ListRefunds(c.Context(), c.Query("status"), page, limit, offset)
	if err != nil {
		return err
	}
	return httpx.List(c, items, httpx.Meta{Page: page, Limit: limit, Total: total})
}

type disbursementRequest struct {
	Stage      int32   `json:"stage"`
	Percentage float64 `json:"percentage"`
	Amount     *int64  `json:"amount"`
	Note       string  `json:"note"`
}

func (h *Handler) CreateDisbursement(c fiber.Ctx) error {
	actorID, actorName, err := h.adminActor(c)
	if err != nil {
		return err
	}
	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Event tidak ditemukan.")
	}
	var req disbursementRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}
	result, err := h.service.CreateDisbursement(c.Context(), actorID, actorName, c.IP(), eventID, DisbursementInput{
		Stage:      req.Stage,
		Percentage: req.Percentage,
		Amount:     req.Amount,
		Note:       req.Note,
	})
	if err != nil {
		return err
	}
	return httpx.Created(c, result)
}

func (h *Handler) ListDisbursements(c fiber.Ctx) error {
	page, limit, offset := httpx.PageParams(c)
	items, total, err := h.service.ListDisbursements(c.Context(), c.Query("status"), page, limit, offset)
	if err != nil {
		return err
	}
	return httpx.List(c, items, httpx.Meta{Page: page, Limit: limit, Total: total})
}

type reviewRequest struct {
	Note string `json:"note"`
}

func (h *Handler) ApproveDisbursement(c fiber.Ctx) error {
	return h.reviewDisbursement(c, true)
}

func (h *Handler) HoldDisbursement(c fiber.Ctx) error {
	return h.reviewDisbursement(c, false)
}

func (h *Handler) reviewDisbursement(c fiber.Ctx, approve bool) error {
	actorID, actorName, err := h.adminActor(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Pencairan tidak ditemukan.")
	}
	var req reviewRequest
	_ = c.Bind().Body(&req)
	result, err := h.service.ReviewDisbursement(c.Context(), actorID, actorName, c.IP(), id, approve, req.Note)
	if err != nil {
		return err
	}
	return httpx.OK(c, result)
}

func (h *Handler) AdminSummary(c fiber.Ctx) error {
	summary, err := h.service.AdminSummary(c.Context())
	if err != nil {
		return err
	}
	return httpx.OK(c, summary)
}

func (h *Handler) OrganizerDisbursements(c fiber.Ctx) error {
	orgID, _, _, err := h.organizerActor(c)
	if err != nil {
		return err
	}
	items, err := h.service.ListOrganizationDisbursements(c.Context(), orgID)
	if err != nil {
		return err
	}
	return httpx.List(c, items, httpx.Meta{Page: 1, Limit: len(items), Total: int64(len(items))})
}

func (h *Handler) OrganizerSummary(c fiber.Ctx) error {
	orgID, _, _, err := h.organizerActor(c)
	if err != nil {
		return err
	}
	summary, err := h.service.OrganizerSummary(c.Context(), orgID)
	if err != nil {
		return err
	}
	return httpx.OK(c, summary)
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

func (h *Handler) organizerActor(c fiber.Ctx) (orgID, actorID uuid.UUID, actorName string, err error) {
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
	organizer, err := h.q.GetOrganizerByID(c.Context(), actorID)
	if err != nil {
		return uuid.Nil, uuid.Nil, "", apperr.Unauthorized("")
	}
	return orgID, actorID, organizer.FullName, nil
}
