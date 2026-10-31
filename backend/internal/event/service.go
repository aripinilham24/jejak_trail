package event

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/aripinilham/jejak_trail/backend/internal/audit"
	"github.com/aripinilham/jejak_trail/backend/internal/config"
	"github.com/aripinilham/jejak_trail/backend/internal/db"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
	"github.com/aripinilham/jejak_trail/backend/internal/storage"
)

type Service struct {
	db      *db.DB
	q       *gen.Queries
	audit   *audit.Writer
	cfg     *config.Config
	storage storage.Storage
}

func NewService(database *db.DB, auditWriter *audit.Writer, cfg *config.Config, store storage.Storage) *Service {
	return &Service{
		db:      database,
		q:       gen.New(database.Pool),
		audit:   auditWriter,
		cfg:     cfg,
		storage: store,
	}
}

type ListFilter struct {
	Status             string
	Query              string
	Province           string
	City               string
	EventType          string
	Month              string
	Difficulty         string
	RegistrationStatus string
	SortBy             string
	MinPrice           *int64
	MaxPrice           *int64
	Page               int
	Limit              int
	Offset             int32
}

type MetaDTO struct {
	Provinces    []string  `json:"provinces"`
	Cities       []CityDTO `json:"cities"`
	Difficulties []string  `json:"difficulties"`
}

type CityDTO struct {
	Province string `json:"province"`
	City     string `json:"city"`
}

func (s *Service) ListPublic(ctx context.Context, f ListFilter) ([]EventDTO, int64, error) {
	params := gen.ListPublishedEventsParams{
		Q:                  optString(f.Query),
		Province:           optString(f.Province),
		City:               optString(f.City),
		EventType:          optString(f.EventType),
		Month:              optString(f.Month),
		Difficulty:         optString(f.Difficulty),
		MinPrice:           f.MinPrice,
		MaxPrice:           f.MaxPrice,
		RegistrationStatus: optString(f.RegistrationStatus),
		SortBy:             defaultString(f.SortBy, "event_date"),
		PageOffset:         f.Offset,
		PageLimit:          int32(f.Limit),
	}

	events, err := s.q.ListPublishedEvents(ctx, params)
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}

	count, err := s.q.CountPublishedEvents(ctx, gen.CountPublishedEventsParams{
		Q:                  params.Q,
		Province:           params.Province,
		City:               params.City,
		EventType:          params.EventType,
		Month:              params.Month,
		Difficulty:         params.Difficulty,
		MinPrice:           params.MinPrice,
		MaxPrice:           params.MaxPrice,
		RegistrationStatus: params.RegistrationStatus,
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

func (s *Service) GetPublicBySlug(ctx context.Context, slug string) (EventDTO, error) {
	e, err := s.q.GetPublicEventBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EventDTO{}, apperr.NotFound("Event tidak ditemukan.")
		}
		return EventDTO{}, apperr.Internal(err)
	}
	return s.buildDetail(ctx, e)
}

func (s *Service) Calendar(ctx context.Context, from, to time.Time) ([]EventDTO, error) {
	events, err := s.q.ListPublishedEventsInRange(ctx, gen.ListPublishedEventsInRangeParams{
		RangeStart: from,
		RangeEnd:   to,
	})
	if err != nil {
		return nil, apperr.Internal(err)
	}
	return s.buildList(ctx, events)
}

func (s *Service) Meta(ctx context.Context) (MetaDTO, error) {
	locations, err := s.q.ListPublishedEventLocations(ctx)
	if err != nil {
		return MetaDTO{}, apperr.Internal(err)
	}
	difficulties, err := s.q.ListPublishedDifficulties(ctx)
	if err != nil {
		return MetaDTO{}, apperr.Internal(err)
	}

	meta := MetaDTO{
		Provinces:    []string{},
		Cities:       []CityDTO{},
		Difficulties: difficulties,
	}
	seenProvince := map[string]bool{}
	for _, loc := range locations {
		if !seenProvince[loc.Province] {
			seenProvince[loc.Province] = true
			meta.Provinces = append(meta.Provinces, loc.Province)
		}
		meta.Cities = append(meta.Cities, CityDTO{Province: loc.Province, City: loc.City})
	}
	if meta.Difficulties == nil {
		meta.Difficulties = []string{}
	}
	return meta, nil
}

