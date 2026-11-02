package checkin

import (
	"context"

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

func (h *Handler) Manifest(c fiber.Ctx) error {
	orgID, _, _, err := h.organizerActor(c)
	if err != nil {
		return err
	}
	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Event tidak ditemukan.")
	}

	manifest, err := h.service.Manifest(c.Context(), orgID, eventID)
	if err != nil {
		return err
	}
	return httpx.OK(c, manifest)
}

type scanRequest struct {
	QRCode             string `json:"qrCode"`
	PickupType         string `json:"pickupType"`
	RepresentativeName string `json:"representativeName"`
	RepresentativeNote string `json:"representativeNote"`
	ClientID           string `json:"clientId"`
	CreatedOffline     bool   `json:"createdOffline"`
	ScannedAt          string `json:"scannedAt"`
}

func (h *Handler) Scan(c fiber.Ctx) error {
	orgID, actorID, actorName, err := h.organizerActor(c)
	if err != nil {
		return err
	}

	var req scanRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	result, err := h.service.Scan(c.Context(), orgID, actorID, actorName, toScanInput(req))
	if err != nil {
		return err
	}
	return httpx.OK(c, result)
}

type syncRequest struct {
	Items []scanRequest `json:"items"`
}

func (h *Handler) Sync(c fiber.Ctx) error {
	orgID, actorID, actorName, err := h.organizerActor(c)
	if err != nil {
		return err
	}

	var req syncRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}
	if len(req.Items) == 0 {
		return apperr.Validation(map[string]string{"items": "Minimal satu item check-in."})
	}

	inputs := make([]ScanInput, 0, len(req.Items))
	for _, item := range req.Items {
		inputs = append(inputs, toScanInput(item))
	}
	results := h.service.Sync(c.Context(), orgID, actorID, actorName, inputs)
	return httpx.OK(c, fiber.Map{"results": results})
}

func toScanInput(req scanRequest) ScanInput {
	return ScanInput{
		QRCode:             req.QRCode,
		PickupType:         req.PickupType,
		RepresentativeName: req.RepresentativeName,
		RepresentativeNote: req.RepresentativeNote,
		ClientID:           req.ClientID,
		CreatedOffline:     req.CreatedOffline,
		ScannedAt:          req.ScannedAt,
	}
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
	return orgID, actorID, h.organizerName(c.Context(), actorID), nil
}

func (h *Handler) organizerName(ctx context.Context, id uuid.UUID) string {
	organizer, err := h.q.GetOrganizerByID(ctx, id)
	if err != nil {
		return "Petugas Racepack"
	}
	return organizer.FullName
}
