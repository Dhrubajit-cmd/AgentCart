package merchant

import (
	"net/http"

	"agentcart/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

// SeedProduct defines the product structure for initial catalog seeding
type SeedProduct struct {
	Name          string
	Description   string
	PricePaise    int64
	Inventory     int
	ImageURL      string
	Category      string
	Compatibility []string
}

// SeedTechNestCatalog seeds 8-12 default accessories for TechNest merchant
func SeedTechNestCatalog(c *gin.Context) {
	merchantID := c.GetString("merchant_id")

	// Check if the merchant already has products
	var count int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM products WHERE merchant_id = $1", merchantID).Scan(&count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking catalog: " + err.Error()})
		return
	}

	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Catalog already contains products. Seeding skipped."})
		return
	}

	// 8 TechNest accessories
	seedProducts := []SeedProduct{
		{
			Name:          "Wireless Headphones",
			Description:   "Noise-cancelling over-ear wireless headphones with 30-hour battery life. Perfect for travel.",
			PricePaise:    249900, // ₹2,499.00
			Inventory:     15,
			ImageURL:      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60",
			Category:      "Audio",
			Compatibility: []string{"Headphone Case"},
		},
		{
			Name:          "Headphone Case",
			Description:   "Hard-shell protective case designed specifically for Wireless Headphones.",
			PricePaise:    49900, // ₹499.00
			Inventory:     25,
			ImageURL:      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&auto=format&fit=crop&q=60",
			Category:      "Accessories",
			Compatibility: []string{"Wireless Headphones"},
		},
		{
			Name:          "USB-C Cable",
			Description:   "Braided nylon 2-meter USB-C to USB-C charging cable. Supports 100W Power Delivery.",
			PricePaise:    29900, // ₹299.00
			Inventory:     50,
			ImageURL:      "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=500&auto=format&fit=crop&q=60",
			Category:      "Cables",
			Compatibility: []string{"Charger", "Power Bank"},
		},
		{
			Name:          "Charger",
			Description:   "Compact 65W GaN dual-port fast wall charger. Power your laptop and phone together.",
			PricePaise:    99900, // ₹999.00
			Inventory:     30,
			ImageURL:      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=60",
			Category:      "Power",
			Compatibility: []string{"USB-C Cable"},
		},
		{
			Name:          "Power Bank",
			Description:   "20,000mAh external battery pack with fast-charge ports. Travel-safe.",
			PricePaise:    149900, // ₹1,499.00
			Inventory:     20,
			ImageURL:      "https://images.unsplash.com/photo-1609592424109-dd9892f1b17c?w=500&auto=format&fit=crop&q=60",
			Category:      "Power",
			Compatibility: []string{"USB-C Cable"},
		},
		{
			Name:          "Laptop Sleeve",
			Description:   "Water-resistant protective sleeve with soft fleece lining for 14-inch laptops.",
			PricePaise:    79900, // ₹799.00
			Inventory:     10,
			ImageURL:      "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60",
			Category:      "Cases",
			Compatibility: []string{},
		},
		{
			Name:          "Bluetooth Speaker",
			Description:   "Portable IP67 waterproof speaker with rich bass and 12 hours of playtime.",
			PricePaise:    199900, // ₹1,999.00
			Inventory:     8,
			ImageURL:      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto=format&fit=crop&q=60",
			Category:      "Audio",
			Compatibility: []string{},
		},
		{
			Name:          "Wireless Mouse",
			Description:   "Ergonomic silent Bluetooth mouse with adjustable DPI and rechargeable battery.",
			PricePaise:    129900, // ₹1,299.00
			Inventory:     18,
			ImageURL:      "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=60",
			Category:      "Accessories",
			Compatibility: []string{},
		},
	}

	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to begin transaction: " + err.Error()})
		return
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("INSERT INTO products (merchant_id, name, description, price_paise, inventory, image_url, category, compatibility) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare insert: " + err.Error()})
		return
	}
	defer stmt.Close()

	for _, p := range seedProducts {
		_, err := stmt.Exec(merchantID, p.Name, p.Description, p.PricePaise, p.Inventory, p.ImageURL, p.Category, pq.StringArray(p.Compatibility))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert seed product: " + err.Error()})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit seed transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Successfully seeded 8 TechNest products."})
}
