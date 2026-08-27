package catalog

import (
	"database/sql"
	"net/http"

	"agentcart/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

// CatalogProduct represents a customer-facing safe product view
type CatalogProduct struct {
	ID            string         `json:"id"`
	Name          string         `json:"name"`
	Description   string         `json:"description"`
	PricePaise    int64          `json:"price_paise"`
	StockStatus   string         `json:"stock_status"` // "in_stock" or "out_of_stock"
	ImageURL      string         `json:"image_url"`
	Category      string         `json:"category"`
	Compatibility pq.StringArray `json:"compatibility"`
}

// MerchantPublicInfo represents public shop metadata
type MerchantPublicInfo struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
}

// GetCatalogResponse matches the AI-readable catalog structure
type GetCatalogResponse struct {
	Merchant MerchantPublicInfo `json:"merchant"`
	Catalog  []CatalogProduct   `json:"catalog"`
}

// GetPublicCatalog fetches public items for a merchant store by slug
func GetPublicCatalog(c *gin.Context) {
	slug := c.Param("slug")

	// 1. Fetch merchant details
	var merchantID, name, description string
	err := db.DB.QueryRow(
		"SELECT id, name, COALESCE(description, '') FROM merchants WHERE slug = $1",
		slug,
	).Scan(&merchantID, &name, &description)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	// 2. Fetch all products in stock or out of stock (with stock status computed)
	rows, err := db.DB.Query(
		"SELECT id, name, COALESCE(description, ''), price_paise, inventory, COALESCE(image_url, ''), COALESCE(category, ''), compatibility FROM products WHERE merchant_id = $1",
		merchantID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	defer rows.Close()

	catalog := []CatalogProduct{}
	for rows.Next() {
		var id, prodName, desc, imgURL, cat string
		var price int64
		var inventory int
		var compatibility pq.StringArray

		err := rows.Scan(&id, &prodName, &desc, &price, &inventory, &imgURL, &cat, &compatibility)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse catalog products"})
			return
		}

		stockStatus := "in_stock"
		if inventory <= 0 {
			stockStatus = "out_of_stock"
		}

		catalog = append(catalog, CatalogProduct{
			ID:            id,
			Name:          prodName,
			Description:   desc,
			PricePaise:    price,
			StockStatus:   stockStatus,
			ImageURL:      imgURL,
			Category:      cat,
			Compatibility: compatibility,
		})
	}

	response := GetCatalogResponse{
		Merchant: MerchantPublicInfo{
			Name:        name,
			Slug:        slug,
			Description: description,
		},
		Catalog: catalog,
	}

	c.JSON(http.StatusOK, response)
}

// GetWellKnownConfig exposes the AI-readable standard manifest endpoint
func GetWellKnownConfig(c *gin.Context) {
	// Reuses the public catalog logic for standard compatibility routing
	GetPublicCatalog(c)
}
