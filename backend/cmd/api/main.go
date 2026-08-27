package main

import (
	"log"
	"net/http"

	"agentcart/internal/auth"
	"agentcart/internal/cart"
	"agentcart/internal/catalog"
	"agentcart/internal/config"
	"agentcart/internal/db"
	"agentcart/internal/merchant"
	"agentcart/internal/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	log.Println("Starting AgentCart Monolith Server...")

	// 1. Load configuration env variables
	config.LoadConfig()

	// 2. Initialize connection pool to database
	db.InitDB()

	// 3. Setup Gin router
	r := gin.Default()

	// Apply CORS middleware globally
	r.Use(middleware.CORSMiddleware())

	// 4. Register public general routes
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "AgentCart Backend"})
	})

	// 5. Register authentication routes
	r.POST("/api/auth/register", auth.Register)
	r.POST("/api/auth/login", auth.Login)

	// 6. Register public merchant catalog routes (AI-readable)
	r.GET("/api/m/:slug/catalog", catalog.GetPublicCatalog)
	r.GET("/api/m/:slug/.well-known/agent-commerce.json", catalog.GetWellKnownConfig)

	// 7. Register guest cart routes
	r.GET("/api/cart", cart.GetCart)
	r.POST("/api/cart/items", cart.UpdateCartItem)

	// 8. Register protected merchant management routes
	merchantRoutes := r.Group("/api/merchant")
	merchantRoutes.Use(middleware.AuthMiddleware())
	{
		merchantRoutes.GET("/profile", merchant.GetProfile)
		merchantRoutes.POST("/onboarding", merchant.OnboardMerchant)
		merchantRoutes.GET("/products", merchant.ListProducts)
		merchantRoutes.POST("/products", merchant.CreateProduct)
		merchantRoutes.PUT("/products/:id", merchant.UpdateProduct)
		merchantRoutes.DELETE("/products/:id", merchant.DeleteProduct)
		merchantRoutes.POST("/products/seed", merchant.SeedTechNestCatalog)
	}

	// 9. Launch the HTTP server
	port := config.AppConfig.Port
	log.Printf("Server listening on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