func (s *Service) AdminList(ctx context.Context, f ListFilter) ([]EventDTO, int64, error) {
	params := gen.ListAdminEventsParams{
		Status:     optString(f.Status),
		EventType:  optString(f.EventType),
		Q:          optString(f.Query),
		PageOffset: f.Offset,
		PageLimit:  int32(f.Limit),
	}

	events, err := s.q.ListAdminEvents(ctx, params)
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	count, err := s.q.CountAdminEvents(ctx, gen.CountAdminEventsParams{
		Status:    params.Status,
		EventType: params.EventType,
		Q:         params.Q,
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

func (s *Service) AdminGet(ctx context.Context, id uuid.UUID) (EventDTO, error) {
	e, err := s.q.GetEventByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EventDTO{}, apperr.NotFound("Event tidak ditemukan.")
		}
		return EventDTO{}, apperr.Internal(err)
	}
	return s.buildDetail(ctx, e)
}

type ExternalEventInput struct {
	Title        string
	Description  string
	LocationName string
	Province     string
	City         string
	Latitude     float64
	Longitude    float64
	EventStartAt string
	EventEndAt   string
	ExternalURL  string
	CoverKey     *string
	IsFeatured   bool
	Terms        string
}

func (s *Service) CreateExternal(ctx context.Context, adminID uuid.UUID, adminName, ip string, in ExternalEventInput) (EventDTO, error) {
	start, end, err := validateExternalInput(in)
	if err != nil {
		return EventDTO{}, err
	}

	slug, err := s.uniqueSlug(ctx, in.Title)
	if err != nil {
		return EventDTO{}, err
	}

	now := time.Now()
	externalURL := strings.TrimSpace(in.ExternalURL)
	terms := in.Terms
	if strings.TrimSpace(terms) == "" {
		terms = "Informasi lengkap mengikuti halaman resmi penyelenggara."
	}

	e, err := s.q.CreateEvent(ctx, gen.CreateEventParams{
		OrganizationID:      nil,
		ReviewedBy:          &adminID,
		EventType:           "external",
		Title:               strings.TrimSpace(in.Title),
		Slug:                slug,
		Description:         strings.TrimSpace(in.Description),
		LocationName:        strings.TrimSpace(in.LocationName),
		Province:            strings.TrimSpace(in.Province),
		City:                strings.TrimSpace(in.City),
		Latitude:            in.Latitude,
		Longitude:           in.Longitude,
		EventStartAt:        start,
		EventEndAt:          end,
		RegistrationOpenAt:  nil,
		RegistrationCloseAt: nil,
		Status:              "published",
		ExternalUrl:         &externalURL,
		CoverKey:            in.CoverKey,
		RouteProfile:        []byte("[]"),
		MandatoryGear:       []byte("[]"),
		Terms:               terms,
		IsFeatured:          in.IsFeatured,
		PublishedAt:         &now,
		SourceUpdatedAt:     &now,
	})
	if err != nil {
		return EventDTO{}, apperr.Internal(err)
	}

	s.audit.Write(ctx, audit.Entry{
		ActorType:  "admin",
		ActorID:    &adminID,
		ActorName:  adminName,
		Action:     "external_event.create",
		EntityType: "events",
		EntityID:   &e.ID,
		After:      map[string]any{"title": e.Title, "slug": e.Slug, "status": e.Status},
		IPAddress:  ip,
	})

	return s.buildDetail(ctx, e)
}

func (s *Service) UpdateExternal(ctx context.Context, adminID uuid.UUID, adminName, ip string, id uuid.UUID, in ExternalEventInput) (EventDTO, error) {
	before, err := s.q.GetEventByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EventDTO{}, apperr.NotFound("Event tidak ditemukan.")
		}
		return EventDTO{}, apperr.Internal(err)
	}
	if before.EventType != "external" {
		return EventDTO{}, apperr.Conflict("Hanya event eksternal yang dapat diubah lewat endpoint ini.")
	}

	start, end, err := validateExternalInput(in)
	if err != nil {
		return EventDTO{}, err
	}

	externalURL := strings.TrimSpace(in.ExternalURL)
	e, err := s.q.UpdateExternalEvent(ctx, gen.UpdateExternalEventParams{
		ID:           id,
		Title:        strings.TrimSpace(in.Title),
		Description:  strings.TrimSpace(in.Description),
		LocationName: strings.TrimSpace(in.LocationName),
		Province:     strings.TrimSpace(in.Province),
		City:         strings.TrimSpace(in.City),
		Latitude:     in.Latitude,
		Longitude:    in.Longitude,
		EventStartAt: start,
		EventEndAt:   end,
		ExternalUrl:  &externalURL,
		CoverKey:     in.CoverKey,
	})
	if err != nil {
		return EventDTO{}, apperr.Internal(err)
	}

	s.audit.Write(ctx, audit.Entry{
		ActorType:  "admin",
		ActorID:    &adminID,
		ActorName:  adminName,
		Action:     "external_event.update",
		EntityType: "events",
		EntityID:   &id,
		Before:     map[string]any{"title": before.Title, "externalUrl": before.ExternalUrl},
		After:      map[string]any{"title": e.Title, "externalUrl": e.ExternalUrl},
		IPAddress:  ip,
	})

	return s.buildDetail(ctx, e)
}

