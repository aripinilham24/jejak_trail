package event

import (
	"strings"
	"time"

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

func (h *Handler) List(c fiber.Ctx) error {
	page, limit, offset := httpx.PageParams(c)
	filter := ListFilter{
		Query:              c.Query("q"),
		Province:           c.Query("province"),
		City:               c.Query("city"),
		EventType:          c.Query("type"),
		Month:              c.Query("month"),
		Difficulty:         c.Query("difficulty"),
		RegistrationStatus: c.Query("registrationStatus"),
		SortBy:             c.Query("sort"),
		MinPrice:           httpx.QueryInt64(c, "minPrice"),
		MaxPrice:           httpx.QueryInt64(c, "maxPrice"),
		Page:               page,
		Limit:              limit,
		Offset:             offset,
	}
	if err := validateListFilter(filter); err != nil {
		return err
	}

	events, total, err := h.service.ListPublic(c.Context(), filter)
	if err != nil {
		return err
	}
	return httpx.List(c, events, httpx.Meta{Page: page, Limit: limit, Total: total})
}

func (h *Handler) Detail(c fiber.Ctx) error {
	e, err := h.service.GetPublicBySlug(c.Context(), c.Params("slug"))
	if err != nil {
		return err
	}
	return httpx.OK(c, e)
}

func (h *Handler) Calendar(c fiber.Ctx) error {
	from := time.Now().AddDate(0, 0, -7)
	to := time.Now().AddDate(0, 3, 0)

	if raw := strings.TrimSpace(c.Query("from")); raw != "" {
		parsed, err := parseCalendarDate(raw)
		if err != nil {
			return apperr.Validation(map[string]string{"from": "Format tanggal harus YYYY-MM-DD atau RFC3339."})
		}
		from = parsed
	}
	if raw := strings.TrimSpace(c.Query("to")); raw != "" {
		parsed, err := parseCalendarDate(raw)
		if err != nil {
			return apperr.Validation(map[string]string{"to": "Format tanggal harus YYYY-MM-DD atau RFC3339."})
		}
		to = parsed
	}
	if !from.Before(to) {
		return apperr.Validation(map[string]string{"to": "Tanggal akhir harus setelah tanggal awal."})
	}

	events, err := h.service.Calendar(c.Context(), from, to)
	if err != nil {
		return err
	}
	return httpx.OK(c, events)
}

func (h *Handler) Meta(c fiber.Ctx) error {
	meta, err := h.service.Meta(c.Context())
	if err != nil {
		return err
	}
	return httpx.OK(c, meta)
}

func (h *Handler) AdminList(c fiber.Ctx) error {
	page, limit, offset := httpx.PageParams(c)
	filter := ListFilter{
		Status:    c.Query("status"),
		Query:     c.Query("q"),
		EventType: c.Query("type"),
		Page:      page,
		Limit:     limit,
		Offset:    offset,
	}
	if filter.EventType != "" && filter.EventType != "native" && filter.EventType != "external" {
		return apperr.Validation(map[string]string{"type": "Nilai harus native atau external."})
	}
	if filter.Status != "" && !validEventStatus(filter.Status) {
		return apperr.Validation(map[string]string{"status": "Status event tidak dikenal."})
	}

	events, total, err := h.service.AdminList(c.Context(), filter)
	if err != nil {
		return err
	}
	return httpx.List(c, events, httpx.Meta{Page: page, Limit: limit, Total: total})
}

func (h *Handler) AdminGet(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Event tidak ditemukan.")
	}
	e, err := h.service.AdminGet(c.Context(), id)
	if err != nil {
		return err
	}
	return httpx.OK(c, e)
}

