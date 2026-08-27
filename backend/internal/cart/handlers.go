package cart

import (
	"database/sql"
	"net/http"
	"time"

	"agentcart/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

// AddItemRequest represents the input JSON for adding/setting items in cart
type AddItemRequest struct {
	SessionID string `json:"session_id" binding:"required"`
	ProductID string `json:"product_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,gte=0"`
}

// CartItemResponse holds the item details with server-side calculated totals
type CartItemResponse struct {
	ProductID      string         `json:"product_id"`
	Name           string         `json:"name"`
	PricePaise     int64          `json:"price_paise"`
	Quantity       int            `json:"quantity"`
	SubtotalPaise  int64          `json:"subtotal_paise"`
	ImageURL       string         `json:"image_url"`
	Category       string         `json:"category"`
	Compatibility  pq.StringArray `json:"compatibility"`
}

// CartResponse represents the customer's cart with calculated prices
type CartResponse struct {
	CartID          string             `json:"cart_id"`
	SessionID       string             `json:"session_id"`
	Items           []CartItemResponse `json:"items"`
	TotalItems      int                `json:"total_items"`
	TotalPricePaise int64              `json:"total_price_paise"`
}

// UpdateCartItem adds, updates, or deletes an item in the guest cart
func UpdateCartItem(c *gin.Context) {
	var req AddItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters: " + err.Error()})
		return
	}

	// 1. Verify product exists and check stock
	var name string
	var inventory int
	err := db.DB.QueryRow("SELECT name, inventory FROM products WHERE id = $1", req.ProductID).Scan(&name, &inventory)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	if req.Quantity > inventory {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Requested quantity of " + name + " exceeds available stock (" + string(rune(inventory)) + ")"})
		return
	}

	// 2. Begin transaction to ensure consistency
	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction: " + err.Error()})
		return
	}
	defer tx.Rollback()

	// 3. Find or Create Cart
	var cartID string
	err = tx.QueryRow("SELECT id FROM carts WHERE session_id = $1", req.SessionID).Scan(&cartID)
	if err == sql.ErrNoRows {
		err = tx.QueryRow(
			"INSERT INTO carts (session_id) VALUES ($1) RETURNING id",
			req.SessionID,
		).Scan(&cartID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create cart: " + err.Error()})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	// 4. Update quantity or delete if 0
	if req.Quantity <= 0 {
		_, err = tx.Exec("DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2", cartID, req.ProductID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove item: " + err.Error()})
			return
		}
	} else {
		// Upsert quantity
		_, err = tx.Exec(
			`INSERT INTO cart_items (cart_id, product_id, quantity) 
			 VALUES ($1, $2, $3) 
			 ON CONFLICT (cart_id, product_id) 
			 DO UPDATE SET quantity = EXCLUDED.quantity`,
			cartID, req.ProductID, req.Quantity,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update item: " + err.Error()})
			return
		}
	}

	// Update cart timestamp
	_, _ = tx.Exec("UPDATE carts SET updated_at = $1 WHERE id = $2", time.Now(), cartID)

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save cart: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cart updated successfully"})
}

// GetCart retrieves the guest cart and calculates all item subtotals and overall totals
func GetCart(c *gin.Context) {
	sessionID := c.Query("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id query parameter is required"})
		return
	}

	// 1. Fetch Cart ID
	var cartID string
	err := db.DB.QueryRow("SELECT id FROM carts WHERE session_id = $1", sessionID).Scan(&cartID)
	if err == sql.ErrNoRows {
		// Return empty cart structure rather than throwing an error (more frontend friendly)
		c.JSON(http.StatusOK, CartResponse{
			SessionID:       sessionID,
			Items:           []CartItemResponse{},
			TotalItems:      0,
			TotalPricePaise: 0,
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	// 2. Fetch all cart items and calculate totals server-side
	rows, err := db.DB.Query(
		`SELECT ci.product_id, p.name, p.price_paise, ci.quantity, 
		        COALESCE(p.image_url, ''), COALESCE(p.category, ''), p.compatibility
		 FROM cart_items ci
		 JOIN products p ON ci.product_id = p.id
		 WHERE ci.cart_id = $1`,
		cartID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	defer rows.Close()

	items := []CartItemResponse{}
	var grandTotalPaise int64
	var totalItemsCount int

	for rows.Next() {
		var productID, name, imgURL, category string
		var pricePaise int64
		var quantity int
		var compatibility pq.StringArray

		err := rows.Scan(&productID, &name, &pricePaise, &quantity, &imgURL, &category, &compatibility)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse cart items: " + err.Error()})
			return
		}

		subtotal := pricePaise * int64(quantity)
		grandTotalPaise += subtotal
		totalItemsCount += quantity

		items = append(items, CartItemResponse{
			ProductID:     productID,
			Name:          name,
			PricePaise:    pricePaise,
			Quantity:      quantity,
			SubtotalPaise: subtotal,
			ImageURL:      imgURL,
			Category:      category,
			Compatibility: compatibility,
		})
	}

	c.JSON(http.StatusOK, CartResponse{
		CartID:          cartID,
		SessionID:       sessionID,
		Items:           items,
		TotalItems:      totalItemsCount,
		TotalPricePaise: grandTotalPaise,
	})
}
