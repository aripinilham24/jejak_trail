package event

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
)

type EventDTO struct {
	ID                  string           `json:"id"`
	OrganizationID      *string          `json:"organizationId"`
	ReviewedBy          *string          `json:"reviewedBy,omitempty"`
	EventType           string           `json:"eventType"`
	Title               string           `json:"title"`
	Slug                string           `json:"slug"`
	Description         string           `json:"description"`
	LocationName        string           `json:"locationName"`
	Province            string           `json:"province"`
	City                string           `json:"city"`
	Latitude            float64          `json:"latitude"`
	Longitude           float64          `json:"longitude"`
	EventStartAt        string           `json:"eventStartAt"`
	EventEndAt          string           `json:"eventEndAt"`
	RegistrationOpenAt  *string          `json:"registrationOpenAt"`
	RegistrationCloseAt *string          `json:"registrationCloseAt"`
	Status              string           `json:"status"`
	ExternalURL         *string          `json:"externalUrl,omitempty"`
	CoverURL            string           `json:"coverUrl"`
	RouteGpxURL         *string          `json:"routeGpxUrl,omitempty"`
	MandatoryGear       []string         `json:"mandatoryGear"`
	Terms               string           `json:"terms"`
	IsFeatured          bool             `json:"isFeatured"`
	RefundPolicyID      *string          `json:"refundPolicyId,omitempty"`
	PublishedAt         *string          `json:"publishedAt,omitempty"`
	CreatedAt           string           `json:"createdAt"`
	SourceUpdatedAt     *string          `json:"sourceUpdatedAt,omitempty"`
	Categories          []CategoryDTO    `json:"categories"`
	Requirements        []RequirementDTO `json:"requirements"`
	FormFields          []FormFieldDTO   `json:"formFields"`
	RefundPolicy        *RefundPolicyDTO `json:"refundPolicy,omitempty"`
	RouteProfile        []RoutePointDTO  `json:"routeProfile"`
	OrganizerName       string           `json:"organizerName"`
	OrganizerVerified   bool             `json:"organizerVerified"`
	ParticipantCount    int32            `json:"participantCount"`
	CategoryCounts      map[string]int32 `json:"categoryCounts,omitempty"`
}

type CategoryDTO struct {
	ID                    string  `json:"id"`
	EventID               string  `json:"eventId"`
	Name                  string  `json:"name"`
	DistanceKm            float64 `json:"distanceKm"`
	ElevationGainM        int32   `json:"elevationGainM"`
	Difficulty            string  `json:"difficulty"`
	Price                 int64   `json:"price"`
	Quota                 int32   `json:"quota"`
	MinAge                int32   `json:"minAge"`
	CutoffMinutes         int32   `json:"cutoffMinutes"`
	RequiresQualification bool    `json:"requiresQualification"`
	BibPrefix             string  `json:"bibPrefix"`
	BibNext               int32   `json:"bibNext"`
}

type RequirementDTO struct {
	ID              string `json:"id"`
	CategoryID      string `json:"categoryId"`
	RequirementType string `json:"requirementType"`
	Label           string `json:"label"`
	Description     string `json:"description"`
	IsRequired      bool   `json:"isRequired"`
	SortOrder       int32  `json:"sortOrder"`
}

type FormFieldDTO struct {
	ID          string   `json:"id"`
	EventID     string   `json:"eventId"`
	FieldKey    string   `json:"fieldKey"`
	Label       string   `json:"label"`
	FieldType   string   `json:"fieldType"`
	Options     []string `json:"options"`
	IsRequired  bool     `json:"isRequired"`
	IsSensitive bool     `json:"isSensitive"`
	SortOrder   int32    `json:"sortOrder"`
}

type RefundPolicyDTO struct {
	ID             string          `json:"id"`
	OrganizationID string          `json:"organizationId"`
	Name           string          `json:"name"`
	PolicyType     string          `json:"policyType"`
	Description    string          `json:"description"`
	Version        int32           `json:"version"`
	CreatedAt      string          `json:"createdAt"`
	Rules          []RefundRuleDTO `json:"rules"`
}

