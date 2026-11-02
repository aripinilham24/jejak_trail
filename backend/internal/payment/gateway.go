package payment

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type WebhookEvent struct {
	ID      string
	OrderID string
	Status  string
	PaidAt  time.Time
	Raw     []byte
}

type Gateway interface {
	Name() string
	VerifyAndParse(body []byte, signature string) (WebhookEvent, error)
}

type MockGateway struct {
	secret []byte
}

func NewMockGateway(secret string) *MockGateway {
	return &MockGateway{secret: []byte(secret)}
}

func (g *MockGateway) Name() string { return "mock" }

func (g *MockGateway) VerifyAndParse(body []byte, signature string) (WebhookEvent, error) {
	mac := hmac.New(sha256.New, g.secret)
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(strings.TrimSpace(signature))) {
		return WebhookEvent{}, fmt.Errorf("signature webhook tidak valid")
	}

	var payload struct {
		ID      string `json:"id"`
		OrderID string `json:"order_id"`
		Status  string `json:"status"`
		PaidAt  string `json:"paid_at"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return WebhookEvent{}, fmt.Errorf("payload webhook tidak valid: %w", err)
	}
	if payload.ID == "" || payload.OrderID == "" {
		return WebhookEvent{}, fmt.Errorf("payload webhook tidak lengkap")
	}
	if payload.Status != "paid" && payload.Status != "expired" && payload.Status != "failed" {
		return WebhookEvent{}, fmt.Errorf("status webhook tidak dikenal")
	}

	var paidAt time.Time
	if payload.PaidAt != "" {
		parsed, err := time.Parse(time.RFC3339, payload.PaidAt)
		if err != nil {
			return WebhookEvent{}, fmt.Errorf("paid_at tidak valid: %w", err)
		}
		paidAt = parsed
	}
	if payload.Status == "paid" && paidAt.IsZero() {
		paidAt = time.Now()
	}

	return WebhookEvent{
		ID:      payload.ID,
		OrderID: payload.OrderID,
		Status:  payload.Status,
		PaidAt:  paidAt,
		Raw:     body,
	}, nil
}

// Sign menghasilkan signature HMAC untuk kebutuhan testing webhook.
func (g *MockGateway) Sign(body []byte) string {
	mac := hmac.New(sha256.New, g.secret)
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}
