package event

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/aripinilham/jejak_trail/backend/internal/audit"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
)

type BuilderRequirementInput struct {
	RequirementType string
	Label           string
	Description     string
	IsRequired      bool
	SortOrder       int32
}

type BuilderCategoryInput struct {
	Name                  string
	DistanceKm            float64
	ElevationGainM        int32
	Difficulty            string
	Price                 int64
	Quota                 int32
	MinAge                int32
	CutoffMinutes         int32
	RequiresQualification bool
	BibPrefix             string
	BibStart              int32
	BibEnd                int32
	Requirements          []BuilderRequirementInput
}

type BuilderFormFieldInput struct {
	FieldKey    string
	Label       string
	FieldType   string
	Options     []string
	IsRequired  bool
	IsSensitive bool
	SortOrder   int32
}

type BuilderRefundRuleInput struct {
	DaysBeforeEventMin int32
	DaysBeforeEventMax *int32
	RefundPercent      int32
}

type BuilderRefundPolicyInput struct {
	Name        string
	PolicyType  string
	Description string
	Rules       []BuilderRefundRuleInput
}

type BuilderInput struct {
	Title               string
	Description         string
	LocationName        string
	Province            string
	City                string
	Latitude            float64
	Longitude           float64
	EventStartAt        string
	EventEndAt          string
	RegistrationOpenAt  string
	RegistrationCloseAt string
	CoverKey            *string
	RouteGpxKey         *string
	RouteProfile        []RoutePointDTO
	MandatoryGear       []string
	Terms               string
	RefundPolicy        *BuilderRefundPolicyInput
	Categories          []BuilderCategoryInput
	FormFields          []BuilderFormFieldInput
}

func (s *Service) ListOrganizationEvents(ctx context.Context, organizationID uuid.UUID, status, query string, page, limit int, offset int32) ([]EventDTO, int64, error) {
	events, err := s.q.ListEventsByOrganization(ctx, gen.ListEventsByOrganizationParams{
		OrganizationID: &organizationID,
		Status:         optString(status),
		Q:              optString(query),
		PageLimit:      int32(limit),
		PageOffset:     offset,
	})
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	count, err := s.q.CountEventsByOrganization(ctx, gen.CountEventsByOrganizationParams{
		OrganizationID: &organizationID,
		Status:         optString(status),
		Q:              optString(query),
	})
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	dtos, err := s.buildList(ctx, events)
	if err != nil {
		return nil, 0, err
	}
	return dtos, count, nil
}

func (s *Service) GetOrganizationEvent(ctx context.Context, organizationID, eventID uuid.UUID) (EventDTO, error) {
	e, err := s.q.GetEventByIDForOrganization(ctx, gen.GetEventByIDForOrganizationParams{
		ID:             eventID,
		OrganizationID: &organizationID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EventDTO{}, apperr.NotFound("Event tidak ditemukan.")
		}
		return EventDTO{}, apperr.Internal(err)
	}
	return s.buildDetail(ctx, e)
}

func (s *Service) CreateOrganizationEvent(
	ctx context.Context,
	actorID uuid.UUID,
	organizationID uuid.UUID,
	actorName, ip string,
	in BuilderInput,
) (EventDTO, error) {
	org, err := s.q.GetOrganizationByID(ctx, organizationID)
	if err != nil {
		return EventDTO{}, apperr.Internal(err)
	}
	if org.VerificationStatus != "verified" || org.Status != "active" {
		return EventDTO{}, apperr.Forbidden("Organisasi harus terverifikasi dan aktif sebelum membuat event.")
	}

	payload, err := validateBuilderInput(in)
	if err != nil {
		return EventDTO{}, err
	}

	slug, err := s.uniqueSlug(ctx, in.Title)
	if err != nil {
		return EventDTO{}, err
	}

	var created gen.Event
	err = s.db.WithTx(ctx, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)

		refundPolicyID, err := createRefundPolicy(ctx, q, organizationID, in.RefundPolicy)
		if err != nil {
			return err
		}

		event, err := q.CreateEvent(ctx, gen.CreateEventParams{
			OrganizationID:      &organizationID,
			EventType:           "native",
			Title:               strings.TrimSpace(in.Title),
			Slug:                slug,
			Description:         strings.TrimSpace(in.Description),
			LocationName:        strings.TrimSpace(in.LocationName),
			Province:            strings.TrimSpace(in.Province),
			City:                strings.TrimSpace(in.City),
			Latitude:            in.Latitude,
			Longitude:           in.Longitude,
			EventStartAt:        payload.eventStart,
			EventEndAt:          payload.eventEnd,
			RegistrationOpenAt:  payload.registrationOpen,
			RegistrationCloseAt: payload.registrationClose,
			Status:              "draft",
			RouteProfile:        payload.routeProfile,
			MandatoryGear:       payload.mandatoryGear,
			Terms:               strings.TrimSpace(in.Terms),
			IsFeatured:          false,
			RefundPolicyID:      refundPolicyID,
		})
		if err != nil {
			return err
		}
		created = event

		if err := createChildren(ctx, q, event.ID, in); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return EventDTO{}, apperr.Internal(err)
	}

	s.audit.Write(ctx, audit.Entry{
		ActorType:  "organizer",
		ActorID:    &actorID,
		ActorName:  actorName,
		Action:     "event.create_draft",
		EntityType: "events",
		EntityID:   &created.ID,
		After:      map[string]any{"title": created.Title, "slug": created.Slug, "status": created.Status},
		IPAddress:  ip,
	})

	return s.buildDetail(ctx, created)
}

