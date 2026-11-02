package registration

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
)

func TestAgeAt(t *testing.T) {
	birth := time.Date(2000, 5, 10, 0, 0, 0, 0, time.UTC)
	if got := ageAt(birth, time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC)); got != 25 {
		t.Fatalf("ageAt sebelum ulang tahun = %d, want 25", got)
	}
	if got := ageAt(birth, time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC)); got != 26 {
		t.Fatalf("ageAt pada ulang tahun = %d, want 26", got)
	}
}

func TestValidateFieldValue(t *testing.T) {
	selectField := gen.RegistrationFormField{
		FieldType: "select",
		Options:   []byte(`["S","M","L"]`),
	}
	if msg := validateFieldValue(selectField, "M"); msg != "" {
		t.Fatalf("opsi valid ditolak: %s", msg)
	}
	if msg := validateFieldValue(selectField, "XL"); msg == "" {
		t.Fatal("opsi tidak dikenal seharusnya ditolak")
	}

	numberField := gen.RegistrationFormField{FieldType: "number"}
	if msg := validateFieldValue(numberField, "12.5"); msg != "" {
		t.Fatalf("angka valid ditolak: %s", msg)
	}
	if msg := validateFieldValue(numberField, "dua belas"); msg == "" {
		t.Fatal("angka tidak valid seharusnya ditolak")
	}

	dateField := gen.RegistrationFormField{FieldType: "date"}
	if msg := validateFieldValue(dateField, "2026-02-31"); msg == "" {
		t.Fatal("tanggal tidak valid seharusnya ditolak")
	}
}

func TestValidUserFileKey(t *testing.T) {
	userID := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	if !validUserFileKey(userID, "attendee/00000000-0000-0000-0000-000000000002/qualification/a.pdf") {
		t.Fatal("key milik user seharusnya diterima")
	}
	if validUserFileKey(userID, "attendee/00000000-0000-0000-0000-000000000003/qualification/a.pdf") {
		t.Fatal("key milik user lain seharusnya ditolak")
	}
}
