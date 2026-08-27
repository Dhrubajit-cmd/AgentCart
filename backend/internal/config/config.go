package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config represents the application configuration
type Config struct {
	Port                  string
	DatabaseURL           string
	JWTSecret             string
	GeminiAPIKey          string
	RazorpayKeyID         string
	RazorpayKeySecret     string
	RazorpayWebhookSecret string
	FrontendURL           string
}

// AppConfig is the global configuration instance
var AppConfig *Config

// LoadConfig loads configuration from environment variables or .env file
func LoadConfig() {
	// Attempt to load .env file. Ignore errors as the file may not exist in production (Render)
	_ = godotenv.Load()

	AppConfig = &Config{
		Port:                  getEnv("PORT", "8080"),
		DatabaseURL:           getRequiredEnv("DATABASE_URL"),
		JWTSecret:             getRequiredEnv("JWT_SECRET"),
		GeminiAPIKey:          getRequiredEnv("GEMINI_API_KEY"),
		RazorpayKeyID:         getRequiredEnv("RAZORPAY_KEY_ID"),
		RazorpayKeySecret:     getRequiredEnv("RAZORPAY_KEY_SECRET"),
		RazorpayWebhookSecret: getRequiredEnv("RAZORPAY_WEBHOOK_SECRET"),
		FrontendURL:           getEnv("FRONTEND_URL", "http://localhost:5173"),
	}
}

// getEnv retrieves an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// getRequiredEnv retrieves an environment variable and crashes the app if not set
func getRequiredEnv(key string) string {
	value, exists := os.LookupEnv(key)
	if !exists || value == "" {
		log.Fatalf("CRITICAL CONFIG ERROR: Environment variable %s is required but is not set.", key)
	}
	return value
}
