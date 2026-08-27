package merchant

import (
	"database/sql"
	"net/http"

	"agentcart/internal/db"
	"agentcart/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

// OnboardingRequest represents the merchant profile onboarding details
type OnboardingRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// ProductRequest represents the payload to create/update a product
type ProductRequest struct {
	Name          string   `json:"name" binding:"required"`
	Description   string   `json:"description"`
	PricePaise    int64    `json:"price_paise" binding:"required,gte=0"`
	Inventory     int      `json:"inventory" binding:"required,gte=0"`
	ImageURL      string   `json:"image_url"`
	Category      string   `json:"category"`
	Compatibility []string `json:"compatibility"`
}

// GetProfile fetches the current authenticated merchant's details
func GetProfile(c *gin.Context) {
	merchantID := c.GetString("merchant_id")

	var m models.Merchant
	err := db.DB.QueryRow(
		"SELECT id, user_id, slug, name, COALESCE(description, ''), created_at FROM merchants WHERE id = $1",
		merchantID,
	).Scan(&m.ID, &m.UserID, &m.Slug, &m.Name, &m.Description, &m.CreatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant profile not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, m)
}

// OnboardMerchant updates the store name and description
func OnboardMerchant(c *gin.Context) {
	merchantID := c.GetString("merchant_id")

	var req OnboardingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := db.DB.Exec(
		"UPDATE merchants SET name = $1, description = $2 WHERE id = $3",
		req.Name, req.Description, merchantID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Store profile updated successfully"})
}

// ListProducts returns all products owned by the merchant
func ListProducts(c *gin.Context) {
	merchantID := c.GetString("merchant_id")

	rows, err := db.DB.Query(
		"SELECT id, merchant_id, name, COALESCE(description, ''), price_paise, inventory, COALESCE(image_url, ''), COALESCE(category, ''), compatibility, created_at FROM products WHERE merchant_id = $1 ORDER BY created_at DESC",
		merchantID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	defer rows.Close()

	products := []models.Product{}
	for rows.Next() {
		var p models.Product
		err := rows.Scan(
			&p.ID, &p.MerchantID, &p.Name, &p.Description,
			&p.PricePaise, &p.Inventory, &p.ImageURL, &p.Category,
			&p.Compatibility, &p.CreatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse products"})
			return
		}
		products = append(products, p)
	}

	c.JSON(http.StatusOK, products)
}

// CreateProduct adds a new item to the store catalog
func CreateProduct(c *gin.Context) {
	merchantID := c.GetString("merchant_id")

	var req ProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var productID string
	err := db.DB.QueryRow(
		"INSERT INTO products (merchant_id, name, description, price_paise, inventory, image_url, category, compatibility) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
		merchantID, req.Name, req.Description, req.PricePaise, req.Inventory, req.ImageURL, req.Category, pq.StringArray(req.Compatibility),
	).Scan(&productID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": productID, "message": "Product created successfully"})
}

// UpdateProduct modifies details of an existing catalog item
func UpdateProduct(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	productID := c.Param("id")

	var req ProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := db.DB.Exec(
		"UPDATE products SET name = $1, description = $2, price_paise = $3, inventory = $4, image_url = $5, category = $6, compatibility = $7 WHERE id = $8 AND merchant_id = $9",
		req.Name, req.Description, req.PricePaise, req.Inventory, req.ImageURL, req.Category, pq.StringArray(req.Compatibility), productID, merchantID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product: " + err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found or not owned by you"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product updated successfully"})
}

// DeleteProduct deletes an item from the merchant catalog
func DeleteProduct(c *gin.Context) {
	merchantID := c.GetString("merchant_id")
	productID := c.Param("id")

	result, err := db.DB.Exec(
		"DELETE FROM products WHERE id = $1 AND merchant_id = $2",
		productID, merchantID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product: " + err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found or not owned by you"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}