func (s *Service) DeleteExternal(ctx context.Context, adminID uuid.UUID, adminName, ip string, id uuid.UUID) error {
	before, err := s.q.GetEventByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperr.NotFound("Event tidak ditemukan.")
		}
		return apperr.Internal(err)
	}
	if before.EventType != "external" {
		return apperr.Conflict("Hanya event eksternal yang dapat dihapus lewat endpoint ini.")
	}

	if err := s.q.DeleteEvent(ctx, id); err != nil {
		return apperr.Internal(err)
	}
	s.audit.Write(ctx, audit.Entry{
		ActorType:  "admin",
		ActorID:    &adminID,
		ActorName:  adminName,
		Action:     "external_event.delete",
		EntityType: "events",
		EntityID:   &id,
		Before:     map[string]any{"title": before.Title, "slug": before.Slug},
		IPAddress:  ip,
	})
	return nil
}

func (s *Service) Review(ctx context.Context, adminID uuid.UUID, adminName, ip string, id uuid.UUID, approve bool, note string) (EventDTO, error) {
	before, err := s.q.GetEventByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EventDTO{}, apperr.NotFound("Event tidak ditemukan.")
		}
		return EventDTO{}, apperr.Internal(err)
	}
	if before.Status != "pending_review" {
		return EventDTO{}, apperr.Conflict("Hanya event berstatus pending_review yang dapat direview.")
	}

	status := "draft"
	action := "event.request_revision"
	if approve {
		status = "published"
		action = "event.publish"
	}

	e, err := s.q.ReviewEvent(ctx, gen.ReviewEventParams{
		ID:         id,
		Status:     status,
		ReviewedBy: &adminID,
	})
	if err != nil {
		return EventDTO{}, apperr.Internal(err)
	}

	s.audit.Write(ctx, audit.Entry{
		ActorType:  "admin",
		ActorID:    &adminID,
		ActorName:  adminName,
		Action:     action,
		EntityType: "events",
		EntityID:   &id,
		Before:     map[string]any{"status": before.Status},
		After:      map[string]any{"status": e.Status, "note": note},
		IPAddress:  ip,
	})

	return s.buildDetail(ctx, e)
}

