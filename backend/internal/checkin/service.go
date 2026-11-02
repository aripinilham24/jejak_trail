package checkin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/aripinilham/jejak_trail/backend/internal/db"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
)

type Service struct {
	db  *db.DB
	q   *gen.Queries
	log *slog.Logger
}

func NewService(database *db.DB, log *slog.Logger) *Service {
	return &Service{db: database, q: gen.New(database.Pool), log: log}
}

type CheckinDTO struct {
	ID                 string  `json:"id"`
	TicketID           string  `json:"ticketId"`
	CheckedInBy        *string `json:"checkedInBy,omitempty"`
	CheckedInByName    *string `json:"checkedInByName,omitempty"`
	PickupType         string  `json:"pickupType"`
	RepresentativeName *string `json:"representativeName,omitempty"`
	RepresentativeNote *string `json:"representativeNote,omitempty"`
	CreatedOffline     bool    `json:"createdOffline"`
	ScannedAt          string  `json:"scannedAt"`
	SyncedAt           *string `json:"syncedAt,omitempty"`
}

type ParticipantDTO struct {
	RegistrationID     string      `json:"registrationId"`
	TicketID           string      `json:"ticketId"`
	QRCode             string      `json:"qrCode"`
	BIBNumber          *string     `json:"bibNumber,omitempty"`
	FullName           string      `json:"fullName"`
	CategoryName       string      `json:"categoryName"`
	TicketStatus       string      `json:"ticketStatus"`
	RegistrationStatus string      `json:"registrationStatus"`
	Checkin            *CheckinDTO `json:"checkin,omitempty"`
}

type ManifestDTO struct {
	EventID      string           `json:"eventId"`
	EventTitle   string           `json:"eventTitle"`
	EventStartAt string           `json:"eventStartAt"`
	GeneratedAt  string           `json:"generatedAt"`
	Total        int              `json:"total"`
	CheckedIn    int              `json:"checkedIn"`
	Participants []ParticipantDTO `json:"participants"`
}

type ScanInput struct {
	QRCode             string
	PickupType         string
	RepresentativeName string
	RepresentativeNote string
	ClientID           string
	CreatedOffline     bool
	ScannedAt          string
}

type ScanResult struct {
	Status      string          `json:"status"`
	Message     string          `json:"message"`
	Participant *ParticipantDTO `json:"participant,omitempty"`
	Checkin     *CheckinDTO     `json:"checkin,omitempty"`
}

func (s *Service) Manifest(ctx context.Context, organizationID, eventID uuid.UUID) (ManifestDTO, error) {
	event, err := s.q.GetEventByIDForOrganization(ctx, gen.GetEventByIDForOrganizationParams{
		ID:             eventID,
		OrganizationID: &organizationID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ManifestDTO{}, apperr.NotFound("Event tidak ditemukan.")
		}
		return ManifestDTO{}, apperr.Internal(err)
	}

	rows, err := s.q.ListCheckinManifest(ctx, eventID)
	if err != nil {
		return ManifestDTO{}, apperr.Internal(err)
	}

	manifest := ManifestDTO{
		EventID:      event.ID.String(),
		EventTitle:   event.Title,
		EventStartAt: event.EventStartAt.UTC().Format(time.RFC3339),
		GeneratedAt:  time.Now().UTC().Format(time.RFC3339),
		Total:        len(rows),
		Participants: make([]ParticipantDTO, 0, len(rows)),
	}
	for _, row := range rows {
		participant := ParticipantDTO{
			RegistrationID:     row.RegistrationID.String(),
			TicketID:           row.TicketID.String(),
			QRCode:             row.QrCode,
			BIBNumber:          row.BibNumber,
			FullName:           row.FullNameSnapshot,
			CategoryName:       row.CategoryName,
			TicketStatus:       row.TicketStatus,
			RegistrationStatus: row.RegistrationStatus,
		}
		if row.CheckinID != nil {
			manifest.CheckedIn++
			participant.Checkin = &CheckinDTO{
				ID:                 row.CheckinID.String(),
				TicketID:           row.TicketID.String(),
				CheckedInByName:    row.CheckedInByName,
				PickupType:         derefString(row.PickupType),
				RepresentativeName: row.RepresentativeName,
				CreatedOffline:     derefBool(row.CreatedOffline),
				ScannedAt:          formatTime(row.ScannedAt),
				SyncedAt:           formatTimePtr(row.SyncedAt),
			}
		}
		manifest.Participants = append(manifest.Participants, participant)
	}
	return manifest, nil
}

