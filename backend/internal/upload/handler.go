package upload

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/auth"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/httpx"
	"github.com/aripinilham/jejak_trail/backend/internal/storage"
)

const maxFileSize = 20 * 1024 * 1024

var allowedExtensions = map[string]bool{
	".pdf": true, ".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gpx": true,
}

var allowedPurposes = map[string]bool{
	"qualification": true, "legal": true, "cover": true, "gpx": true, "document": true,
}

type Handler struct {
	storage storage.Storage
}

func NewHandler(store storage.Storage) *Handler {
	return &Handler{storage: store}
}

type response struct {
	Key string `json:"key"`
	URL string `json:"url"`
}

func (h *Handler) Upload(c fiber.Ctx) error {
	claims, ok := auth.ClaimsFrom(c)
	if !ok {
		return apperr.Unauthorized("")
	}
	if h.storage == nil {
		return apperr.Internal(fmt.Errorf("storage belum dikonfigurasi"))
	}

	purpose := strings.TrimSpace(c.FormValue("purpose"))
	if purpose == "" {
		purpose = "document"
	}
	if !allowedPurposes[purpose] {
		return apperr.Validation(map[string]string{"purpose": "Purpose tidak dikenal."})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return apperr.Validation(map[string]string{"file": "File wajib diunggah."})
	}
	if file.Size <= 0 || file.Size > maxFileSize {
		return apperr.Validation(map[string]string{"file": "Ukuran file maksimal 20 MB."})
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedExtensions[ext] {
		return apperr.Validation(map[string]string{"file": "Tipe file harus PDF, JPG, PNG, WEBP, atau GPX."})
	}

	opened, err := file.Open()
	if err != nil {
		return apperr.Internal(err)
	}
	defer opened.Close()

	head := make([]byte, 512)
	n, _ := opened.Read(head)
	contentType := http.DetectContentType(head[:n])
	if ext == ".pdf" {
		contentType = "application/pdf"
	}
	if ext == ".gpx" {
		contentType = "application/gpx+xml"
	}
	if _, err := opened.Seek(0, 0); err != nil {
		return apperr.Internal(err)
	}

	key := buildKey(claims.AccountType, claims.Subject, claims.OrganizationID, purpose, ext)
	if err := h.storage.Put(c.Context(), key, opened, file.Size, contentType); err != nil {
		return apperr.Internal(err)
	}

	url, err := h.storage.PresignGet(c.Context(), key, 15*time.Minute)
	if err != nil {
		return apperr.Internal(err)
	}
	return httpx.Created(c, response{Key: key, URL: url})
}

func buildKey(accountType, subjectID, organizationID, purpose, ext string) string {
	name := uuid.NewString() + ext
	switch accountType {
	case auth.AccountOrganizer:
		if organizationID != "" {
			return fmt.Sprintf("organizations/%s/%s/%s", organizationID, purpose, name)
		}
		return fmt.Sprintf("organizers/%s/%s/%s", subjectID, purpose, name)
	default:
		return fmt.Sprintf("%s/%s/%s/%s", accountType, subjectID, purpose, name)
	}
}