func (s *Service) ListOrganizations(ctx context.Context, verificationStatus, query string, page, limit int, offset int32) ([]OrganizationAdminDTO, int64, error) {
	rows, err := s.q.ListOrganizations(ctx, gen.ListOrganizationsParams{
		VerificationStatus: optString(verificationStatus),
		Q:                  optString(query),
		PageLimit:          int32(limit),
		PageOffset:         offset,
	})
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	count, err := s.q.CountOrganizations(ctx, gen.CountOrganizationsParams{
		VerificationStatus: optString(verificationStatus),
		Q:                  optString(query),
	})
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}

	out := make([]OrganizationAdminDTO, 0, len(rows))
	for _, row := range rows {
		org := gen.Organization{
			ID:                 row.ID,
			Name:               row.Name,
			OrgType:            row.OrgType,
			OfficialEmail:      row.OfficialEmail,
			Phone:              row.Phone,
			Address:            row.Address,
			Province:           row.Province,
			City:               row.City,
			LegalDocKey:        row.LegalDocKey,
			VerificationStatus: row.VerificationStatus,
			VerifiedBy:         row.VerifiedBy,
			VerifiedAt:         row.VerifiedAt,
			RejectionReason:    row.RejectionReason,
			Status:             row.Status,
			CreatedAt:          row.CreatedAt,
			UpdatedAt:          row.UpdatedAt,
		}
		out = append(out, toOrganizationAdminDTO(org, row.EventCount, nil))
	}
	return out, count, nil
}

func (s *Service) GetOrganization(ctx context.Context, id uuid.UUID) (OrganizationAdminDTO, error) {
	row, err := s.q.GetOrganizationWithEventCount(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return OrganizationAdminDTO{}, apperr.NotFound("Organisasi tidak ditemukan.")
		}
		return OrganizationAdminDTO{}, apperr.Internal(err)
	}
	banks, err := s.q.ListBankAccountsByOrganization(ctx, id)
	if err != nil {
		return OrganizationAdminDTO{}, apperr.Internal(err)
	}
	org := gen.Organization{
		ID:                 row.ID,
		Name:               row.Name,
		OrgType:            row.OrgType,
		OfficialEmail:      row.OfficialEmail,
		Phone:              row.Phone,
		Address:            row.Address,
		Province:           row.Province,
		City:               row.City,
		LegalDocKey:        row.LegalDocKey,
		VerificationStatus: row.VerificationStatus,
		VerifiedBy:         row.VerifiedBy,
		VerifiedAt:         row.VerifiedAt,
		RejectionReason:    row.RejectionReason,
		Status:             row.Status,
		CreatedAt:          row.CreatedAt,
		UpdatedAt:          row.UpdatedAt,
	}
	return toOrganizationAdminDTO(org, row.EventCount, banks), nil
}

func (s *Service) VerifyOrganization(ctx context.Context, adminID uuid.UUID, adminName, ip string, id uuid.UUID, approve bool, reason string) (OrganizationAdminDTO, error) {
	before, err := s.q.GetOrganizationByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return OrganizationAdminDTO{}, apperr.NotFound("Organisasi tidak ditemukan.")
		}
		return OrganizationAdminDTO{}, apperr.Internal(err)
	}

	status := "rejected"
	if approve {
		status = "verified"
	} else if strings.TrimSpace(reason) == "" {
		return OrganizationAdminDTO{}, apperr.Validation(map[string]string{"reason": "Alasan penolakan wajib diisi."})
	}

	var rejectionReason *string
	if !approve {
		rejectionReason = &reason
	}

	if _, err := s.q.VerifyOrganization(ctx, gen.VerifyOrganizationParams{
		ID:                 id,
		VerificationStatus: status,
		VerifiedBy:         &adminID,
		RejectionReason:    rejectionReason,
	}); err != nil {
		return OrganizationAdminDTO{}, apperr.Internal(err)
	}

	bank, bankErr := s.q.GetActiveBankAccountByOrganization(ctx, id)
	if bankErr == nil {
		_, _ = s.q.SetBankAccountVerification(ctx, gen.SetBankAccountVerificationParams{
			ID:                 bank.ID,
			VerificationStatus: status,
			VerifiedBy:         &adminID,
		})
	}

	action := "organization.reject"
	if approve {
		action = "organization.verify"
	}
	s.audit.Write(ctx, audit.Entry{
		ActorType:  "admin",
		ActorID:    &adminID,
		ActorName:  adminName,
		Action:     action,
		EntityType: "organizations",
		EntityID:   &id,
		Before:     map[string]any{"verificationStatus": before.VerificationStatus},
		After:      map[string]any{"verificationStatus": status, "reason": reason},
		IPAddress:  ip,
	})

	return s.GetOrganization(ctx, id)
}