func (s *Service) Scan(ctx context.Context, organizationID, actorID uuid.UUID, actorName string, in ScanInput) (ScanResult, error) {
	qrCode := strings.TrimSpace(in.QRCode)
	if qrCode == "" {
		return ScanResult{Status: "invalid", Message: "QR code kosong."}, nil
	}
	pickupType := strings.TrimSpace(in.PickupType)
	if pickupType == "" {
		pickupType = "self"
	}
	if pickupType != "self" && pickupType != "representative" {
		return ScanResult{}, apperr.Validation(map[string]string{"pickupType": "Nilai harus self atau representative."})
	}
	if pickupType == "representative" && strings.TrimSpace(in.RepresentativeName) == "" {
		return ScanResult{}, apperr.Validation(map[string]string{"representativeName": "Nama perwakilan wajib diisi."})
	}
	clientID := strings.TrimSpace(in.ClientID)
	if in.CreatedOffline && clientID == "" {
		return ScanResult{}, apperr.Validation(map[string]string{"clientId": "clientId wajib untuk check-in offline."})
	}

	ticket, err := s.q.GetTicketForScan(ctx, qrCode)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ScanResult{Status: "invalid", Message: "QR tidak terdaftar pada event organizer ini."}, nil
		}
		return ScanResult{}, apperr.Internal(err)
	}
	if ticket.OrganizationID == nil || *ticket.OrganizationID != organizationID {
		return ScanResult{Status: "invalid", Message: "QR tidak terdaftar pada event organizer ini."}, nil
	}

	if clientID != "" {
		if existing, err := s.q.GetCheckinByClientID(ctx, &clientID); err == nil {
			return s.alreadyResult(ctx, ticket, existing), nil
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return ScanResult{}, apperr.Internal(err)
		}
	}

	scannedAt := time.Now().UTC()
	if strings.TrimSpace(in.ScannedAt) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(in.ScannedAt))
		if err != nil {
			return ScanResult{}, apperr.Validation(map[string]string{"scannedAt": "Format harus RFC3339."})
		}
		scannedAt = parsed
	}

	var checkin gen.RacepackCheckin
	createdNow := false
	err = s.db.WithTx(ctx, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)

		existing, err := q.GetCheckinByTicket(ctx, ticket.TicketID)
		if err == nil {
			checkin = existing
			return nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}

		created, err := q.CreateRacepackCheckin(ctx, gen.CreateRacepackCheckinParams{
			TicketID:           ticket.TicketID,
			CheckedInBy:        &actorID,
			PickupType:         pickupType,
			RepresentativeName: optString(in.RepresentativeName),
			RepresentativeNote: optString(in.RepresentativeNote),
			CreatedOffline:     in.CreatedOffline,
			ClientID:           optString(clientID),
			ScannedAt:          scannedAt,
			SyncedAt:           ptrTime(time.Now().UTC()),
		})
		if err != nil {
			if isUniqueViolation(err) {
				existing, findErr := q.GetCheckinByTicket(ctx, ticket.TicketID)
				if findErr == nil {
					checkin = existing
					return nil
				}
			}
			return err
		}
		checkin = created
		createdNow = true

		if _, err := q.UpdateTicketStatus(ctx, gen.UpdateTicketStatusParams{
			ID:     ticket.TicketID,
			Status: "used",
		}); err != nil {
			return err
		}

		if _, err := q.MarkRegistrationCheckedIn(ctx, ticket.RegistrationID); err != nil {
			return err
		}

		note := "Racepack diambil langsung oleh peserta."
		if pickupType == "representative" {
			note = fmt.Sprintf("Racepack diambil perwakilan %s.", strings.TrimSpace(in.RepresentativeName))
		}
		if strings.TrimSpace(in.RepresentativeNote) != "" {
			note += " Catatan: " + strings.TrimSpace(in.RepresentativeNote)
		}
		from := ticket.RegistrationStatus
		if _, err := q.CreateRegistrationStatusLog(ctx, gen.CreateRegistrationStatusLogParams{
			RegistrationID: ticket.RegistrationID,
			FromStatus:     &from,
			ToStatus:       "checked_in",
			ActorType:      "organizer",
			ActorID:        &actorID,
			ActorName:      actorName,
			Note:           &note,
		}); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if appErr, ok := apperr.As(err); ok {
			return ScanResult{}, appErr
		}
		return ScanResult{}, apperr.Internal(err)
	}

	participant := toScanParticipant(ticket, &checkin, actorName)
	if !createdNow {
		return ScanResult{
			Status:      "already_checked_in",
			Message:     fmt.Sprintf("QR sudah dipindai sebelumnya pada %s.", checkin.ScannedAt.Format("02 Jan 2006 15:04")),
			Participant: &participant,
			Checkin:     toCheckinDTO(checkin, actorName),
		}, nil
	}
	return ScanResult{
		Status:      "checked_in",
		Message:     fmt.Sprintf("%s — BIB %s berhasil check-in.", ticket.FullNameSnapshot, derefString(ticket.BibNumber)),
		Participant: &participant,
		Checkin:     toCheckinDTO(checkin, actorName),
	}, nil
}