func (s *Service) UpdateOrganizationEvent(
	ctx context.Context,
	actorID uuid.UUID,
	organizationID uuid.UUID,
	eventID uuid.UUID,
	actorName, ip string,
	in BuilderInput,
) (EventDTO, error) {
	before, err := s.q.GetEventByIDForOrganization(ctx, gen.GetEventByIDForOrganizationParams{
		ID:             eventID,
		OrganizationID: &organizationID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EventDTO{}, apperr.NotFound("Event tidak ditemukan.")
		}
		return EventDTO{}, apperr.Internal(err)
	}
	if before.Status != "draft" {
		return EventDTO{}, apperr.Conflict("Hanya event berstatus draft yang dapat diubah.")
	}
	org, err := s.q.GetOrganizationByID(ctx, organizationID)
	if err != nil {
		return EventDTO{}, apperr.Internal(err)
	}
	if org.VerificationStatus != "verified" || org.Status != "active" {
		return EventDTO{}, apperr.Forbidden("Organisasi harus terverifikasi dan aktif untuk mengubah event.")
	}

	payload, err := validateBuilderInput(in)
	if err != nil {
		return EventDTO{}, err
	}

	var updated gen.Event
	err = s.db.WithTx(ctx, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)

		total, err := q.CountRegistrationsByEventID(ctx, eventID)
		if err != nil {
			return err
		}
		if total > 0 {
			return apperr.Conflict("Event yang sudah memiliki pendaftar tidak dapat diganti kategorinya.")
		}

		if before.RefundPolicyID != nil {
			if err := q.ClearEventRefundPolicy(ctx, eventID); err != nil {
				return err
			}
			if err := q.DeleteRefundPolicy(ctx, gen.DeleteRefundPolicyParams{
				ID:             *before.RefundPolicyID,
				OrganizationID: organizationID,
			}); err != nil {
				return err
			}
		}
		if err := q.DeleteEventCategoriesByEventID(ctx, eventID); err != nil {
			return err
		}
		if err := q.DeleteRegistrationFormFieldsByEventID(ctx, eventID); err != nil {
			return err
		}

		refundPolicyID, err := createRefundPolicy(ctx, q, organizationID, in.RefundPolicy)
		if err != nil {
			return err
		}

		event, err := q.UpdateEvent(ctx, gen.UpdateEventParams{
			ID:                  eventID,
			Title:               strings.TrimSpace(in.Title),
			Slug:                before.Slug,
			Description:         strings.TrimSpace(in.Description),
			LocationName:        strings.TrimSpace(in.LocationName),
			Province:            strings.TrimSpace(in.Province),
			City:                strings.TrimSpace(in.City),
			Latitude:            in.Latitude,
			Longitude:           in.Longitude,
			EventStartAt:        payload.eventStart,
			EventEndAt:          payload.eventEnd,
			RegistrationOpenAt:  payload.registrationOpen,
			RegistrationCloseAt: payload.registrationClose,
			CoverKey:            in.CoverKey,
			RouteGpxKey:         in.RouteGpxKey,
			RouteProfile:        payload.routeProfile,
			MandatoryGear:       payload.mandatoryGear,
			Terms:               strings.TrimSpace(in.Terms),
			RefundPolicyID:      refundPolicyID,
			IsFeatured:          before.IsFeatured,
		})
		if err != nil {
			return err
		}
		updated = event

		return createChildren(ctx, q, eventID, in)
	})
	if err != nil {
		return EventDTO{}, err
	}

	s.audit.Write(ctx, audit.Entry{
		ActorType:  "organizer",
		ActorID:    &actorID,
		ActorName:  actorName,
		Action:     "event.update_draft",
		EntityType: "events",
		EntityID:   &eventID,
		Before:     map[string]any{"title": before.Title, "status": before.Status},
		After:      map[string]any{"title": updated.Title, "status": updated.Status},
		IPAddress:  ip,
	})

	return s.buildDetail(ctx, updated)
}

