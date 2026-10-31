package crypto

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Parameter argon2id. Disimpan di dalam hash sehingga bisa dinaikkan nanti
// tanpa merusak password lama.
const (
	argonMemory  = 64 * 1024
	argonTime    = 3
	argonThreads = 2
	saltLength   = 16
	keyLength    = 32
)

func HashPassword(password string) (string, error) {
	if len(password) < 8 {
		return "", fmt.Errorf("password minimal 8 karakter")
	}

	salt := make([]byte, saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate salt: %w", err)
	}

	key := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, keyLength)
	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		argonMemory,
		argonTime,
		argonThreads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

func VerifyPassword(encoded, password string) (bool, error) {
	params, salt, expected, err := parsePasswordHash(encoded)
	if err != nil {
		return false, err
	}

	actual := argon2.IDKey([]byte(password), salt, params.time, params.memory, params.threads, uint32(len(expected)))
	return subtle.ConstantTimeCompare(expected, actual) == 1, nil
}

type argonParams struct {
	memory  uint32
	time    uint32
	threads uint8
}

func parsePasswordHash(encoded string) (argonParams, []byte, []byte, error) {
	var params argonParams
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return params, nil, nil, fmt.Errorf("format hash password tidak dikenal")
	}
	if _, err := fmt.Sscanf(parts[2], "v=%d", new(int)); err != nil {
		return params, nil, nil, fmt.Errorf("versi argon2 tidak valid: %w", err)
	}
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &params.memory, &params.time, &params.threads); err != nil {
		return params, nil, nil, fmt.Errorf("parameter argon2 tidak valid: %w", err)
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return params, nil, nil, fmt.Errorf("salt tidak valid: %w", err)
	}
	key, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return params, nil, nil, fmt.Errorf("hash tidak valid: %w", err)
	}
	return params, salt, key, nil
}

// RandomToken menghasilkan token acak URL-safe. Dipakai untuk refresh token,
// verifikasi email, dan QR tiket.
func RandomToken(bytes int) (string, error) {
	buf := make([]byte, bytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate random token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
