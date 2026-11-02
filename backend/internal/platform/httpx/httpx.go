// Package httpx berisi helper respons HTTP agar bentuk JSON konsisten di semua
// endpoint: { "data": ... } untuk sukses dan { "error": {...} } untuk gagal.
package httpx

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/requestid"

	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
)

type ErrorBody struct {
	Code      string            `json:"code"`
	Message   string            `json:"message"`
	Fields    map[string]string `json:"fields,omitempty"`
	RequestID string            `json:"requestId,omitempty"`
}

type errorEnvelope struct {
	Error ErrorBody `json:"error"`
}

type Meta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"totalPages"`
	Unread     int64 `json:"unread,omitempty"`
}

type dataEnvelope struct {
	Data any `json:"data"`
}

type listEnvelope struct {
	Data any  `json:"data"`
	Meta Meta `json:"meta"`
}

func Data(c fiber.Ctx, status int, data any) error {
	return c.Status(status).JSON(dataEnvelope{Data: data})
}

func OK(c fiber.Ctx, data any) error {
	return Data(c, http.StatusOK, data)
}

func Created(c fiber.Ctx, data any) error {
	return Data(c, http.StatusCreated, data)
}

func NoContent(c fiber.Ctx) error {
	return c.SendStatus(http.StatusNoContent)
}

func List(c fiber.Ctx, data any, meta Meta) error {
	if meta.Page < 1 {
		meta.Page = 1
	}
	if meta.Limit < 1 {
		meta.Limit = 20
	}
	meta.TotalPages = int((meta.Total + int64(meta.Limit) - 1) / int64(meta.Limit))
	return c.Status(http.StatusOK).JSON(listEnvelope{Data: data, Meta: meta})
}

// ErrorHandler dipasang di fiber.Config. Semua error dari handler melewati sini
// sehingga klien selalu menerima bentuk JSON yang sama.
func ErrorHandler(log *slog.Logger) fiber.ErrorHandler {
	return func(c fiber.Ctx, err error) error {
		appErr, ok := apperr.As(err)
		if !ok {
			var fiberErr *fiber.Error
			if errors.As(err, &fiberErr) {
				appErr = mapFiberError(fiberErr)
			} else {
				appErr = apperr.Internal(err)
			}
		}

		if appErr.Status >= http.StatusInternalServerError {
			log.Error("request failed",
				"error", appErr.Err,
				"code", appErr.Code,
				"method", c.Method(),
				"path", c.Path(),
				"request_id", requestid.FromContext(c),
			)
		}

		return c.Status(appErr.Status).JSON(errorEnvelope{
			Error: ErrorBody{
				Code:      appErr.Code,
				Message:   appErr.Message,
				Fields:    appErr.Fields,
				RequestID: requestid.FromContext(c),
			},
		})
	}
}

func mapFiberError(err *fiber.Error) *apperr.Error {
	code := apperr.CodeInternal
	message := err.Message
	switch err.Code {
	case http.StatusBadRequest, http.StatusUnprocessableEntity:
		code = apperr.CodeValidation
	case http.StatusUnauthorized:
		code = apperr.CodeUnauthorized
	case http.StatusForbidden:
		code = apperr.CodeForbidden
	case http.StatusNotFound:
		code = apperr.CodeNotFound
	case http.StatusConflict:
		code = apperr.CodeConflict
	case http.StatusTooManyRequests:
		code = apperr.CodeRateLimited
	case http.StatusInternalServerError:
		code = apperr.CodeInternal
		message = "Terjadi kesalahan pada server."
	}
	return apperr.New(err.Code, code, message)
}