func (s *Service) SubmitOrganizationEvent(ctx context.Context, actorID, organizationID, eventID uuid.UUID, actorName, ip string) (EventDTO, error) {
	org, err := s.q.GetOrganizationByID(ctx, organizationID)
	if err != nil {
		return EventDTO{}, apperr.Internal(err)
	}
	if org.VerificationStatus != "verified" || org.Status != "active" {
		return EventDTO{}, apperr.Forbidden("Organisasi harus terverifikasi dan aktif sebelum mengirim event untuk review.")
	}

	e, err := s.q.GetEventByIDForOrganization(ctx, gen.GetEventByIDForOrganizationParams{
		ID:             eventID,
		OrganizationID: &organizationID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EventDTO{}, apperr.NotFound("Event tidak ditemukan.")
		}
		return EventDTO{}, apperr.Internal(err)
	}
	if e.Status != "draft" {
		return EventDTO{}, apperr.Conflict("Hanya event draft yang dapat dikirim untuk review.")
	}

	categories, err := s.q.ListEventCategoriesByEventID(ctx, eventID)
	if err != nil {
		return EventDTO{}, apperr.Internal(err)
	}
	if len(categories) == 0 {
		return EventDTO{}, apperr.Validation(map[string]string{"categories": "Tambahkan minimal satu kategori sebelum mengirim event."})
	}
	if e.RefundPolicyID == nil {
		return EventDTO{}, apperr.Validation(map[string]string{"refundPolicy": "Kebijakan refund wajib diisi sebelum mengirim event."})
	}

	if _, err := s.q.SetEventStatus(ctx, gen.SetEventStatusParams{
		ID:     eventID,
		Status: "pending_review",
	}); err != nil {
		return EventDTO{}, apperr.Internal(err)
	}

	s.audit.Write(ctx, audit.Entry{
		ActorType:  "organizer",
		ActorID:    &actorID,
		ActorName:  actorName,
		Action:     "event.submit_review",
		EntityType: "events",
		EntityID:   &eventID,
		Before:     map[string]any{"status": e.Status},
		After:      map[string]any{"status": "pending_review"},
		IPAddress:  ip,
	})

	return s.GetOrganizationEvent(ctx, organizationID, eventID)
}

type builderPayload struct {
	eventStart        time.Time
	eventEnd          time.Time
	registrationOpen  *time.Time
	registrationClose *time.Time
	routeProfile      []byte
	mandatoryGear     []byte
}

