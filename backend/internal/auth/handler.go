package auth

import (
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/aripinilham/jejak_trail/backend/internal/config"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/apperr"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/httpx"
)

type Handler struct {
	service *Service
	cfg     *config.Config
}

func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

type attendeeRegisterRequest struct {
	Email                 string  `json:"email"`
	Password              string  `json:"password"`
	FullName              string  `json:"fullName"`
	Phone                 *string `json:"phone"`
	BirthDate             *string `json:"birthDate"`
	Gender                *string `json:"gender"`
	EmergencyContactName  *string `json:"emergencyContactName"`
	EmergencyContactPhone *string `json:"emergencyContactPhone"`
}

func (h *Handler) RegisterAttendee(c fiber.Ctx) error {
	var req attendeeRegisterRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	resp, refresh, err := h.service.RegisterAttendee(c.Context(), RegisterAttendeeInput{
		Email:                 req.Email,
		Password:              req.Password,
		FullName:              req.FullName,
		Phone:                 req.Phone,
		BirthDate:             req.BirthDate,
		Gender:                req.Gender,
		EmergencyContactName:  req.EmergencyContactName,
		EmergencyContactPhone: req.EmergencyContactPhone,
	}, sessionMeta(c))
	if err != nil {
		return err
	}

	h.setRefreshCookie(c, refresh)
	return httpx.Created(c, resp)
}

type organizerRegisterRequest struct {
	Organization struct {
		Name          string  `json:"name"`
		OrgType       string  `json:"orgType"`
		OfficialEmail string  `json:"officialEmail"`
		Phone         string  `json:"phone"`
		Address       string  `json:"address"`
		Province      string  `json:"province"`
		City          string  `json:"city"`
		LegalDocKey   *string `json:"legalDocKey"`
	} `json:"organization"`
	Owner struct {
		Email         string  `json:"email"`
		Password      string  `json:"password"`
		FullName      string  `json:"fullName"`
		Phone         *string `json:"phone"`
		PositionTitle *string `json:"positionTitle"`
	} `json:"owner"`
	Bank struct {
		BankName      string `json:"bankName"`
		AccountNumber string `json:"accountNumber"`
		AccountHolder string `json:"accountHolder"`
	} `json:"bank"`
}

func (h *Handler) RegisterOrganizer(c fiber.Ctx) error {
	var req organizerRegisterRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	resp, refresh, err := h.service.RegisterOrganizer(c.Context(), RegisterOrganizerInput{
		OrganizationName:   req.Organization.Name,
		OrgType:            req.Organization.OrgType,
		OrganizationEmail:  req.Organization.OfficialEmail,
		OrganizationPhone:  req.Organization.Phone,
		Address:            req.Organization.Address,
		Province:           req.Organization.Province,
		City:               req.Organization.City,
		LegalDocKey:        req.Organization.LegalDocKey,
		OwnerEmail:         req.Owner.Email,
		OwnerPassword:      req.Owner.Password,
		OwnerFullName:      req.Owner.FullName,
		OwnerPhone:         req.Owner.Phone,
		OwnerPositionTitle: req.Owner.PositionTitle,
		BankName:           req.Bank.BankName,
		BankAccountNumber:  req.Bank.AccountNumber,
		BankAccountHolder:  req.Bank.AccountHolder,
	}, sessionMeta(c))
	if err != nil {
		return err
	}

	h.setRefreshCookie(c, refresh)
	return httpx.Created(c, resp)
}

type loginRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	AccountType string `json:"accountType"`
}

func (h *Handler) Login(c fiber.Ctx) error {
	var req loginRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	resp, refresh, err := h.service.Login(c.Context(), LoginInput{
		Email:       req.Email,
		Password:    req.Password,
		AccountType: req.AccountType,
	}, sessionMeta(c))
	if err != nil {
		return err
	}

	h.setRefreshCookie(c, refresh)
	return httpx.OK(c, resp)
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

func (h *Handler) Refresh(c fiber.Ctx) error {
	raw := c.Cookies(h.cfg.RefreshCookieName)
	if raw == "" {
		var req refreshRequest
		if err := c.Bind().Body(&req); err == nil {
			raw = req.RefreshToken
		}
	}

	resp, newRefresh, err := h.service.Refresh(c.Context(), raw, sessionMeta(c))
	if err != nil {
		h.clearRefreshCookie(c)
		return err
	}

	h.setRefreshCookie(c, newRefresh)
	return httpx.OK(c, resp)
}

func (h *Handler) Logout(c fiber.Ctx) error {
	raw := c.Cookies(h.cfg.RefreshCookieName)
	if raw == "" {
		var req refreshRequest
		if err := c.Bind().Body(&req); err == nil {
			raw = req.RefreshToken
		}
	}

	if err := h.service.Logout(c.Context(), raw); err != nil {
		return err
	}
	h.clearRefreshCookie(c)
	return httpx.NoContent(c)
}

func (h *Handler) Me(c fiber.Ctx) error {
	claims, ok := ClaimsFrom(c)
	if !ok {
		return apperr.Unauthorized("")
	}
	identity, err := h.service.Me(c.Context(), claims)
	if err != nil {
		return err
	}
	return httpx.OK(c, identity)
}

type updateProfileRequest struct {
	FullName              string  `json:"fullName"`
	Phone                 *string `json:"phone"`
	BirthDate             *string `json:"birthDate"`
	Gender                *string `json:"gender"`
	EmergencyContactName  *string `json:"emergencyContactName"`
	EmergencyContactPhone *string `json:"emergencyContactPhone"`
}

func (h *Handler) UpdateProfile(c fiber.Ctx) error {
	claims, ok := ClaimsFrom(c)
	if !ok {
		return apperr.Unauthorized("")
	}

	var req updateProfileRequest
	if err := c.Bind().Body(&req); err != nil {
		return apperr.BadRequest("Body JSON tidak valid.")
	}

	user, err := h.service.UpdateProfile(c.Context(), claims.Subject, UpdateProfileInput{
		FullName:              req.FullName,
		Phone:                 req.Phone,
		BirthDate:             req.BirthDate,
		Gender:                req.Gender,
		EmergencyContactName:  req.EmergencyContactName,
		EmergencyContactPhone: req.EmergencyContactPhone,
	})
	if err != nil {
		return err
	}
	return httpx.OK(c, user)
}

func (h *Handler) VerifyEmail(c fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		token = c.Get("X-Verification-Token")
	}
	if err := h.service.VerifyEmail(c.Context(), token); err != nil {
		return err
	}
	return httpx.OK(c, fiber.Map{"verified": true})
}

func (h *Handler) setRefreshCookie(c fiber.Ctx, token string) {
	c.Cookie(&fiber.Cookie{
		Name:     h.cfg.RefreshCookieName,
		Value:    token,
		Path:     "/api/v1/auth",
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: fiber.CookieSameSiteLaxMode,
		Expires:  time.Now().Add(h.cfg.RefreshTokenTTL),
	})
}

func (h *Handler) clearRefreshCookie(c fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     h.cfg.RefreshCookieName,
		Value:    "",
		Path:     "/api/v1/auth",
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: fiber.CookieSameSiteLaxMode,
		Expires:  time.Now().Add(-time.Hour),
	})
}

func sessionMeta(c fiber.Ctx) SessionMeta {
	return SessionMeta{
		IP:        c.IP(),
		UserAgent: c.Get(fiber.HeaderUserAgent),
	}
}
