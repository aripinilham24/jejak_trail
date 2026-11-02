package event

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/auth"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/httpx"
)

type builderRequest struct {
	Title               string                   `json:"title"`
	Description         string                   `json:"description"`
	LocationName        string                   `json:"locationName"`
	Province            string                   `json:"province"`
	City                string                   `json:"city"`
	Latitude            float64                  `json:"latitude"`
	Longitude           float64                  `json:"longitude"`
	EventStartAt        string                   `json:"eventStartAt"`
	EventEndAt          string                   `json:"eventEndAt"`
	RegistrationOpenAt  string                   `json:"registrationOpenAt"`
	RegistrationCloseAt string                   `json:"registrationCloseAt"`
	CoverKey            *string                  `json:"coverKey"`
	RouteGpxKey         *string                  `json:"routeGpxKey"`
	RouteProfile        []RoutePointDTO          `json:"routeProfile"`
	MandatoryGear       []string                 `json:"mandatoryGear"`
	Terms               string                   `json:"terms"`
	RefundPolicy        *builderPolicyRequest    `json:"refundPolicy"`
	Categories          []builderCategoryRequest `json:"categories"`
	FormFields          []builderFieldRequest    `json:"formFields"`
}

type builderPolicyRequest struct {
	Name        string               `json:"name"`
	PolicyType  string               `json:"policyType"`
	Description string               `json:"description"`
	Rules       []builderRuleRequest `json:"rules"`
}

type builderRuleRequest struct {
	DaysBeforeEventMin int32  `json:"daysBeforeEventMin"`
	DaysBeforeEventMax *int32 `json:"daysBeforeEventMax"`
	RefundPercent      int32  `json:"refundPercent"`
}

type builderCategoryRequest struct {
	Name                  string                      `json:"name"`
	DistanceKm            float64                     `json:"distanceKm"`
	ElevationGainM        int32                       `json:"elevationGainM"`
	Difficulty            string                      `json:"difficulty"`
	Price                 int64                       `json:"price"`
	Quota                 int32                       `json:"quota"`
	MinAge                int32                       `json:"minAge"`
	CutoffMinutes         int32                       `json:"cutoffMinutes"`
	RequiresQualification bool                        `json:"requiresQualification"`
	BibPrefix             string                      `json:"bibPrefix"`
	BibStart              int32                       `json:"bibStart"`
	BibEnd                int32                       `json:"bibEnd"`
	Requirements          []builderRequirementRequest `json:"requirements"`
}

type builderRequirementRequest struct {
	RequirementType string `json:"requirementType"`
	Label           string `json:"label"`
	Description     string `json:"description"`
	IsRequired      bool   `json:"isRequired"`
	SortOrder       int32  `json:"sortOrder"`
}

type builderFieldRequest struct {
	FieldKey    string   `json:"fieldKey"`
	Label       string   `json:"label"`
	FieldType   string   `json:"fieldType"`
	Options     []string `json:"options"`
	IsRequired  bool     `json:"isRequired"`
	IsSensitive bool     `json:"isSensitive"`
	SortOrder   int32    `json:"sortOrder"`
}

func (h *Handler) OrganizerList(c fiber.Ctx) error {
	orgID, _, _, err := h.organizerActor(c)
	if err != nil {
		return err
	}

	page, limit, offset := httpx.PageParams(c)
	status := c.Query("status")
	if status != "" && !validEventStatus(status) {
		return apperr.Validation(map[string]string{"status": "Status event tidak dikenal."})
	}

	events, total, err := h.service.ListOrganizationEvents(c.Context(), orgID, status, c.Query("q"), page, limit, offset)
	if err != nil {
		return err
	}
	return httpx.List(c, events, httpx.Meta{Page: page, Limit: limit, Total: total})
}

func (h *Handler) OrganizerGet(c fiber.Ctx) error {
	orgID, _, _, err := h.organizerActor(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Event tidak ditemukan.")
	}

	e, err := h.service.GetOrganizationEvent(c.Context(), orgID, id)
	if err != nil {
		return err
	}
	return httpx.OK(c, e)
}

