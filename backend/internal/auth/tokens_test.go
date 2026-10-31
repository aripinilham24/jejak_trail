package auth

import (
	"testing"
	"time"
)

func TestIssueAndParseAccessToken(t *testing.T) {
	manager := NewTokenManager("test-secret-0123456789-0123456789", 15*time.Minute, "jejak-test", "jejak-web")

	raw, expiresIn, err := manager.IssueAccess("user-1", AccountOrganizer, RoleOwner, "org-1")
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if expiresIn != 900 {
		t.Fatalf("expiresIn = %d, want 900", expiresIn)
	}

	claims, err := manager.ParseAccess(raw)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if claims.Subject != "user-1" || claims.AccountType != AccountOrganizer || claims.Role != RoleOwner || claims.OrganizationID != "org-1" {
		t.Fatalf("claims tidak sesuai: %+v", claims)
	}
}

func TestParseAccessTokenRejectsWrongSecret(t *testing.T) {
	issuer := NewTokenManager("secret-a-0123456789-0123456789", time.Minute, "jejak-test", "jejak-web")
	verifier := NewTokenManager("secret-b-0123456789-0123456789", time.Minute, "jejak-test", "jejak-web")

	raw, _, err := issuer.IssueAccess("user-1", AccountAttendee, "", "")
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if _, err := verifier.ParseAccess(raw); err == nil {
		t.Fatal("token dengan secret berbeda seharusnya ditolak")
	}
}

func TestHashTokenDeterministic(t *testing.T) {
	if HashToken("abc") != HashToken("abc") {
		t.Fatal("hash harus deterministik")
	}
	if HashToken("abc") == HashToken("abd") {
		t.Fatal("hash berbeda untuk input berbeda")
	}
}