type externalEventRequest struct {
	Title        string  `json:"title"`
	Description  string  `json:"description"`
	LocationName string  `json:"locationName"`
	Province     string  `json:"province"`
	City         string  `json:"city"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	EventStartAt string  `json:"eventStartAt"`
	EventEndAt   string  `json:"eventEndAt"`
	ExternalURL  string  `json:"externalUrl"`
	CoverKey     *string `json:"coverKey"`
	IsFeatured   bool    `json:"isFeatured"`
	Terms        string  `json:"terms"`
}

func (h *Handler) CreateExternal(c fiber.Ctx) error {
	actorID, actorName, err := h.adminActor(c)
	if err != nil {
		return err
	}

	var req externalEventRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	e, err := h.service.CreateExternal(c.Context(), actorID, actorName, c.IP(), ExternalEventInput{
		Title:        req.Title,
		Description:  req.Description,
		LocationName: req.LocationName,
		Province:     req.Province,
		City:         req.City,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
		EventStartAt: req.EventStartAt,
		EventEndAt:   req.EventEndAt,
		ExternalURL:  req.ExternalURL,
		CoverKey:     req.CoverKey,
		IsFeatured:   req.IsFeatured,
		Terms:        req.Terms,
	})
	if err != nil {
		return err
	}
	return httpx.Created(c, e)
}

func (h *Handler) UpdateExternal(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Event tidak ditemukan.")
	}
	actorID, actorName, err := h.adminActor(c)
	if err != nil {
		return err
	}

	var req externalEventRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	e, err := h.service.UpdateExternal(c.Context(), actorID, actorName, c.IP(), id, ExternalEventInput{
		Title:        req.Title,
		Description:  req.Description,
		LocationName: req.LocationName,
		Province:     req.Province,
		City:         req.City,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
		EventStartAt: req.EventStartAt,
		EventEndAt:   req.EventEndAt,
		ExternalURL:  req.ExternalURL,
		CoverKey:     req.CoverKey,
		IsFeatured:   req.IsFeatured,
		Terms:        req.Terms,
	})
	if err != nil {
		return err
	}
	return httpx.OK(c, e)
}

func (h *Handler) DeleteExternal(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Event tidak ditemukan.")
	}
	actorID, actorName, err := h.adminActor(c)
	if err != nil {
		return err
	}

	if err := h.service.DeleteExternal(c.Context(), actorID, actorName, c.IP(), id); err != nil {
		return err
	}
	return httpx.NoContent(c)
}

type reviewRequest struct {
	Approve bool   `json:"approve"`
	Note    string `json:"note"`
}

func (h *Handler) Review(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Event tidak ditemukan.")
	}
	actorID, actorName, err := h.adminActor(c)
	if err != nil {
		return err
	}

	var req reviewRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	e, err := h.service.Review(c.Context(), actorID, actorName, c.IP(), id, req.Approve, req.Note)
	if err != nil {
		return err
	}
	return httpx.OK(c, e)
}

func (h *Handler) AdminListOrganizations(c fiber.Ctx) error {
	page, limit, offset := httpx.PageParams(c)
	status := c.Query("status")
	if status != "" && status != "pending" && status != "verified" && status != "rejected" {
		return apperr.Validation(map[string]string{"status": "Nilai harus pending, verified, atau rejected."})
	}

	orgs, total, err := h.service.ListOrganizations(c.Context(), status, c.Query("q"), page, limit, offset)
	if err != nil {
		return err
	}
	return httpx.List(c, orgs, httpx.Meta{Page: page, Limit: limit, Total: total})
}

func (h *Handler) AdminGetOrganization(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Organisasi tidak ditemukan.")
	}
	org, err := h.service.GetOrganization(c.Context(), id)
	if err != nil {
		return err
	}
	return httpx.OK(c, org)
}

type verifyOrganizationRequest struct {
	Approve bool   `json:"approve"`
	Reason  string `json:"reason"`
}

func (h *Handler) AdminVerifyOrganization(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Organisasi tidak ditemukan.")
	}
	actorID, actorName, err := h.adminActor(c)
	if err != nil {
		return err
	}

	var req verifyOrganizationRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	org, err := h.service.VerifyOrganization(c.Context(), actorID, actorName, c.IP(), id, req.Approve, req.Reason)
	if err != nil {
		return err
	}
	return httpx.OK(c, org)
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
	return id, h.service.AdminName(c.Context(), id), nil
}

func validateListFilter(f ListFilter) error {
	fields := map[string]string{}
	if f.EventType != "" && f.EventType != "native" && f.EventType != "external" {
		fields["type"] = "Nilai harus native atau external."
	}
	if f.SortBy != "" && f.SortBy != "event_date" && f.SortBy != "newest" && f.SortBy != "title" {
		fields["sort"] = "Nilai harus event_date, newest, atau title."
	}
	if f.Month != "" {
		if _, err := time.Parse("2006-01", f.Month); err != nil {
			fields["month"] = "Format bulan harus YYYY-MM."
		}
	}
	if f.RegistrationStatus != "" && f.RegistrationStatus != "open" && f.RegistrationStatus != "closed" {
		fields["registrationStatus"] = "Nilai harus open atau closed."
	}
	if f.MinPrice != nil && *f.MinPrice < 0 {
		fields["minPrice"] = "Harga minimal tidak boleh negatif."
	}
	if f.MaxPrice != nil && *f.MaxPrice < 0 {
		fields["maxPrice"] = "Harga maksimal tidak boleh negatif."
	}
	if f.MinPrice != nil && f.MaxPrice != nil && *f.MinPrice > *f.MaxPrice {
		fields["maxPrice"] = "Harga maksimal harus lebih besar dari harga minimal."
	}
	if len(fields) > 0 {
		return apperr.Validation(fields)
	}
	return nil
}

func validEventStatus(status string) bool {
	switch status {
	case "draft", "pending_review", "published", "registration_closed", "cancelled", "completed", "suspended":
		return true
	default:
		return false
	}
}

func parseCalendarDate(raw string) (time.Time, error) {
	if t, err := time.Parse("2006-01-02", raw); err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339, raw)
}