func (h *Handler) OrganizerCreate(c fiber.Ctx) error {
	orgID, actorID, actorName, err := h.organizerActor(c)
	if err != nil {
		return err
	}

	var req builderRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	e, err := h.service.CreateOrganizationEvent(c.Context(), actorID, orgID, actorName, c.IP(), toBuilderInput(req))
	if err != nil {
		return err
	}
	return httpx.Created(c, e)
}

func (h *Handler) OrganizerUpdate(c fiber.Ctx) error {
	orgID, actorID, actorName, err := h.organizerActor(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Event tidak ditemukan.")
	}

	var req builderRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	e, err := h.service.UpdateOrganizationEvent(c.Context(), actorID, orgID, id, actorName, c.IP(), toBuilderInput(req))
	if err != nil {
		return err
	}
	return httpx.OK(c, e)
}

func (h *Handler) OrganizerSubmit(c fiber.Ctx) error {
	orgID, actorID, actorName, err := h.organizerActor(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperr.NotFound("Event tidak ditemukan.")
	}

	e, err := h.service.SubmitOrganizationEvent(c.Context(), actorID, orgID, id, actorName, c.IP())
	if err != nil {
		return err
	}
	return httpx.OK(c, e)
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

func toBuilderInput(req builderRequest) BuilderInput {
	input := BuilderInput{
		Title:               req.Title,
		Description:         req.Description,
		LocationName:        req.LocationName,
		Province:            req.Province,
		City:                req.City,
		Latitude:            req.Latitude,
		Longitude:           req.Longitude,
		EventStartAt:        req.EventStartAt,
		EventEndAt:          req.EventEndAt,
		RegistrationOpenAt:  req.RegistrationOpenAt,
		RegistrationCloseAt: req.RegistrationCloseAt,
		CoverKey:            req.CoverKey,
		RouteGpxKey:         req.RouteGpxKey,
		RouteProfile:        req.RouteProfile,
		MandatoryGear:       req.MandatoryGear,
		Terms:               req.Terms,
	}

	if req.RefundPolicy != nil {
		policy := &BuilderRefundPolicyInput{
			Name:        req.RefundPolicy.Name,
			PolicyType:  req.RefundPolicy.PolicyType,
			Description: req.RefundPolicy.Description,
		}
		for _, rule := range req.RefundPolicy.Rules {
			policy.Rules = append(policy.Rules, BuilderRefundRuleInput{
				DaysBeforeEventMin: rule.DaysBeforeEventMin,
				DaysBeforeEventMax: rule.DaysBeforeEventMax,
				RefundPercent:      rule.RefundPercent,
			})
		}
		input.RefundPolicy = policy
	}

	for _, category := range req.Categories {
		item := BuilderCategoryInput{
			Name:                  category.Name,
			DistanceKm:            category.DistanceKm,
			ElevationGainM:        category.ElevationGainM,
			Difficulty:            category.Difficulty,
			Price:                 category.Price,
			Quota:                 category.Quota,
			MinAge:                category.MinAge,
			CutoffMinutes:         category.CutoffMinutes,
			RequiresQualification: category.RequiresQualification,
			BibPrefix:             category.BibPrefix,
			BibStart:              category.BibStart,
			BibEnd:                category.BibEnd,
		}
		for _, requirement := range category.Requirements {
			item.Requirements = append(item.Requirements, BuilderRequirementInput{
				RequirementType: requirement.RequirementType,
				Label:           requirement.Label,
				Description:     requirement.Description,
				IsRequired:      requirement.IsRequired,
				SortOrder:       requirement.SortOrder,
			})
		}
		input.Categories = append(input.Categories, item)
	}

	for _, field := range req.FormFields {
		input.FormFields = append(input.FormFields, BuilderFormFieldInput{
			FieldKey:    field.FieldKey,
			Label:       field.Label,
			FieldType:   field.FieldType,
			Options:     field.Options,
			IsRequired:  field.IsRequired,
			IsSensitive: field.IsSensitive,
			SortOrder:   field.SortOrder,
		})
	}

	return input
}
