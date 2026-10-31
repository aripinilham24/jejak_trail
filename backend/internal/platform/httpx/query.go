package httpx

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
)

const (
	DefaultPage  = 1
	DefaultLimit = 20
	MaxLimit     = 100
)

// PageParams membaca page & limit dari query string, dengan batas aman.
func PageParams(c fiber.Ctx) (page, limit int, offset int32) {
	page = queryInt(c, "page", DefaultPage)
	if page < 1 {
		page = DefaultPage
	}
	limit = queryInt(c, "limit", DefaultLimit)
	if limit < 1 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	offset = int32((page - 1) * limit)
	return page, limit, offset
}

func queryInt(c fiber.Ctx, key string, fallback int) int {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

// QueryInt64 mengembalikan nil bila parameter kosong atau tidak valid.
func QueryInt64(c fiber.Ctx, key string) *int64 {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return nil
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return nil
	}
	return &value
}

// QueryString mengembalikan nil bila parameter kosong.
func QueryString(c fiber.Ctx, key string) *string {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return nil
	}
	return &raw
}
