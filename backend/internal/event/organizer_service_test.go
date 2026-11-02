package event

import "testing"

func validBuilderInput() BuilderInput {
	return BuilderInput{
		Title:        "Trail Uji",
		LocationName: "Bukit Uji",
		Province:     "Jawa Barat",
		City:         "Bogor",
		EventStartAt: "2027-03-01T06:00:00+07:00",
		EventEndAt:   "2027-03-01T18:00:00+07:00",
		RefundPolicy: &BuilderRefundPolicyInput{
			Name:       "Refund Uji",
			PolicyType: "tiered",
			Rules: []BuilderRefundRuleInput{
				{DaysBeforeEventMin: 30, RefundPercent: 70},
			},
		},
		Categories: []BuilderCategoryInput{
			{
				Name:                  "30K",
				DistanceKm:            30,
				Difficulty:            "hard",
				Price:                 600000,
				Quota:                 100,
				BibPrefix:             "UJI30",
				BibStart:              1,
				BibEnd:                100,
				RequiresQualification: true,
				Requirements: []BuilderRequirementInput{
					{RequirementType: "finisher_certificate", Label: "Sertifikat finisher", IsRequired: true},
				},
			},
		},
		FormFields: []BuilderFormFieldInput{
			{FieldKey: "jersey_size", Label: "Ukuran jersey", FieldType: "select", Options: []string{"S", "M", "L"}},
		},
	}
}

func TestValidateBuilderInput(t *testing.T) {
	if _, err := validateBuilderInput(validBuilderInput()); err != nil {
		t.Fatalf("input valid ditolak: %v", err)
	}

	invalid := validBuilderInput()
	invalid.Categories = nil
	if _, err := validateBuilderInput(invalid); err == nil {
		t.Fatal("event tanpa kategori seharusnya ditolak")
	}

	invalid = validBuilderInput()
	invalid.RefundPolicy.Rules[0].RefundPercent = 150
	if _, err := validateBuilderInput(invalid); err == nil {
		t.Fatal("persentase refund di atas 100 seharusnya ditolak")
	}

	invalid = validBuilderInput()
	invalid.RegistrationCloseAt = "2027-03-02T06:00:00+07:00"
	if _, err := validateBuilderInput(invalid); err == nil {
		t.Fatal("pendaftaran yang ditutup setelah event mulai seharusnya ditolak")
	}

	invalid = validBuilderInput()
	invalid.Categories[0].Requirements[0].RequirementType = "unknown"
	if _, err := validateBuilderInput(invalid); err == nil {
		t.Fatal("tipe requirement tidak dikenal seharusnya ditolak")
	}
}