func validateBuilderInput(in BuilderInput) (builderPayload, error) {
	var payload builderPayload
	fields := map[string]string{}

	if strings.TrimSpace(in.Title) == "" {
		fields["title"] = "Judul event wajib diisi."
	}
	if strings.TrimSpace(in.LocationName) == "" {
		fields["locationName"] = "Lokasi wajib diisi."
	}
	if strings.TrimSpace(in.Province) == "" {
		fields["province"] = "Provinsi wajib diisi."
	}
	if strings.TrimSpace(in.City) == "" {
		fields["city"] = "Kota wajib diisi."
	}
	if len(in.Categories) == 0 {
		fields["categories"] = "Minimal satu kategori wajib diisi."
	}

	start, err := time.Parse(time.RFC3339, in.EventStartAt)
	if err != nil {
		fields["eventStartAt"] = "Format harus RFC3339."
	}
	end, err := time.Parse(time.RFC3339, in.EventEndAt)
	if err != nil {
		fields["eventEndAt"] = "Format harus RFC3339."
	}
	if len(fields) == 0 && !start.Before(end) {
		fields["eventEndAt"] = "Waktu selesai harus setelah waktu mulai."
	}
	payload.eventStart = start
	payload.eventEnd = end

	open, err := parseOptionalTime(in.RegistrationOpenAt)
	if err != nil {
		fields["registrationOpenAt"] = "Format harus RFC3339."
	}
	closeAt, err := parseOptionalTime(in.RegistrationCloseAt)
	if err != nil {
		fields["registrationCloseAt"] = "Format harus RFC3339."
	}
	if open != nil && closeAt != nil && !open.Before(*closeAt) {
		fields["registrationCloseAt"] = "Penutupan pendaftaran harus setelah pembukaan."
	}
	if closeAt != nil && !closeAt.Before(start) {
		fields["registrationCloseAt"] = "Pendaftaran harus ditutup sebelum event dimulai."
	}
	payload.registrationOpen = open
	payload.registrationClose = closeAt

	seenCategory := map[string]bool{}
	for i, category := range in.Categories {
		prefix := fmt.Sprintf("categories.%d.", i)
		name := strings.TrimSpace(category.Name)
		if name == "" {
			fields[prefix+"name"] = "Nama kategori wajib diisi."
		} else if seenCategory[strings.ToLower(name)] {
			fields[prefix+"name"] = "Nama kategori tidak boleh ganda."
		}
		seenCategory[strings.ToLower(name)] = true

		if category.DistanceKm <= 0 {
			fields[prefix+"distanceKm"] = "Jarak harus lebih dari 0."
		}
		if category.Price < 0 {
			fields[prefix+"price"] = "Harga tidak boleh negatif."
		}
		if category.Quota <= 0 {
			fields[prefix+"quota"] = "Kuota harus lebih dari 0."
		}
		if !validDifficulty(category.Difficulty) {
			fields[prefix+"difficulty"] = "Difficulty harus easy, moderate, hard, atau extreme."
		}
		if strings.TrimSpace(category.BibPrefix) == "" {
			fields[prefix+"bibPrefix"] = "Prefix BIB wajib diisi."
		}
		if category.BibStart < 0 || category.BibEnd < category.BibStart {
			fields[prefix+"bibStart"] = "Rentang BIB tidak valid."
		}

		for j, requirement := range category.Requirements {
			reqPrefix := fmt.Sprintf("%srequirements.%d.", prefix, j)
			if !validRequirementType(requirement.RequirementType) {
				fields[reqPrefix+"requirementType"] = "Tipe syarat tidak dikenal."
			}
			if strings.TrimSpace(requirement.Label) == "" {
				fields[reqPrefix+"label"] = "Label syarat wajib diisi."
			}
		}
	}

	seenField := map[string]bool{}
	for i, field := range in.FormFields {
		prefix := fmt.Sprintf("formFields.%d.", i)
		key := strings.TrimSpace(field.FieldKey)
		if key == "" {
			fields[prefix+"fieldKey"] = "Field key wajib diisi."
		} else if seenField[key] {
			fields[prefix+"fieldKey"] = "Field key tidak boleh ganda."
		}
		seenField[key] = true
		if strings.TrimSpace(field.Label) == "" {
			fields[prefix+"label"] = "Label field wajib diisi."
		}
		if !validFieldType(field.FieldType) {
			fields[prefix+"fieldType"] = "Tipe field tidak dikenal."
		}
		if field.FieldType == "select" && len(field.Options) == 0 {
			fields[prefix+"options"] = "Field select membutuhkan opsi."
		}
	}

	if in.RefundPolicy != nil {
		policy := in.RefundPolicy
		if !validPolicyType(policy.PolicyType) {
			fields["refundPolicy.policyType"] = "Tipe kebijakan refund tidak dikenal."
		}
		if strings.TrimSpace(policy.Name) == "" {
			fields["refundPolicy.name"] = "Nama kebijakan refund wajib diisi."
		}
		if policy.PolicyType == "tiered" && len(policy.Rules) == 0 {
			fields["refundPolicy.rules"] = "Kebijakan bertingkat membutuhkan minimal satu aturan."
		}
		for i, rule := range policy.Rules {
			prefix := fmt.Sprintf("refundPolicy.rules.%d.", i)
			if rule.DaysBeforeEventMin < 0 {
				fields[prefix+"daysBeforeEventMin"] = "Nilai hari tidak boleh negatif."
			}
			if rule.DaysBeforeEventMax != nil && *rule.DaysBeforeEventMax < rule.DaysBeforeEventMin {
				fields[prefix+"daysBeforeEventMax"] = "Batas maksimum harus >= minimum."
			}
			if rule.RefundPercent < 0 || rule.RefundPercent > 100 {
				fields[prefix+"refundPercent"] = "Persentase refund harus 0-100."
			}
		}
	}

	if len(fields) > 0 {
		return payload, apperr.Validation(fields)
	}

	payload.routeProfile, _ = json.Marshal(in.RouteProfile)
	if payload.routeProfile == nil {
		payload.routeProfile = []byte("[]")
	}
	payload.mandatoryGear, _ = json.Marshal(in.MandatoryGear)
	if payload.mandatoryGear == nil {
		payload.mandatoryGear = []byte("[]")
	}
	return payload, nil
}