type RefundRuleDTO struct {
	ID                 string `json:"id"`
	PolicyID           string `json:"policyId"`
	DaysBeforeEventMin int32  `json:"daysBeforeEventMin"`
	DaysBeforeEventMax *int32 `json:"daysBeforeEventMax"`
	RefundPercent      int32  `json:"refundPercent"`
}

type RoutePointDTO struct {
	Km        float64 `json:"km"`
	Elevation float64 `json:"elevation"`
}

type OrganizationAdminDTO struct {
	ID                 string           `json:"id"`
	Name               string           `json:"name"`
	OrgType            string           `json:"orgType"`
	OfficialEmail      string           `json:"officialEmail"`
	Phone              string           `json:"phone"`
	Address            string           `json:"address"`
	Province           string           `json:"province"`
	City               string           `json:"city"`
	LegalDocKey        *string          `json:"legalDocKey,omitempty"`
	VerificationStatus string           `json:"verificationStatus"`
	VerifiedBy         *string          `json:"verifiedBy,omitempty"`
	VerifiedAt         *string          `json:"verifiedAt,omitempty"`
	RejectionReason    *string          `json:"rejectionReason,omitempty"`
	Status             string           `json:"status"`
	CreatedAt          string           `json:"createdAt"`
	EventCount         int32            `json:"eventCount"`
	BankAccounts       []BankAccountDTO `json:"bankAccounts"`
}

type BankAccountDTO struct {
	ID                  string `json:"id"`
	OrganizationID      string `json:"organizationId"`
	BankName            string `json:"bankName"`
	AccountNumberMasked string `json:"accountNumberMasked"`
	AccountHolder       string `json:"accountHolder"`
	VerificationStatus  string `json:"verificationStatus"`
	IsActive            bool   `json:"isActive"`
}

func toEventDTO(e gen.Event, org *gen.Organization, participantCount int32) EventDTO {
	dto := EventDTO{
		ID:                  e.ID.String(),
		OrganizationID:      uuidPtr(e.OrganizationID),
		ReviewedBy:          uuidPtr(e.ReviewedBy),
		EventType:           e.EventType,
		Title:               e.Title,
		Slug:                e.Slug,
		Description:         e.Description,
		LocationName:        e.LocationName,
		Province:            e.Province,
		City:                e.City,
		Latitude:            e.Latitude,
		Longitude:           e.Longitude,
		EventStartAt:        ts(e.EventStartAt),
		EventEndAt:          ts(e.EventEndAt),
		RegistrationOpenAt:  tsp(e.RegistrationOpenAt),
		RegistrationCloseAt: tsp(e.RegistrationCloseAt),
		Status:              e.Status,
		ExternalURL:         e.ExternalUrl,
		CoverURL:            "",
		RouteGpxURL:         nil,
		MandatoryGear:       []string{},
		Terms:               e.Terms,
		IsFeatured:          e.IsFeatured,
		RefundPolicyID:      uuidPtr(e.RefundPolicyID),
		PublishedAt:         tsp(e.PublishedAt),
		CreatedAt:           ts(e.CreatedAt),
		SourceUpdatedAt:     tsp(e.SourceUpdatedAt),
		Categories:          []CategoryDTO{},
		Requirements:        []RequirementDTO{},
		FormFields:          []FormFieldDTO{},
		RouteProfile:        []RoutePointDTO{},
		OrganizerName:       "Event eksternal",
		OrganizerVerified:   true,
		ParticipantCount:    participantCount,
	}
	_ = json.Unmarshal(e.MandatoryGear, &dto.MandatoryGear)
	_ = json.Unmarshal(e.RouteProfile, &dto.RouteProfile)
	if dto.MandatoryGear == nil {
		dto.MandatoryGear = []string{}
	}
	if dto.RouteProfile == nil {
		dto.RouteProfile = []RoutePointDTO{}
	}
	if org != nil {
		dto.OrganizerName = org.Name
		dto.OrganizerVerified = org.VerificationStatus == "verified"
	}
	return dto
}

