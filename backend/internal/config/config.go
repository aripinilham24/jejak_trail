package config

import (
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

// Config adalah seluruh konfigurasi runtime aplikasi. Nilai dibaca dari
// environment (12-factor). File .env hanya dimuat untuk development.
type Config struct {
	AppEnv      string   `env:"APP_ENV" envDefault:"development"`
	AppName     string   `env:"APP_NAME" envDefault:"jejak-trail-api"`
	AppPort     string   `env:"APP_PORT" envDefault:"8080"`
	AppBaseURL  string   `env:"APP_BASE_URL" envDefault:"http://localhost:8080"`
	CORSOrigins []string `env:"CORS_ORIGINS" envSeparator:"," envDefault:"http://localhost:5173,http://127.0.0.1:5173"`
	LogLevel    string   `env:"LOG_LEVEL" envDefault:"info"`

	DatabaseURL string `env:"DATABASE_URL,required"`
	DBMaxConns  int32  `env:"DB_MAX_CONNS" envDefault:"20"`
	DBMinConns  int32  `env:"DB_MIN_CONNS" envDefault:"2"`

	JWTAccessSecret   string        `env:"JWT_ACCESS_SECRET,required"`
	AccessTokenTTL    time.Duration `env:"ACCESS_TOKEN_TTL" envDefault:"15m"`
	RefreshTokenTTL   time.Duration `env:"REFRESH_TOKEN_TTL" envDefault:"720h"`
	RefreshCookieName string        `env:"REFRESH_COOKIE_NAME" envDefault:"jt_refresh"`
	CookieSecure      bool          `env:"COOKIE_SECURE" envDefault:"false"`
	CookieDomain      string        `env:"COOKIE_DOMAIN"`

	EncryptionKey string `env:"ENCRYPTION_KEY"`

	StorageDriver  string `env:"STORAGE_DRIVER" envDefault:"s3"`
	StorageBucket  string `env:"S3_BUCKET" envDefault:"jejak-private"`
	S3Endpoint     string `env:"S3_ENDPOINT" envDefault:"http://localhost:9000"`
	S3Region       string `env:"S3_REGION" envDefault:"us-east-1"`
	S3AccessKey    string `env:"S3_ACCESS_KEY" envDefault:"minioadmin"`
	S3SecretKey    string `env:"S3_SECRET_KEY" envDefault:"minioadmin"`
	S3UsePathStyle bool   `env:"S3_USE_PATH_STYLE" envDefault:"true"`

	SMTPHost     string `env:"SMTP_HOST" envDefault:"localhost"`
	SMTPPort     int    `env:"SMTP_PORT" envDefault:"1025"`
	SMTPUsername string `env:"SMTP_USERNAME"`
	SMTPPassword string `env:"SMTP_PASSWORD"`
	MailFrom     string `env:"MAIL_FROM" envDefault:"Jejak Trail <no-reply@jejak.local>"`

	PaymentDriver      string        `env:"PAYMENT_DRIVER" envDefault:"mock"`
	PaymentWindow      time.Duration `env:"PAYMENT_WINDOW" envDefault:"24h"`
	VerificationWindow time.Duration `env:"VERIFICATION_WINDOW" envDefault:"72h"`
	PlatformFeeBPS     int64         `env:"PLATFORM_FEE_BPS" envDefault:"300"`
	GatewayFeeFixed    int64         `env:"GATEWAY_FEE_FIXED" envDefault:"1000"`
	GatewayFeeBPS      int64         `env:"GATEWAY_FEE_BPS" envDefault:"140"`
}

func Load() (*Config, error) {
	// .env opsional; abaikan bila tidak ada.
	_ = godotenv.Load(".env")

	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	for i, origin := range cfg.CORSOrigins {
		cfg.CORSOrigins[i] = strings.TrimSpace(origin)
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) IsProduction() bool {
	return c.AppEnv == "production"
}

func (c *Config) IsDevelopment() bool {
	return c.AppEnv == "development"
}

func (c *Config) validate() error {
	if c.AppPort == "" {
		return fmt.Errorf("APP_PORT wajib diisi")
	}
	if c.AccessTokenTTL >= c.RefreshTokenTTL {
		return fmt.Errorf("ACCESS_TOKEN_TTL harus lebih pendek dari REFRESH_TOKEN_TTL")
	}
	if c.IsProduction() && c.EncryptionKey == "" {
		return fmt.Errorf("ENCRYPTION_KEY wajib diisi di production")
	}
	if c.EncryptionKey != "" {
		key, err := base64.StdEncoding.DecodeString(c.EncryptionKey)
		if err != nil {
			return fmt.Errorf("ENCRYPTION_KEY harus base64: %w", err)
		}
		if len(key) != 32 {
			return fmt.Errorf("ENCRYPTION_KEY harus 32 byte (base64), dapat %d byte", len(key))
		}
	}
	if c.PlatformFeeBPS < 0 || c.PlatformFeeBPS > 10000 {
		return fmt.Errorf("PLATFORM_FEE_BPS harus di antara 0 dan 10000")
	}
	return nil
}
