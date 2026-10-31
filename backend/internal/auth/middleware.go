package auth

import (
	"slices"
	"strings"

	"github.com/gofiber/fiber/v3"

	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
)

type claimsKey struct{}

// RequireAuth memvalidasi access token dan membatasi account type.
func RequireAuth(tokens *TokenManager, accountTypes ...string) fiber.Handler {
	return func(c fiber.Ctx) error {
		header := c.Get(fiber.HeaderAuthorization)
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			return apperr.Unauthorized("Token akses tidak ditemukan.")
		}
		raw := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		if raw == "" {
			return apperr.Unauthorized("Token akses tidak ditemukan.")
		}

		claims, err := tokens.ParseAccess(raw)
		if err != nil {
			return apperr.Unauthorized("Token akses tidak valid atau sudah kedaluwarsa.")
		}
		if len(accountTypes) > 0 && !slices.Contains(accountTypes, claims.AccountType) {
			return apperr.Forbidden("Akun ini tidak dapat mengakses endpoint tersebut.")
		}

		c.Locals(claimsKey{}, claims)
		return c.Next()
	}
}

// RequireRole memastikan role di dalam token termasuk yang diizinkan.
func RequireRole(roles ...string) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, ok := ClaimsFrom(c)
		if !ok {
			return apperr.Unauthorized("")
		}
		if !slices.Contains(roles, claims.Role) {
			return apperr.Forbidden("")
		}
		return c.Next()
	}
}

func ClaimsFrom(c fiber.Ctx) (*Claims, bool) {
	claims, ok := c.Locals(claimsKey{}).(*Claims)
	return claims, ok
}
