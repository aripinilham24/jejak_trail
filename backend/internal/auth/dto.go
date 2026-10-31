package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
)

type UserDTO struct {
	ID                    string  `json:"id"`
	Email                 string  `json:"email"`
	Phone                 *string `json:"phone,omitempty"`
	FullName              string  `json:"fullName"`
	BirthDate             *string `json:"birthDate,omitempty"`
	Gender                *string `json:"gender,omitempty"`
	EmergencyContactName  *string `json:"emergencyContactName,omitempty"`
	EmergencyContactPhone *string `json:"emergencyContactPhone,omitempty"`
	Status                string  `json:"status"`
	EmailVerifiedAt       *string `json:"emailVerifiedAt"`
	CreatedAt             string  `json:"createdAt"`
}

type OrganizerDTO struct {
	ID               string  `json:"id"`
	OrganizationID   string  `json:"organizationId"`
	Email            string  `json:"email"`
	FullName         string  `json:"fullName"`
	Phone            *string `json:"phone,omitempty"`
	PositionTitle    *string `json:"positionTitle,omitempty"`
	OrgRole          string  `json:"orgRole"`
	TwoFactorEnabled bool    `json:"twoFactorEnabled"`
	Status           string  `json:"status"`
	InvitedAt        *string `json:"invitedAt,omitempty"`
	CreatedAt        string  `json:"createdAt"`
}

type OrganizationDTO struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	OrgType            string  `json:"orgType"`
	OfficialEmail      string  `json:"officialEmail"`
	Phone              string  `json:"phone"`
	Address            string  `json:"address"`
	Province           string  `json:"province"`
	City               string  `json:"city"`
	LegalDocKey        *string `json:"legalDocKey,omitempty"`
	VerificationStatus string  `json:"verificationStatus"`
	VerifiedBy         *string `json:"verifiedBy,omitempty"`
	VerifiedAt         *string `json:"verifiedAt,omitempty"`
	RejectionReason    *string `json:"rejectionReason,omitempty"`
	Status             string  `json:"status"`
	CreatedAt          string  `json:"createdAt"`
	EventCount         int32   `json:"eventCount"`
	LogoSeed           string  `json:"logoSeed"`
}

type AdminDTO struct {
	ID               string `json:"id"`
	Email            string `json:"email"`
	FullName         string `json:"fullName"`
	AdminRole        string `json:"adminRole"`
	TwoFactorEnabled bool   `json:"twoFactorEnabled"`
	Status           string `json:"status"`
	CreatedAt        string `json:"createdAt"`
}

type Identity struct {
	AccountType  string           `json:"accountType"`
	User         *UserDTO         `json:"user,omitempty"`
	Organizer    *OrganizerDTO    `json:"organizer,omitempty"`
	Organization *OrganizationDTO `json:"organization,omitempty"`
	Admin        *AdminDTO        `json:"admin,omitempty"`
}

type AuthResponse struct {
	AccessToken string   `json:"accessToken"`
	ExpiresIn   int64    `json:"expiresIn"`
	Identity    Identity `json:"identity"`
}

func toUserDTO(u gen.User) UserDTO {
	return UserDTO{
		ID:                    u.ID.String(),
		Email:                 u.Email,
		Phone:                 u.Phone,
		FullName:              u.FullName,
		BirthDate:             dateString(u.BirthDate),
		Gender:                u.Gender,
		EmergencyContactName:  u.EmergencyContactName,
		EmergencyContactPhone: u.EmergencyContactPhone,
		Status:                u.Status,
		EmailVerifiedAt:       timeString(u.EmailVerifiedAt),
		CreatedAt:             u.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func toOrganizerDTO(o gen.OrganizerAccount) OrganizerDTO {
	return OrganizerDTO{
		ID:               o.ID.String(),
		OrganizationID:   o.OrganizationID.String(),
		Email:            o.Email,
		FullName:         o.FullName,
		Phone:            o.Phone,
		PositionTitle:    o.PositionTitle,
		OrgRole:          o.OrgRole,
		TwoFactorEnabled: o.TwoFactorEnabled,
		Status:           o.Status,
		InvitedAt:        timeString(o.InvitedAt),
		CreatedAt:        o.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func toOrganizationDTO(o gen.Organization, eventCount int32) OrganizationDTO {
	sum := sha256.Sum256([]byte(o.Name))
	return OrganizationDTO{
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
		VerifiedBy:         uuidString(o.VerifiedBy),
		VerifiedAt:         timeString(o.VerifiedAt),
		RejectionReason:    o.RejectionReason,
		Status:             o.Status,
		CreatedAt:          o.CreatedAt.UTC().Format(time.RFC3339),
		EventCount:         eventCount,
		LogoSeed:           hex.EncodeToString(sum[:3]),
	}
}

func toAdminDTO(a gen.AdminUser) AdminDTO {
	return AdminDTO{
		ID:               a.ID.String(),
		Email:            a.Email,
		FullName:         a.FullName,
		AdminRole:        a.AdminRole,
		TwoFactorEnabled: a.TwoFactorEnabled,
		Status:           a.Status,
		CreatedAt:        a.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func timeString(t *time.Time) *string {
	if t == nil {
		return nil
	}
	v := t.UTC().Format(time.RFC3339)
	return &v
}

func dateString(t *time.Time) *string {
	if t == nil {
		return nil
	}
	v := t.Format("2006-01-02")
	return &v
}

func uuidString(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	v := id.String()
	return &v
}