func (s *Service) Sync(ctx context.Context, organizationID, actorID uuid.UUID, actorName string, inputs []ScanInput) []ScanResult {
	results := make([]ScanResult, 0, len(inputs))
	for _, input := range inputs {
		result, err := s.Scan(ctx, organizationID, actorID, actorName, input)
		if err != nil {
			results = append(results, ScanResult{Status: "invalid", Message: err.Error()})
			continue
		}
		results = append(results, result)
	}
	return results
}

func (s *Service) alreadyResult(ctx context.Context, ticket gen.GetTicketForScanRow, checkin gen.RacepackCheckin) ScanResult {
	participant := toScanParticipant(ticket, &checkin, "")
	return ScanResult{
		Status:      "already_checked_in",
		Message:     fmt.Sprintf("QR sudah dipindai sebelumnya pada %s.", checkin.ScannedAt.Format("02 Jan 2006 15:04")),
		Participant: &participant,
		Checkin:     toCheckinDTO(checkin, ""),
	}
}

func toScanParticipant(ticket gen.GetTicketForScanRow, checkin *gen.RacepackCheckin, actorName string) ParticipantDTO {
	participant := ParticipantDTO{
		RegistrationID:     ticket.RegistrationID.String(),
		TicketID:           ticket.TicketID.String(),
		QRCode:             ticket.QrCode,
		BIBNumber:          ticket.BibNumber,
		FullName:           ticket.FullNameSnapshot,
		CategoryName:       ticket.CategoryName,
		TicketStatus:       ticket.TicketStatus,
		RegistrationStatus: ticket.RegistrationStatus,
	}
	if checkin != nil {
		participant.Checkin = toCheckinDTO(*checkin, actorName)
	}
	return participant
}

func toCheckinDTO(checkin gen.RacepackCheckin, actorName string) *CheckinDTO {
	checkedInBy := uuidString(checkin.CheckedInBy)
	dto := &CheckinDTO{
		ID:                 checkin.ID.String(),
		TicketID:           checkin.TicketID.String(),
		CheckedInBy:        checkedInBy,
		PickupType:         checkin.PickupType,
		RepresentativeName: checkin.RepresentativeName,
		RepresentativeNote: checkin.RepresentativeNote,
		CreatedOffline:     checkin.CreatedOffline,
		ScannedAt:          checkin.ScannedAt.UTC().Format(time.RFC3339),
		SyncedAt:           formatTimePtr(checkin.SyncedAt),
	}
	if actorName != "" {
		dto.CheckedInByName = &actorName
	}
	return dto
}

func optString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func ptrTime(value time.Time) *time.Time { return &value }

func uuidString(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	v := id.String()
	return &v
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func derefBool(value *bool) bool {
	if value == nil {
		return false
	}
	return *value
}

func formatTime(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func formatTimePtr(value *time.Time) *string {
	if value == nil {
		return nil
	}
	v := value.UTC().Format(time.RFC3339)
	return &v
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
