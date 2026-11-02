package middleware

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"

	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
)

// RequestID memberi setiap request ID stabil (dari header X-Request-Id bila
// valid, atau dibuat baru) dan mengembalikannya di response header.
func RequestID() fiber.Handler {
	return requestid.New(requestid.Config{
		Header: "X-Request-Id",
	})
}

// RequestLogger mencatat satu baris log per request dalam format JSON.
func RequestLogger(log *slog.Logger) fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()
		err := c.Next()

		status := c.Response().StatusCode()
		if err != nil {
			if appErr, ok := apperr.As(err); ok {
				status = appErr.Status
			} else if status < fiber.StatusBadRequest {
				status = fiber.StatusInternalServerError
			}
		}
		level := slog.LevelInfo
		if err != nil || status >= fiber.StatusInternalServerError {
			level = slog.LevelError
		} else if status >= fiber.StatusBadRequest {
			level = slog.LevelWarn
		}

		attrs := []slog.Attr{
			slog.String("method", c.Method()),
			slog.String("path", c.Path()),
			slog.Int("status", status),
			slog.Duration("duration", time.Since(start)),
			slog.String("request_id", requestid.FromContext(c)),
			slog.String("ip", c.IP()),
		}
		if err != nil {
			attrs = append(attrs, slog.String("error", err.Error()))
		}
		log.LogAttrs(c.Context(), level, "http request", attrs...)

		return err
	}
}

// Recover menangkap panic agar proses tidak mati dan klien menerima JSON 500.
func Recover(log *slog.Logger) fiber.Handler {
	return recoverer.New(recoverer.Config{
		EnableStackTrace: true,
		StackTraceHandler: func(c fiber.Ctx, e any) {
			log.Error("panic recovered",
				"panic", fmt.Sprint(e),
				"request_id", requestid.FromContext(c),
				"path", c.Path(),
			)
		},
		PanicHandler: func(c fiber.Ctx, r any) error {
			return apperr.Internal(fmt.Errorf("panic: %v", r))
		},
	})
}

func CORS(origins []string) fiber.Handler {
	return cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowCredentials: true,
		AllowMethods:     []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "Idempotency-Key", "X-Request-Id"},
		ExposeHeaders:    []string{"X-Request-Id"},
		MaxAge:           600,
	})
}

func SecurityHeaders() fiber.Handler {
	return helmet.New()
}

// RateLimit membatasi request per IP dalam jendela waktu tertentu.
func RateLimit(max int, window time.Duration) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        max,
		Expiration: window,
		KeyGenerator: func(c fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c fiber.Ctx) error {
			return apperr.RateLimited("")
		},
	})
}
