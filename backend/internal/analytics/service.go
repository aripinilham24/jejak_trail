package analytics

import (
	"context"

	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/db"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
)

type Service struct {
	q *gen.Queries
}

func NewService(database *db.DB) *Service {
	return &Service{q: gen.New(database.Pool)}
}

type CategoryStatDTO struct {
	Category string `json:"category"`
	Terisi   int32  `json:"terisi"`
	Kuota    int32  `json:"kuota"`
}

type TrendDTO struct {
	Date      string `json:"date"`
	Pendaftar int32  `json:"pendaftar"`
	Lunas     int32  `json:"lunas"`
}

type JerseyDTO struct {
	Size  string `json:"size"`
	Count int32  `json:"count"`
}

type MoneyDTO struct {
	Collected int64 `json:"collected"`
	Disbursed int64 `json:"disbursed"`
	Held      int64 `json:"held"`
	Estimated int64 `json:"estimated"`
}

type OrganizerDashboardDTO struct {
	RegistrationsByCategory []CategoryStatDTO `json:"registrationsByCategory"`
	RegistrationTrend       []TrendDTO        `json:"registrationTrend"`
	JerseyRecap             []JerseyDTO       `json:"jerseyRecap"`
	Money                   MoneyDTO          `json:"money"`
	PendingVerifications    int32             `json:"pendingVerifications"`
	PaidRegistrations       int32             `json:"paidRegistrations"`
}

func (s *Service) OrganizerDashboard(ctx context.Context, organizationID uuid.UUID) (OrganizerDashboardDTO, error) {
	categories, err := s.q.OrganizerCategoryStats(ctx, &organizationID)
	if err != nil {
		return OrganizerDashboardDTO{}, apperr.Internal(err)
	}
	trend, err := s.q.OrganizerRegistrationTrend(ctx, &organizationID)
	if err != nil {
		return OrganizerDashboardDTO{}, apperr.Internal(err)
	}
	jerseys, err := s.q.OrganizerJerseyRecap(ctx, &organizationID)
	if err != nil {
		return OrganizerDashboardDTO{}, apperr.Internal(err)
	}
	money, err := s.q.OrganizerMoney(ctx, &organizationID)
	if err != nil {
		return OrganizerDashboardDTO{}, apperr.Internal(err)
	}
	counts, err := s.q.OrganizerPendingCounts(ctx, &organizationID)
	if err != nil {
		return OrganizerDashboardDTO{}, apperr.Internal(err)
	}

	out := OrganizerDashboardDTO{
		RegistrationsByCategory: make([]CategoryStatDTO, 0, len(categories)),
		RegistrationTrend:       make([]TrendDTO, 0, len(trend)),
		JerseyRecap:             make([]JerseyDTO, 0, len(jerseys)),
		PendingVerifications:    counts.PendingVerifications,
		PaidRegistrations:       counts.PaidRegistrations,
		Money: MoneyDTO{
			Collected: money.Collected,
			Disbursed: money.Disbursed,
			Held:      money.Collected - money.Refunded - money.Disbursed,
			Estimated: money.Collected,
		},
	}
	for _, row := range categories {
		out.RegistrationsByCategory = append(out.RegistrationsByCategory, CategoryStatDTO{
			Category: row.EventTitle + " · " + row.CategoryName,
			Terisi:   row.Filled,
			Kuota:    row.Quota,
		})
	}
	for _, row := range trend {
		out.RegistrationTrend = append(out.RegistrationTrend, TrendDTO{
			Date:      row.Day,
			Pendaftar: row.Registrations,
			Lunas:     row.Paid,
		})
	}
	for _, row := range jerseys {
		out.JerseyRecap = append(out.JerseyRecap, JerseyDTO{Size: row.Size, Count: row.Count})
	}
	return out, nil
}

type GrowthDTO struct {
	Month         string `json:"month"`
	Users         int32  `json:"users"`
	Registrations int32  `json:"registrations"`
	GMV           int64  `json:"gmv"`
}

type EventMixDTO struct {
	Name  string `json:"name"`
	Value int32  `json:"value"`
	Color string `json:"color"`
}

type AdminDashboardDTO struct {
	TotalEvents          int32         `json:"totalEvents"`
	NativeEvents         int32         `json:"nativeEvents"`
	ExternalEvents       int32         `json:"externalEvents"`
	TotalRegistrations   int32         `json:"totalRegistrations"`
	GMV                  int64         `json:"gmv"`
	PlatformRevenue      int64         `json:"platformRevenue"`
	PendingOrganizations int32         `json:"pendingOrganizations"`
	PendingEvents        int32         `json:"pendingEvents"`
	OpenDisputes         int32         `json:"openDisputes"`
	Growth               []GrowthDTO   `json:"growth"`
	EventMix             []EventMixDTO `json:"eventMix"`
}

func (s *Service) AdminDashboard(ctx context.Context) (AdminDashboardDTO, error) {
	stats, err := s.q.AdminDashboardStats(ctx)
	if err != nil {
		return AdminDashboardDTO{}, apperr.Internal(err)
	}
	growth, err := s.q.AdminMonthlyGrowth(ctx)
	if err != nil {
		return AdminDashboardDTO{}, apperr.Internal(err)
	}

	out := AdminDashboardDTO{
		TotalEvents:          stats.TotalEvents,
		NativeEvents:         stats.NativeEvents,
		ExternalEvents:       stats.ExternalEvents,
		TotalRegistrations:   stats.TotalRegistrations,
		GMV:                  stats.Gmv,
		PlatformRevenue:      stats.PlatformRevenue,
		PendingOrganizations: stats.PendingOrganizations,
		PendingEvents:        stats.PendingEvents,
		OpenDisputes:         stats.OpenDisputes,
		Growth:               make([]GrowthDTO, 0, len(growth)),
		EventMix: []EventMixDTO{
			{Name: "Native", Value: stats.NativeEvents, Color: "#f59e0b"},
			{Name: "External", Value: stats.ExternalEvents, Color: "#10b981"},
		},
	}
	for _, row := range growth {
		out.Growth = append(out.Growth, GrowthDTO{
			Month:         row.Month,
			Users:         row.Users,
			Registrations: row.Registrations,
			GMV:           row.Gmv,
		})
	}
	return out, nil
}
