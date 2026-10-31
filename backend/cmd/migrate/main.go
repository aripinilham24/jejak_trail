package main

import (
	"database/sql"
	"fmt"
	"log/slog"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/aripinilham/jejak_trail/backend/internal/config"
	"github.com/aripinilham/jejak_trail/backend/internal/db"
)

func main() {
	if err := run(); err != nil {
		slog.Error("migrate gagal", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	conn, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("buka database: %w", err)
	}
	defer conn.Close()

	goose.SetBaseFS(db.Migrations)
	goose.SetVerbose(true)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set dialect: %w", err)
	}

	command := "up"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	var commandErr error
	switch command {
	case "up":
		commandErr = goose.Up(conn, "migrations")
	case "status":
		commandErr = goose.Status(conn, "migrations")
	case "version":
		commandErr = goose.Version(conn, "migrations")
	case "reset":
		if cfg.IsProduction() {
			return fmt.Errorf("reset tidak boleh dijalankan di production")
		}
		if _, err := conn.Exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`); err != nil {
			return fmt.Errorf("reset schema: %w", err)
		}
		slog.Info("schema public di-reset")
		commandErr = goose.Up(conn, "migrations")
	default:
		return fmt.Errorf("perintah tidak dikenal: %s (gunakan: up|status|version|reset)", command)
	}

	if commandErr != nil {
		return fmt.Errorf("goose %s: %w", command, commandErr)
	}
	return nil
}
