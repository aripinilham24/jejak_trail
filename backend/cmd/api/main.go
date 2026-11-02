package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/aripinilham/jejak_trail/backend/internal/audit"
	"github.com/aripinilham/jejak_trail/backend/internal/auth"
	"github.com/aripinilham/jejak_trail/backend/internal/checkin"
	"github.com/aripinilham/jejak_trail/backend/internal/config"
	"github.com/aripinilham/jejak_trail/backend/internal/db"
	"github.com/aripinilham/jejak_trail/backend/internal/db/gen"
	"github.com/aripinilham/jejak_trail/backend/internal/event"
	"github.com/aripinilham/jejak_trail/backend/internal/notification"
	"github.com/aripinilham/jejak_trail/backend/internal/payment"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/crypto"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/httpx"
	"github.com/aripinilham/jejak_trail/backend/internal/platform/middleware"
	"github.com/aripinilham/jejak_trail/backend/internal/registration"
	"github.com/aripinilham/jejak_trail/backend/internal/storage"
	"github.com/aripinilham/jejak_trail/backend/internal/upload"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	logger := newLogger(cfg.LogLevel)
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	database, err := db.Open(ctx, cfg.DatabaseURL, cfg.DBMaxConns, cfg.DBMinConns)
	if err != nil {
		return err
	}
	defer database.Close()

	var encryptor *crypto.Encryptor
	if cfg.EncryptionKey != "" {
		encryptor, err = crypto.NewEncryptor(cfg.EncryptionKey)
		if err != nil {
			return err
		}
	}

	mailer := notification.NewMailer(cfg, logger)
	tokens := auth.NewTokenManager(cfg.JWTAccessSecret, cfg.AccessTokenTTL, cfg.AppName, "jejak-trail-web")
	authService := auth.NewService(database, tokens, cfg, encryptor, mailer, logger)
	authHandler := auth.NewHandler(authService, cfg)

	var store storage.Storage
	if cfg.StorageDriver == "s3" {
		s3, err := storage.NewS3(cfg)
		if err != nil {
			return err
		}
		if err := s3.EnsureBucket(ctx); err != nil {
			logger.Warn("bucket storage belum siap", "error", err)
		}
		store = s3
	}

	auditWriter := audit.NewWriter(genQueries(database), logger)
	eventService := event.NewService(database, auditWriter, cfg, store)
	eventHandler := event.NewHandler(eventService)

	notifier := notification.NewNotifier(genQueries(database), mailer, logger)
	registrationService := registration.NewService(database, cfg, encryptor, notifier, store, logger)
	registrationHandler := registration.NewHandler(registrationService)
	uploadHandler := upload.NewHandler(store)

	gateway := payment.NewMockGateway(cfg.MockWebhookSecret)
	paymentService := payment.NewService(database, cfg, notifier, logger, gateway)
	paymentHandler := payment.NewHandler(paymentService, cfg, gateway)

	checkinService := checkin.NewService(database, logger)
	checkinHandler := checkin.NewHandler(checkinService, genQueries(database))

	go runPaymentExpiry(ctx, paymentService, logger)

	app := newApp(cfg, logger, database, tokens, authHandler, eventHandler, registrationHandler, uploadHandler, paymentHandler, checkinHandler, store)

	logger.Info("starting api",
		"app", cfg.AppName,
		"env", cfg.AppEnv,
		"addr", ":"+cfg.AppPort,
	)

	if err := app.Listen(":"+cfg.AppPort, fiber.ListenConfig{
		GracefulContext:       ctx,
		DisableStartupMessage: true,
	}); err != nil && !errors.Is(err, context.Canceled) {
		return err
	}

	logger.Info("api stopped")
	return nil
}

