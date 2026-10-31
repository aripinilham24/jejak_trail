package event

import "testing"

func TestSlugify(t *testing.T) {
	cases := map[string]string{
		"Sundoro Trail Challenge": "sundoro-trail-challenge",
		"  Rinjani 100K  ":        "rinjani-100k",
		"Bromo & Tengger!!":       "bromo-tengger",
		"":                        "event",
	}
	for input, want := range cases {
		if got := slugify(input); got != want {
			t.Errorf("slugify(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestValidateExternalInput(t *testing.T) {
	valid := ExternalEventInput{
		Title:        "Event Uji",
		LocationName: "Bandung",
		Province:     "Jawa Barat",
		City:         "Bandung",
		EventStartAt: "2026-12-01T06:00:00+07:00",
		EventEndAt:   "2026-12-01T18:00:00+07:00",
		ExternalURL:  "https://example.com/daftar",
	}
	if _, _, err := validateExternalInput(valid); err != nil {
		t.Fatalf("input valid ditolak: %v", err)
	}

	invalid := valid
	invalid.EventEndAt = "2026-11-01T06:00:00+07:00"
	if _, _, err := validateExternalInput(invalid); err == nil {
		t.Fatal("waktu selesai sebelum mulai seharusnya ditolak")
	}

	invalid = valid
	invalid.ExternalURL = "ftp://example.com"
	if _, _, err := validateExternalInput(invalid); err == nil {
		t.Fatal("URL non-http seharusnya ditolak")
	}
}
