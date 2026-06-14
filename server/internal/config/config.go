// Package config provides application configuration loaded from environment variables.
package config

import (
	"os"
)

// Config holds all application configuration.
type Config struct {
	Server    ServerConfig
	Database  DatabaseConfig
	Qdrant    QdrantConfig
	Embedding EmbeddingConfig
}

// ServerConfig holds HTTP server settings.
type ServerConfig struct {
	Port string
	Host string
}

// DatabaseConfig holds PostgreSQL connection settings.
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// QdrantConfig holds Qdrant vector database settings.
type QdrantConfig struct {
	Host       string
	HTTPPort   string
	GRPCPort   string
	Collection string
	VectorSize int
}

// EmbeddingConfig holds embedding service settings.
type EmbeddingConfig struct {
	URL       string
	Model     string
	TimeoutMs int
}

// DSN returns the PostgreSQL connection string.
func (d DatabaseConfig) DSN() string {
	return "host=" + d.Host +
		" port=" + d.Port +
		" user=" + d.User +
		" password=" + d.Password +
		" dbname=" + d.DBName +
		" sslmode=" + d.SSLMode
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8080"),
			Host: getEnv("SERVER_HOST", "0.0.0.0"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "drew"),
			Password: getEnv("DB_PASSWORD", "drew"),
			DBName:   getEnv("DB_NAME", "drew"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Qdrant: QdrantConfig{
			Host:       getEnv("QDRANT_HOST", "localhost"),
			HTTPPort:   getEnv("QDRANT_HTTP_PORT", "6333"),
			GRPCPort:   getEnv("QDRANT_GRPC_PORT", "6334"),
			Collection: getEnv("QDRANT_COLLECTION", "snapshots"),
			VectorSize: getEnvInt("QDRANT_VECTOR_SIZE", 1024), // BGE-M3 dim = 1024
		},
		Embedding: EmbeddingConfig{
			URL:       getEnv("EMBEDDING_URL", "http://localhost:8090"),
			Model:     getEnv("EMBEDDING_MODEL", "BAAI/bge-m3"),
			TimeoutMs: getEnvInt("EMBEDDING_TIMEOUT_MS", 5000),
		},
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n := 0
	for _, c := range v {
		if c < '0' || c > '9' {
			return fallback
		}
		n = n*10 + int(c-'0')
	}
	return n
}
