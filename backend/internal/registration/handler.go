package registration

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

type submitRequest struct {
	CategoryID     string                 `json:"categoryId"`
	FullName       string                 `json:"fullName"`
	BirthDate      string                 `json:"birthDate"`
	Answers        []answerRequest        `json:"answers"`
	Qualifications []qualificationRequest `json:"qualifications"`
}

type answerRequest struct {
	FieldID string `json:"fieldId"`
	Value   string `json:"value"`
}

type qualificationRequest struct {
	RequirementID string `json:"requirementId"`
	ValueText     string `json:"valueText"`
	FileKey       string `json:"fileKey"`
	ExternalLink  string `json:"externalLink"`
}

func (h *Handler) Submit(c fiber.Ctx) error {
	claims, ok := auth.ClaimsFrom(c)
	if !ok {
		return apperr.Unauthorized("")
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return apperr.Unauthorized("")
	}

	var req submitRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	categoryID, err := uuid.Parse(req.CategoryID)
	if err != nil {
		return apperr.Validation(map[string]string{"categoryId": "Kategori tidak valid."})
	}

	answers := make([]AnswerInput, 0, len(req.Answers))
	for _, answer := range req.Answers {
		fieldID, err := uuid.Parse(answer.FieldID)
		if err != nil {
			return apperr.Validation(map[string]string{"answers": "Field ID tidak valid."})
		}
		answers = append(answers, AnswerInput{FieldID: fieldID, Value: answer.Value})
	}

	qualifications := make([]QualificationInput, 0, len(req.Qualifications))
	for _, qualification := range req.Qualifications {
		requirementID, err := uuid.Parse(qualification.RequirementID)
		if err != nil {
			return apperr.Validation(map[string]string{"qualifications": "Requirement ID tidak valid."})
		}
		qualifications = append(qualifications, QualificationInput{
			RequirementID: requirementID,
			ValueText:     qualification.ValueText,
			FileKey:       qualification.FileKey,
			ExternalLink:  qualification.ExternalLink,
		})
	}

	reg, err := h.service.SubmitByEventSlug(c.Context(), userID, c.Params("slug"), SubmitInput{
		CategoryID:     categoryID,
		FullName:       req.FullName,
		BirthDate:      req.BirthDate,
		Answers:        answers,
		Qualifications: qualifications,
	})
	if err != nil {
		return err
	}
	return httpx.Created(c, reg)
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

	regs, err := h.service.ListForUser(c.Context(), userID)
	if err != nil {
		return err
	}
	return httpx.List(c, regs, httpx.Meta{Page: 1, Limit: len(regs), Total: int64(len(regs))})
}

func (h *Handler) GetMine(c fiber.Ctx) error {
	claims, ok := auth.ClaimsFrom(c)
	if !ok {
		return apperr.Unauthorized("")
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return apperr.Unauthorized("")
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Pendaftaran tidak ditemukan.")
	}

	reg, err := h.service.GetForUser(c.Context(), userID, id)
	if err != nil {
		return err
	}
	return httpx.OK(c, reg)
}

func (h *Handler) OrganizerList(c fiber.Ctx) error {
	orgID, _, _, err := h.organizerActor(c)
	if err != nil {
		return err
	}

	page, limit, offset := httpx.PageParams(c)
	var eventID *uuid.UUID
	if raw := c.Query("eventId"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return apperr.Validation(map[string]string{"eventId": "Event ID tidak valid."})
		}
		eventID = &parsed
	}
	status := c.Query("status")
	if status != "" && !validStatus(status) {
		return apperr.Validation(map[string]string{"status": "Status pendaftaran tidak dikenal."})
	}

	regs, total, err := h.service.ListForOrganization(c.Context(), orgID, eventID, status, c.Query("q"), page, limit, offset)
	if err != nil {
		return err
	}
	return httpx.List(c, regs, httpx.Meta{Page: page, Limit: limit, Total: total})
}

func (h *Handler) OrganizerGet(c fiber.Ctx) error {
	orgID, _, _, err := h.organizerActor(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Pendaftaran tidak ditemukan.")
	}
	reg, err := h.service.GetForOrganization(c.Context(), orgID, id)
	if err != nil {
		return err
	}
	return httpx.OK(c, reg)
}

type reviewRequest struct {
	Reason string `json:"reason"`
}

func (h *Handler) OrganizerApprove(c fiber.Ctx) error {
	orgID, actorID, actorName, err := h.organizerActor(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Pendaftaran tidak ditemukan.")
	}

	reg, err := h.service.Review(c.Context(), orgID, id, ReviewInput{
		Approve: true,
		ActorID: actorID,
		Actor:   actorName,
	})
	if err != nil {
		return err
	}
	return httpx.OK(c, reg)
}

func (h *Handler) OrganizerReject(c fiber.Ctx) error {
	orgID, actorID, actorName, err := h.organizerActor(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Pendaftaran tidak ditemukan.")
	}

	var req reviewRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	reg, err := h.service.Review(c.Context(), orgID, id, ReviewInput{
		Approve: false,
		Reason:  req.Reason,
		ActorID: actorID,
		Actor:   actorName,
	})
	if err != nil {
		return err
	}
	return httpx.OK(c, reg)
}

func (h *Handler) organizerActor(c fiber.Ctx) (orgID, actorID uuid.UUID, actorName string, err error) {
	claims, ok := auth.ClaimsFrom(c)
	if !ok || claims.OrganizationID == "" {
		return uuid.Nil, uuid.Nil, "", apperr.Unauthorized("")
	}
	orgID, parseErr := uuid.Parse(claims.OrganizationID)
	if parseErr != nil {
		return uuid.Nil, uuid.Nil, "", apperr.Unauthorized("")
	}
	actorID, parseErr = uuid.Parse(claims.Subject)
	if parseErr != nil {
		return uuid.Nil, uuid.Nil, "", apperr.Unauthorized("")
	}
	return orgID, actorID, h.service.OrganizerName(c.Context(), actorID), nil
}

func validStatus(status string) bool {
	switch status {
	case "pending_verification", "approved", "awaiting_payment", "paid", "rejected", "expired", "waitlisted", "cancelled", "refunded", "checked_in":
		return true
	default:
		return false
	}
}