func (s *Service) buildList(ctx context.Context, events []gen.Event) ([]EventDTO, error) {
	if len(events) == 0 {
		return []EventDTO{}, nil
	}

	ids := make([]uuid.UUID, 0, len(events))
	orgIDs := make([]uuid.UUID, 0, len(events))
	seenOrg := map[uuid.UUID]bool{}
	for _, e := range events {
		ids = append(ids, e.ID)
		if e.OrganizationID != nil && !seenOrg[*e.OrganizationID] {
			seenOrg[*e.OrganizationID] = true
			orgIDs = append(orgIDs, *e.OrganizationID)
		}
	}

	categories, err := s.q.ListEventCategoriesByEventIDs(ctx, ids)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	categoriesByEvent := map[uuid.UUID][]CategoryDTO{}
	for _, c := range categories {
		categoriesByEvent[c.EventID] = append(categoriesByEvent[c.EventID], toCategoryDTO(c))
	}

	counts, err := s.q.ListRegistrationCountsByEventIDs(ctx, ids)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	participantCount := map[uuid.UUID]int32{}
	categoryCounts := map[uuid.UUID]map[string]int32{}
	for _, row := range counts {
		participantCount[row.EventID] += row.RegistrationCount
		if categoryCounts[row.EventID] == nil {
			categoryCounts[row.EventID] = map[string]int32{}
		}
		categoryCounts[row.EventID][row.CategoryID.String()] = row.RegistrationCount
	}

	orgs := map[uuid.UUID]gen.Organization{}
	if len(orgIDs) > 0 {
		rows, err := s.q.ListOrganizationsByIDs(ctx, orgIDs)
		if err != nil {
			return nil, apperr.Internal(err)
		}
		for _, org := range rows {
			orgs[org.ID] = org
		}
	}

	out := make([]EventDTO, 0, len(events))
	for _, e := range events {
		var org *gen.Organization
		if e.OrganizationID != nil {
			if value, ok := orgs[*e.OrganizationID]; ok {
				org = &value
			}
		}
		dto := toEventDTO(e, org, participantCount[e.ID])
		dto.Categories = categoriesByEvent[e.ID]
		if dto.Categories == nil {
			dto.Categories = []CategoryDTO{}
		}
		if counts := categoryCounts[e.ID]; counts != nil {
			dto.CategoryCounts = counts
		}
		s.attachURLs(ctx, &dto, e)
		out = append(out, dto)
	}
	return out, nil
}

func (s *Service) buildDetail(ctx context.Context, e gen.Event) (EventDTO, error) {
	var org *gen.Organization
	if e.OrganizationID != nil {
		value, err := s.q.GetOrganizationByID(ctx, *e.OrganizationID)
		if err == nil {
			org = &value
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return EventDTO{}, apperr.Internal(err)
		}
	}

	categories, err := s.q.ListEventCategoriesByEventID(ctx, e.ID)
	if err != nil {
		return EventDTO{}, apperr.Internal(err)
	}
	categoryIDs := make([]uuid.UUID, 0, len(categories))
	for _, c := range categories {
		categoryIDs = append(categoryIDs, c.ID)
	}

	requirements := []gen.QualificationRequirement{}
	if len(categoryIDs) > 0 {
		requirements, err = s.q.ListQualificationRequirementsByCategoryIDs(ctx, categoryIDs)
		if err != nil {
			return EventDTO{}, apperr.Internal(err)
		}
	}

	fields, err := s.q.ListRegistrationFormFieldsByEventID(ctx, e.ID)
	if err != nil {
		return EventDTO{}, apperr.Internal(err)
	}

	counts, err := s.q.ListRegistrationCountsByEventID(ctx, e.ID)
	if err != nil {
		return EventDTO{}, apperr.Internal(err)
	}
	var participantCount int32
	categoryCounts := map[string]int32{}
	for _, row := range counts {
		participantCount += row.RegistrationCount
		categoryCounts[row.CategoryID.String()] = row.RegistrationCount
	}

	dto := toEventDTO(e, org, participantCount)
	for _, c := range categories {
		dto.Categories = append(dto.Categories, toCategoryDTO(c))
	}
	for _, r := range requirements {
		dto.Requirements = append(dto.Requirements, toRequirementDTO(r))
	}
	for _, f := range fields {
		dto.FormFields = append(dto.FormFields, toFormFieldDTO(f))
	}
	if len(categoryCounts) > 0 {
		dto.CategoryCounts = categoryCounts
	}

	s.attachURLs(ctx, &dto, e)

	if e.RefundPolicyID != nil {
		policy, err := s.q.GetRefundPolicyByID(ctx, *e.RefundPolicyID)
		if err == nil {
			rules, err := s.q.ListRefundPolicyRulesByPolicyID(ctx, policy.ID)
			if err != nil {
				return EventDTO{}, apperr.Internal(err)
			}
			value := toRefundPolicyDTO(policy, rules)
			dto.RefundPolicy = &value
		}
	}

	return dto, nil
}

