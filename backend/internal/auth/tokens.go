package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	AccountAttendee  = "attendee"
	AccountOrganizer = "organizer"
	AccountAdmin     = "admin"

	RoleOwner         = "owner"
	RoleVerifier      = "verifier"
	RoleRacepackStaff = "racepack_staff"
	RoleFinance       = "finance"

	RoleSuperAdmin = "super_admin"
	RoleSupport    = "support"
)

type Claims struct {
	AccountType    string `json:"act"`
	Role           string `json:"role,omitempty"`
	OrganizationID string `json:"org,omitempty"`
	jwt.RegisteredClaims
}

type TokenManager struct {
	secret    []byte
	accessTTL time.Duration
	issuer    string
	audience  string
}

func NewTokenManager(secret string, accessTTL time.Duration, issuer, audience string) *TokenManager {
	return &TokenManager{
		secret:    []byte(secret),
		accessTTL: accessTTL,
		issuer:    issuer,
		audience:  audience,
	}
}

func (m *TokenManager) IssueAccess(subject, accountType, role, organizationID string) (string, int64, error) {
	now := time.Now()
	expiresAt := now.Add(m.accessTTL)

	claims := Claims{
		AccountType:    accountType,
		Role:           role,
		OrganizationID: organizationID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   subject,
			Audience:  jwt.ClaimStrings{m.audience},
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ID:        uuid.NewString(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return "", 0, fmt.Errorf("sign access token: %w", err)
	}
	return signed, int64(m.accessTTL.Seconds()), nil
}

func (m *TokenManager) ParseAccess(raw string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(
		raw,
		claims,
		func(t *jwt.Token) (any, error) {
			if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
				return nil, fmt.Errorf("algoritma token tidak didukung")
			}
			return m.secret, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(m.issuer),
		jwt.WithAudience(m.audience),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, fmt.Errorf("token tidak valid")
	}
	return claims, nil
}

// HashToken dipakai untuk menyimpan refresh token dan token verifikasi:
// database hanya menyimpan hash, bukan token mentah.
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
