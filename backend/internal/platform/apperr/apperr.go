// Package apperr menyediakan error domain yang membawa kode stabil untuk API.
// Semua error yang ingin ditampilkan ke klien harus dibungkus di sini.
package apperr

import (
	"errors"
	"fmt"
	"net/http"
)

const (
	CodeValidation   = "validation_error"
	CodeUnauthorized = "unauthorized"
	CodeForbidden    = "forbidden"
	CodeNotFound     = "not_found"
	CodeConflict     = "conflict"
	CodeRateLimited  = "rate_limited"
	CodeInternal     = "internal_error"
)

type Error struct {
	Status  int
	Code    string
	Message string
	Fields  map[string]string
	Err     error
}

func (e *Error) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *Error) Unwrap() error { return e.Err }

func New(status int, code, message string) *Error {
	return &Error{Status: status, Code: code, Message: message}
}

func Validation(fields map[string]string) *Error {
	return &Error{
		Status:  http.StatusUnprocessableEntity,
		Code:    CodeValidation,
		Message: "Data yang dikirim tidak valid.",
		Fields:  fields,
	}
}

func BadRequest(message string) *Error {
	return New(http.StatusBadRequest, CodeValidation, message)
}

func Unauthorized(message string) *Error {
	if message == "" {
		message = "Autentikasi diperlukan."
	}
	return New(http.StatusUnauthorized, CodeUnauthorized, message)
}

func Forbidden(message string) *Error {
	if message == "" {
		message = "Anda tidak memiliki akses ke resource ini."
	}
	return New(http.StatusForbidden, CodeForbidden, message)
}

func NotFound(message string) *Error {
	if message == "" {
		message = "Resource tidak ditemukan."
	}
	return New(http.StatusNotFound, CodeNotFound, message)
}

func Conflict(message string) *Error {
	return New(http.StatusConflict, CodeConflict, message)
}

func RateLimited(message string) *Error {
	if message == "" {
		message = "Terlalu banyak permintaan. Coba lagi nanti."
	}
	return New(http.StatusTooManyRequests, CodeRateLimited, message)
}

// Internal membungkus error tak terduga. Pesan asli tidak dikirim ke klien.
func Internal(err error) *Error {
	return &Error{
		Status:  http.StatusInternalServerError,
		Code:    CodeInternal,
		Message: "Terjadi kesalahan pada server.",
		Err:     err,
	}
}

// WithField menambahkan detail validasi per field.
func (e *Error) WithField(field, message string) *Error {
	if e.Fields == nil {
		e.Fields = map[string]string{}
	}
	e.Fields[field] = message
	return e
}

// As mengambil *Error dari rantai error.
func As(err error) (*Error, bool) {
	var target *Error
	ok := errors.As(err, &target)
	return target, ok
}
