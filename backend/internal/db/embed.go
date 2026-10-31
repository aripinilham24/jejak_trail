package db

import "embed"

// Migrations di-embed agar binary bisa menjalankan migrasi tanpa file eksternal.
//
//go:embed migrations/*.sql
var Migrations embed.FS
