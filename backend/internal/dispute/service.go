package dispute

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/audit"
	"github.com/aripinilham/jejak_trail/backend/internal/db"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
)

type Service struct {
	q     *gen.Queries
	audit *audit.Writer
}

func NewService(database *db.DB, auditWriter *audit.Writer) *Service {
	return &Service{q: gen.New(database.Pool), audit: auditWriter}
}

type DTO struct {
	ID             string  `json:"id"`
	EventID        string  `json:"eventId"`
	EventTitle     string  `json:"eventTitle"`
	RegistrationID *string `json:"registrationId,omitempty"`
	ReporterType   string  `json:"reporterType"`
	ReporterName   string  `json:"reporterName"`
	DisputeType    string  `json:"disputeType"`
	Description    string  `json:"description"`
	Status         string  `json:"status"`
	HandledBy      *string `json:"handledBy,omitempty"`
	Resolution     *string `json:"resolution,omitempty"`
	CreatedAt      string  `json:"createdAt"`
	ResolvedAt     *string `json:"resolvedAt,omitempty"`
}

type CreateInput struct {
	EventID        uuid.UUID
	RegistrationID *uuid.UUID
	DisputeType    string
	Description    string
}

func (s *Service) Create(ctx context.Context, userID uuid.UUID, userName string, in CreateInput) (DTO, error) {
	if !validType(in.DisputeType) {
		return DTO{}, apperr.Validation(map[string]string{"disputeType": "Tipe sengketa tidak dikenal."})
	}
	if strings.TrimSpace(in.Description) == "" {
		return DTO{}, apperr.Validation(map[string]string{"description": "Deskripsi wajib diisi."})
	}
	event, err := s.q.GetEventByID(ctx, in.EventID)
	if err != nil {
		return DTO{}, apperr.NotFound("Event tidak ditemukan.")
	}
	if in.RegistrationID != nil {
		reg, err := s.q.GetRegistrationByIDForUser(ctx, gen.GetRegistrationByIDForUserParams{
			ID:     *in.RegistrationID,
			UserID: userID,
		})
		if err != nil {
			return DTO{}, apperr.NotFound("Pendaftaran tidak ditemukan.")
		}
		if reg.EventID != in.EventID {
			return DTO{}, apperr.Validation(map[string]string{"registrationId": "Pendaftaran bukan milik event ini."})
		}
	}

	row, err := s.q.CreateDispute(ctx, gen.CreateDisputeParams{
		EventID:        in.EventID,
		RegistrationID: in.RegistrationID,
		ReporterType:   "user",
		ReporterID:     userID,
		ReporterName:   userName,
		DisputeType:    in.DisputeType,
		Description:    strings.TrimSpace(in.Description),
	})
	if err != nil {
		return DTO{}, apperr.Internal(err)
	}
	dto := toDTO(row, event.Title)
	return dto, nil
}

func (s *Service) ListMine(ctx context.Context, userID uuid.UUID) ([]DTO, error) {
	rows, err := s.q.ListDisputesByUser(ctx, userID)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	out := make([]DTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, toDTO(gen.Dispute{
			ID:             row.ID,
			EventID:        row.EventID,
			RegistrationID: row.RegistrationID,
			ReporterType:   row.ReporterType,
			ReporterID:     row.ReporterID,
			ReporterName:   row.ReporterName,
			DisputeType:    row.DisputeType,
			Description:    row.Description,
			Status:         row.Status,
			HandledBy:      row.HandledBy,
			Resolution:     row.Resolution,
			CreatedAt:      row.CreatedAt,
			ResolvedAt:     row.ResolvedAt,
		}, row.EventTitle))
	}
	return out, nil
}

func (s *Service) AdminList(ctx context.Context, status string, page, limit int, offset int32) ([]DTO, int64, error) {
	rows, err := s.q.ListDisputes(ctx, gen.ListDisputesParams{
		Status:     optString(status),
		PageLimit:  int32(limit),
		PageOffset: offset,
	})
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	count, err := s.q.CountDisputes(ctx, optString(status))
	if err != nil {
		return nil, 0, apperr.Internal(err)
	}
	out := make([]DTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, toDTO(gen.Dispute{
			ID:             row.ID,
			EventID:        row.EventID,
			RegistrationID: row.RegistrationID,
			ReporterType:   row.ReporterType,
			ReporterID:     row.ReporterID,
			ReporterName:   row.ReporterName,
			DisputeType:    row.DisputeType,
			Description:    row.Description,
			Status:         row.Status,
			HandledBy:      row.HandledBy,
			Resolution:     row.Resolution,
			CreatedAt:      row.CreatedAt,
			ResolvedAt:     row.ResolvedAt,
		}, row.EventTitle))
	}
	return out, count, nil
}

func (s *Service) SetStatus(ctx context.Context, adminID uuid.UUID, adminName, ip string, id uuid.UUID, status, resolution string) (DTO, error) {
	if status != "in_review" && status != "resolved" && status != "rejected" {
		return DTO{}, apperr.Validation(map[string]string{"status": "Status tidak dikenal."})
	}
	if (status == "resolved" || status == "rejected") && strings.TrimSpace(resolution) == "" {
		return DTO{}, apperr.Validation(map[string]string{"resolution": "Resolusi wajib diisi."})
	}

	now := time.Now()
	var resolvedAt *time.Time
	if status == "resolved" || status == "rejected" {
		resolvedAt = &now
	}
	row, err := s.q.UpdateDisputeStatus(ctx, gen.UpdateDisputeStatusParams{
		ID:         id,
		Status:     status,
		HandledBy:  &adminID,
		Resolution: optString(resolution),
		ResolvedAt: resolvedAt,
	})
	if err != nil {
		return DTO{}, apperr.NotFound("Sengketa tidak ditemukan.")
	}
	event, err := s.q.GetEventByID(ctx, row.EventID)
	if err != nil {
		return DTO{}, apperr.Internal(err)
	}

	s.audit.Write(ctx, audit.Entry{
		ActorType:  "admin",
		ActorID:    &adminID,
		ActorName:  adminName,
		Action:     "dispute." + status,
		EntityType: "disputes",
		EntityID:   &id,
		After:      map[string]any{"status": status, "resolution": resolution},
		IPAddress:  ip,
	})

	return toDTO(row, event.Title), nil
}

func toDTO(row gen.Dispute, eventTitle string) DTO {
	dto := DTO{
		ID:           row.ID.String(),
		EventID:      row.EventID.String(),
		EventTitle:   eventTitle,
		ReporterType: row.ReporterType,
		ReporterName: row.ReporterName,
		DisputeType:  row.DisputeType,
		Description:  row.Description,
		Status:       row.Status,
		CreatedAt:    row.CreatedAt.UTC().Format(time.RFC3339),
	}
	if row.RegistrationID != nil {
		v := row.RegistrationID.String()
		dto.RegistrationID = &v
	}
	if row.HandledBy != nil {
		v := row.HandledBy.String()
		dto.HandledBy = &v
	}
	dto.Resolution = row.Resolution
	if row.ResolvedAt != nil {
		v := row.ResolvedAt.UTC().Format(time.RFC3339)
		dto.ResolvedAt = &v
	}
	return dto
}

func validType(value string) bool {
	switch value {
	case "payment", "rejection", "event_cancelled", "refund", "organizer_fraud", "other":
		return true
	default:
		return false
	}
}

func optString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}