func createRefundPolicy(ctx context.Context, q *gen.Queries, organizationID uuid.UUID, in *BuilderRefundPolicyInput) (*uuid.UUID, error) {
	if in == nil {
		return nil, nil
	}
	name := strings.TrimSpace(in.Name)
	version, err := q.GetNextRefundPolicyVersion(ctx, gen.GetNextRefundPolicyVersionParams{
		OrganizationID: organizationID,
		Name:           name,
	})
	if err != nil {
		return nil, err
	}
	policy, err := q.CreateRefundPolicy(ctx, gen.CreateRefundPolicyParams{
		OrganizationID: organizationID,
		Name:           name,
		PolicyType:     in.PolicyType,
		Description:    strings.TrimSpace(in.Description),
		Version:        version,
	})
	if err != nil {
		return nil, err
	}
	if in.PolicyType == "tiered" {
		for _, rule := range in.Rules {
			if _, err := q.CreateRefundPolicyRule(ctx, gen.CreateRefundPolicyRuleParams{
				PolicyID:           policy.ID,
				DaysBeforeEventMin: rule.DaysBeforeEventMin,
				DaysBeforeEventMax: rule.DaysBeforeEventMax,
				RefundPercent:      rule.RefundPercent,
			}); err != nil {
				return nil, err
			}
		}
	}
	return &policy.ID, nil
}

func createChildren(ctx context.Context, q *gen.Queries, eventID uuid.UUID, in BuilderInput) error {
	for _, category := range in.Categories {
		bibEnd := category.BibEnd
		if bibEnd == 0 {
			bibEnd = category.Quota
		}
		bibStart := category.BibStart
		if bibStart == 0 {
			bibStart = 1
		}
		created, err := q.CreateEventCategory(ctx, gen.CreateEventCategoryParams{
			EventID:               eventID,
			Name:                  strings.TrimSpace(category.Name),
			DistanceKm:            category.DistanceKm,
			ElevationGainM:        category.ElevationGainM,
			Difficulty:            category.Difficulty,
			Price:                 category.Price,
			Quota:                 category.Quota,
			MinAge:                category.MinAge,
			CutoffMinutes:         category.CutoffMinutes,
			RequiresQualification: category.RequiresQualification,
			BibPrefix:             strings.TrimSpace(category.BibPrefix),
			BibStart:              bibStart,
			BibEnd:                bibEnd,
			BibNext:               bibStart,
		})
		if err != nil {
			return err
		}
		for _, requirement := range category.Requirements {
			if _, err := q.CreateQualificationRequirement(ctx, gen.CreateQualificationRequirementParams{
				CategoryID:      created.ID,
				RequirementType: requirement.RequirementType,
				Label:           strings.TrimSpace(requirement.Label),
				Description:     strings.TrimSpace(requirement.Description),
				IsRequired:      requirement.IsRequired,
				SortOrder:       requirement.SortOrder,
			}); err != nil {
				return err
			}
		}
	}

	for _, field := range in.FormFields {
		options, _ := json.Marshal(field.Options)
		if options == nil {
			options = []byte("[]")
		}
		if _, err := q.CreateRegistrationFormField(ctx, gen.CreateRegistrationFormFieldParams{
			EventID:     eventID,
			FieldKey:    strings.TrimSpace(field.FieldKey),
			Label:       strings.TrimSpace(field.Label),
			FieldType:   field.FieldType,
			Options:     options,
			IsRequired:  field.IsRequired,
			IsSensitive: field.IsSensitive,
			SortOrder:   field.SortOrder,
		}); err != nil {
			return err
		}
	}
	return nil
}

func parseOptionalTime(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func validDifficulty(value string) bool {
	switch value {
	case "easy", "moderate", "hard", "extreme":
		return true
	default:
		return false
	}
}

func validRequirementType(value string) bool {
	switch value {
	case "finisher_certificate", "race_result_link", "profile_link", "medical_certificate", "custom_text":
		return true
	default:
		return false
	}
}

func validFieldType(value string) bool {
	switch value {
	case "text", "number", "select", "date", "file", "textarea", "checkbox":
		return true
	default:
		return false
	}
}

func validPolicyType(value string) bool {
	switch value {
	case "tiered", "no_refund", "full_refund":
		return true
	default:
		return false
	}
}
