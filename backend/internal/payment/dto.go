package payment

import (
	"time"

	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
)

type TicketDTO struct {
	ID                 string  `json:"id"`
	RegistrationID     string  `json:"registrationId"`
	QRCode             string  `json:"qrCode"`
	Status             string  `json:"status"`
	IssuedAt           string  `json:"issuedAt"`
	BIBNumber          *string `json:"bibNumber,omitempty"`
	FullName           string  `json:"fullName"`
	RegistrationStatus string  `json:"registrationStatus"`
	EventTitle         string  `json:"eventTitle"`
	EventSlug          string  `json:"eventSlug"`
	EventStartAt       string  `json:"eventStartAt"`
	LocationName       string  `json:"locationName"`
	City               string  `json:"city"`
	Province           string  `json:"province"`
	CategoryName       string  `json:"categoryName"`
}

func toTicketDTO(row gen.ListTicketsByUserRow) TicketDTO {
	return TicketDTO{
		ID:                 row.ID.String(),
		RegistrationID:     row.RegistrationID.String(),
		QRCode:             row.QrCode,
		Status:             row.Status,
		IssuedAt:           row.IssuedAt.UTC().Format(time.RFC3339),
		BIBNumber:          row.BibNumber,
		FullName:           row.FullNameSnapshot,
		RegistrationStatus: row.RegistrationStatus,
		EventTitle:         row.EventTitle,
		EventSlug:          row.EventSlug,
		EventStartAt:       row.EventStartAt.UTC().Format(time.RFC3339),
		LocationName:       row.LocationName,
		City:               row.City,
		Province:           row.Province,
		CategoryName:       row.CategoryName,
	}
}
