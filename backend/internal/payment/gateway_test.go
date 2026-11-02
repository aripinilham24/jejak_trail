package payment

import (
	"encoding/json"
	"testing"
)

func TestMockGatewaySignature(t *testing.T) {
	gateway := NewMockGateway("secret-test")
	payload := []byte(`{"id":"evt-1","order_id":"JT-1","status":"paid","paid_at":"2026-11-03T10:00:00Z"}`)
	signature := gateway.Sign(payload)

	event, err := gateway.VerifyAndParse(payload, signature)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if event.ID != "evt-1" || event.OrderID != "JT-1" || event.Status != "paid" {
		t.Fatalf("event tidak sesuai: %+v", event)
	}

	if _, err := gateway.VerifyAndParse(payload, "deadbeef"); err == nil {
		t.Fatal("signature salah seharusnya ditolak")
	}
}

func TestMockGatewayRejectsUnknownStatus(t *testing.T) {
	gateway := NewMockGateway("secret-test")
	payload, _ := json.Marshal(map[string]string{
		"id": "evt-2", "order_id": "JT-2", "status": "refunded",
	})
	if _, err := gateway.VerifyAndParse(payload, gateway.Sign(payload)); err == nil {
		t.Fatal("status tidak dikenal seharusnya ditolak")
	}
}
