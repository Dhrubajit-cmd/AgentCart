package db

import (
	"database/sql"
	"log"
	"time"

	"agentcart/internal/config"

	// postgres driver
	_ "github.com/lib/pq"
)

// DB is the global database connection pool
var DB *sql.DB

// InitDB connects to the database and pings it to ensure compatibility
func InitDB() {
	var err error
	DB, err = sql.Open("postgres", config.AppConfig.DatabaseURL)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}

	// Configure the connection pool
	DB.SetMaxOpenConns(20)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(time.Hour)

	// Check connection
	if err = DB.Ping(); err != nil {
		log.Fatalf("Error connecting to the database: %v", err)
	}

	log.Println("Database connection successfully established.")
}