func (s *Service) uniqueSlug(ctx context.Context, title string) (string, error) {
	base := slugify(title)
	candidate := base
	for i := 2; i < 100; i++ {
		_, err := s.q.GetEventBySlugAny(ctx, candidate)
		if errors.Is(err, pgx.ErrNoRows) {
			return candidate, nil
		}
		if err != nil {
			return "", apperr.Internal(err)
		}
		candidate = fmt.Sprintf("%s-%d", base, i)
	}
	return "", apperr.Conflict("Tidak dapat membuat slug unik untuk event ini.")
}

func validateExternalInput(in ExternalEventInput) (time.Time, time.Time, error) {
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
	start, err := time.Parse(time.RFC3339, in.EventStartAt)
	if err != nil {
		fields["eventStartAt"] = "Format harus RFC3339, contoh 2026-11-01T06:00:00+07:00."
	}
	end, err := time.Parse(time.RFC3339, in.EventEndAt)
	if err != nil {
		fields["eventEndAt"] = "Format harus RFC3339, contoh 2026-11-01T18:00:00+07:00."
	}
	if len(fields) == 0 && !start.Before(end) {
		fields["eventEndAt"] = "Waktu selesai harus setelah waktu mulai."
	}
	externalURL := strings.TrimSpace(in.ExternalURL)
	if externalURL == "" {
		fields["externalUrl"] = "URL pendaftaran wajib diisi."
	} else if parsed, err := url.ParseRequestURI(externalURL); err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		fields["externalUrl"] = "URL harus http atau https yang valid."
	}
	if len(fields) > 0 {
		return time.Time{}, time.Time{}, apperr.Validation(fields)
	}
	return start, end, nil
}

func slugify(value string) string {
	var b strings.Builder
	lastDash := false
	for _, r := range strings.ToLower(strings.TrimSpace(value)) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			lastDash = false
		default:
			if !lastDash && b.Len() > 0 {
				b.WriteByte('-')
				lastDash = true
			}
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		out = "event"
	}
	return out
}

func optString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func (s *Service) AdminName(ctx context.Context, id uuid.UUID) string {
	admin, err := s.q.GetAdminByID(ctx, id)
	if err != nil {
		return "Admin"
	}
	return admin.FullName
}

func (s *Service) attachURLs(ctx context.Context, dto *EventDTO, e gen.Event) {
	if s.storage == nil {
		return
	}
	if e.CoverKey != nil && *e.CoverKey != "" {
		if value, err := s.storage.PresignGet(ctx, *e.CoverKey, 15*time.Minute); err == nil {
			dto.CoverURL = value
		}
	}
	if e.RouteGpxKey != nil && *e.RouteGpxKey != "" {
		if value, err := s.storage.PresignGet(ctx, *e.RouteGpxKey, 15*time.Minute); err == nil {
			dto.RouteGpxURL = &value
		}
	}
}