func toCategoryDTO(c gen.EventCategory) CategoryDTO {
	return CategoryDTO{
		ID:                    c.ID.String(),
		EventID:               c.EventID.String(),
		Name:                  c.Name,
		DistanceKm:            c.DistanceKm,
		ElevationGainM:        c.ElevationGainM,
		Difficulty:            c.Difficulty,
		Price:                 c.Price,
		Quota:                 c.Quota,
		MinAge:                c.MinAge,
		CutoffMinutes:         c.CutoffMinutes,
		RequiresQualification: c.RequiresQualification,
		BibPrefix:             c.BibPrefix,
		BibNext:               c.BibNext,
	}
}

func toRequirementDTO(r gen.QualificationRequirement) RequirementDTO {
	return RequirementDTO{
		ID:              r.ID.String(),
		CategoryID:      r.CategoryID.String(),
		RequirementType: r.RequirementType,
		Label:           r.Label,
		Description:     r.Description,
		IsRequired:      r.IsRequired,
		SortOrder:       r.SortOrder,
	}
}

func toFormFieldDTO(f gen.RegistrationFormField) FormFieldDTO {
	options := []string{}
	_ = json.Unmarshal(f.Options, &options)
	if options == nil {
		options = []string{}
	}
	return FormFieldDTO{
		ID:          f.ID.String(),
		EventID:     f.EventID.String(),
		FieldKey:    f.FieldKey,
		Label:       f.Label,
		FieldType:   f.FieldType,
		Options:     options,
		IsRequired:  f.IsRequired,
		IsSensitive: f.IsSensitive,
		SortOrder:   f.SortOrder,
	}
}

func toRefundPolicyDTO(p gen.RefundPolicy, rules []gen.RefundPolicyRule) RefundPolicyDTO {
	out := RefundPolicyDTO{
		ID:             p.ID.String(),
		OrganizationID: p.OrganizationID.String(),
		Name:           p.Name,
		PolicyType:     p.PolicyType,
		Description:    p.Description,
		Version:        p.Version,
		CreatedAt:      ts(p.CreatedAt),
		Rules:          []RefundRuleDTO{},
	}
	for _, rule := range rules {
		out.Rules = append(out.Rules, RefundRuleDTO{
			ID:                 rule.ID.String(),
			PolicyID:           rule.PolicyID.String(),
			DaysBeforeEventMin: rule.DaysBeforeEventMin,
			DaysBeforeEventMax: rule.DaysBeforeEventMax,
			RefundPercent:      rule.RefundPercent,
		})
	}
	return out
}

func toOrganizationAdminDTO(o gen.Organization, eventCount int32, banks []gen.OrganizationBankAccount) OrganizationAdminDTO {
	out := OrganizationAdminDTO{
		ID:                 o.ID.String(),
		Name:               o.Name,
		OrgType:            o.OrgType,
		OfficialEmail:      o.OfficialEmail,
		Phone:              o.Phone,
		Address:            o.Address,
		Province:           o.Province,
		City:               o.City,
		LegalDocKey:        o.LegalDocKey,
		VerificationStatus: o.VerificationStatus,
		VerifiedBy:         uuidPtr(o.VerifiedBy),
		VerifiedAt:         tsp(o.VerifiedAt),
		RejectionReason:    o.RejectionReason,
		Status:             o.Status,
		CreatedAt:          ts(o.CreatedAt),
		EventCount:         eventCount,
		BankAccounts:       []BankAccountDTO{},
	}
	for _, bank := range banks {
		out.BankAccounts = append(out.BankAccounts, BankAccountDTO{
			ID:                  bank.ID.String(),
			OrganizationID:      bank.OrganizationID.String(),
			BankName:            bank.BankName,
			AccountNumberMasked: "****" + bank.AccountNumberLast4,
			AccountHolder:       bank.AccountHolder,
			VerificationStatus:  bank.VerificationStatus,
			IsActive:            bank.IsActive,
		})
	}
	return out
}

func ts(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

func tsp(t *time.Time) *string {
	if t == nil {
		return nil
	}
	v := t.UTC().Format(time.RFC3339)
	return &v
}

func uuidPtr(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	v := id.String()
	return &v
}