func newApp(
	cfg *config.Config,
	logger *slog.Logger,
	database *db.DB,
	tokens *auth.TokenManager,
	authHandler *auth.Handler,
	eventHandler *event.Handler,
	registrationHandler *registration.Handler,
	uploadHandler *upload.Handler,
	paymentHandler *payment.Handler,
	checkinHandler *checkin.Handler,
	store storage.Storage,
) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:      cfg.AppName,
		BodyLimit:    10 * 1024 * 1024,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
		ErrorHandler: httpx.ErrorHandler(logger),
	})

	app.Use(middleware.RequestID())
	app.Use(middleware.RequestLogger(logger))
	app.Use(middleware.Recover(logger))
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.CORS(cfg.CORSOrigins))

	app.Get("/health/live", func(c fiber.Ctx) error {
		return httpx.OK(c, fiber.Map{"status": "ok"})
	})

	app.Get("/health/ready", func(c fiber.Ctx) error {
		pingCtx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
		defer cancel()
		if err := database.Ping(pingCtx); err != nil {
			logger.Error("database not ready", "error", err)
			return httpx.Data(c, fiber.StatusServiceUnavailable, fiber.Map{
				"status":   "unavailable",
				"database": "down",
			})
		}
		if store != nil {
			if err := store.Ready(pingCtx); err != nil {
				logger.Error("storage not ready", "error", err)
				return httpx.Data(c, fiber.StatusServiceUnavailable, fiber.Map{
					"status":   "unavailable",
					"database": "up",
					"storage":  "down",
				})
			}
		}
		return httpx.OK(c, fiber.Map{"status": "ok", "database": "up", "storage": "up"})
	})

	api := app.Group("/api/v1")
	api.Get("", func(c fiber.Ctx) error {
		return httpx.OK(c, fiber.Map{
			"name":    cfg.AppName,
			"version": "v1",
		})
	})

	authGroup := api.Group("/auth")
	authGroup.Post("/attendee/register", authHandler.RegisterAttendee)
	authGroup.Post("/organizer/register", authHandler.RegisterOrganizer)
	authGroup.Post("/login", authHandler.Login)
	authGroup.Post("/refresh", authHandler.Refresh)
	authGroup.Post("/logout", authHandler.Logout)
	authGroup.Get("/verify-email", authHandler.VerifyEmail)
	authGroup.Get("/me", auth.RequireAuth(tokens), authHandler.Me)

	account := api.Group("/account", auth.RequireAuth(tokens, auth.AccountAttendee))
	account.Patch("/profile", authHandler.UpdateProfile)
	account.Get("/registrations", registrationHandler.ListMine)
	account.Get("/registrations/:id", registrationHandler.GetMine)
	account.Get("/tickets", paymentHandler.ListTickets)
	account.Get("/tickets/:id", paymentHandler.GetTicket)

	api.Post("/webhooks/payments/:gateway", paymentHandler.Webhook)
	api.Post("/dev/payments/:orderId/simulate", auth.RequireAuth(tokens, auth.AccountAttendee), paymentHandler.SimulatePaid)
	api.Post("/dev/payments/:orderId/expire", auth.RequireAuth(tokens, auth.AccountAttendee), paymentHandler.SimulateExpire)

	api.Post("/events/:slug/registrations", auth.RequireAuth(tokens, auth.AccountAttendee), registrationHandler.Submit)
	api.Post("/uploads", auth.RequireAuth(tokens), uploadHandler.Upload)

	api.Get("/events/calendar", eventHandler.Calendar)
	api.Get("/events", eventHandler.List)
	api.Get("/events/:slug", eventHandler.Detail)
	api.Get("/meta/discovery-filters", eventHandler.Meta)

	organizer := api.Group("/organizer", auth.RequireAuth(tokens, auth.AccountOrganizer))
	organizer.Get("/events", eventHandler.OrganizerList)
	organizer.Post("/events", auth.RequireRole(auth.RoleOwner), eventHandler.OrganizerCreate)
	organizer.Get("/events/:id", eventHandler.OrganizerGet)
	organizer.Put("/events/:id", auth.RequireRole(auth.RoleOwner), eventHandler.OrganizerUpdate)
	organizer.Post("/events/:id/submit", auth.RequireRole(auth.RoleOwner), eventHandler.OrganizerSubmit)
	organizer.Get("/registrations", auth.RequireRole(auth.RoleOwner, auth.RoleVerifier), registrationHandler.OrganizerList)
	organizer.Get("/registrations/:id", auth.RequireRole(auth.RoleOwner, auth.RoleVerifier), registrationHandler.OrganizerGet)
	organizer.Post("/registrations/:id/approve", auth.RequireRole(auth.RoleOwner, auth.RoleVerifier), registrationHandler.OrganizerApprove)
	organizer.Post("/registrations/:id/reject", auth.RequireRole(auth.RoleOwner, auth.RoleVerifier), registrationHandler.OrganizerReject)
	organizer.Get("/events/:id/checkin/manifest", auth.RequireRole(auth.RoleOwner, auth.RoleVerifier, auth.RoleRacepackStaff), checkinHandler.Manifest)
	organizer.Post("/checkin/scan", auth.RequireRole(auth.RoleOwner, auth.RoleVerifier, auth.RoleRacepackStaff), checkinHandler.Scan)
	organizer.Post("/checkin/sync", auth.RequireRole(auth.RoleOwner, auth.RoleVerifier, auth.RoleRacepackStaff), checkinHandler.Sync)

	admin := api.Group("/admin", auth.RequireAuth(tokens, auth.AccountAdmin))
	admin.Get("/events", eventHandler.AdminList)
	admin.Get("/events/:id", eventHandler.AdminGet)
	admin.Post("/events/:id/review", auth.RequireRole(auth.RoleSuperAdmin, auth.RoleSupport), eventHandler.Review)
	admin.Post("/external-events", auth.RequireRole(auth.RoleSuperAdmin, auth.RoleSupport), eventHandler.CreateExternal)
	admin.Patch("/external-events/:id", auth.RequireRole(auth.RoleSuperAdmin, auth.RoleSupport), eventHandler.UpdateExternal)
	admin.Delete("/external-events/:id", auth.RequireRole(auth.RoleSuperAdmin, auth.RoleSupport), eventHandler.DeleteExternal)
	admin.Get("/organizations", eventHandler.AdminListOrganizations)
	admin.Get("/organizations/:id", eventHandler.AdminGetOrganization)
	admin.Post("/organizations/:id/verify", auth.RequireRole(auth.RoleSuperAdmin, auth.RoleSupport), eventHandler.AdminVerifyOrganization)

	return app
}

func newLogger(level string) *slog.Logger {
	var slogLevel slog.Level
	switch strings.ToLower(level) {
	case "debug":
		slogLevel = slog.LevelDebug
	case "warn":
		slogLevel = slog.LevelWarn
	case "error":
		slogLevel = slog.LevelError
	default:
		slogLevel = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slogLevel})
	return slog.New(handler)
}

func genQueries(database *db.DB) *gen.Queries {
	return gen.New(database.Pool)
}

func runPaymentExpiry(ctx context.Context, service *payment.Service, logger *slog.Logger) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := service.ExpireDue(ctx); err != nil {
				logger.Error("job expiry pembayaran gagal", "error", err)
			}
		}
	}
}
