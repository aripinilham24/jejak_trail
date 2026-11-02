SHELL := /bin/bash
GO ?= go
COMPOSE ?= docker compose

.DEFAULT_GOAL := help

.PHONY: help up down reset ps logs migrate-up migrate-status migrate-version seed run test test-integration sqlc tidy fmt lint build backup restore docker-build docker-up

help: ## Tampilkan daftar target
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

up: ## Nyalakan Postgres, MinIO, Mailpit (tunggu healthy)
	$(COMPOSE) up -d --wait

down: ## Matikan container (data tetap)
	$(COMPOSE) down

reset: ## Hapus volume dev, migrate ulang, lalu seed
	$(COMPOSE) down -v
	$(COMPOSE) up -d --wait
	$(GO) run ./cmd/migrate up
	$(GO) run ./cmd/seed

ps: ## Status container
	$(COMPOSE) ps

logs: ## Ikuti log (contoh: make logs s=minio)
	$(COMPOSE) logs -f $(s)

migrate-up: ## Jalankan migrasi
	$(GO) run ./cmd/migrate up

migrate-status: ## Status migrasi
	$(GO) run ./cmd/migrate status

migrate-version: ## Versi migrasi aktif
	$(GO) run ./cmd/migrate version

seed: ## Isi data development
	$(GO) run ./cmd/seed

run: ## Jalankan API di :8080
	$(GO) run ./cmd/api

test: ## Unit test
	$(GO) test ./...

test-integration: ## Integration test (butuh Postgres dari compose)
	TEST_DATABASE_URL="$${TEST_DATABASE_URL:-postgres://jejak:jejak@localhost:5432/jejak_test?sslmode=disable}" $(GO) test -tags=integration ./...

sqlc: ## Generate kode sqlc
	$(GO) tool sqlc generate

tidy: ## Rapikan go.mod/go.sum
	$(GO) mod tidy

fmt: ## Format Go
	gofmt -w .

lint: ## Vet + cek format
	go vet ./...
	@test -z "$$(gofmt -l .)" || (echo "file belum diformat:"; gofmt -l .; exit 1)

build: ## Build binary API
	$(GO) build -o bin/api ./cmd/api

backup: ## Dump database ke backups/jejak-<timestamp>.sql
	mkdir -p backups
	$(COMPOSE) exec -T postgres sh -c 'pg_dump -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' > backups/jejak-$$(date +%Y%m%d-%H%M%S).sql

restore: ## Restore database (wajib: make restore file=backups/xxx.sql)
	@test -n "$(file)" || (echo "gunakan: make restore file=backups/xxx.sql"; exit 1)
	$(COMPOSE) exec -T postgres sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' < $(file)

docker-build: ## Build image API
	docker build -t jejak-trail-api:local .

docker-up: ## Jalankan API + infra via Docker
	$(COMPOSE) --profile app up -d --build
