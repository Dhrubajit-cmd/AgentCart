package buyer

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	"agentcart/internal/config"
	"agentcart/internal/db"

	"github.com/google/generative-ai-go/genai"
	"github.com/lib/pq"
	"google.golang.org/api/option"
)

// ToolAction represents an action performed by the AI during the chat session
type ToolAction struct {
	ToolName string      `json:"tool_name"`
	Args     interface{} `json:"args"`
	Result   interface{} `json:"result"`
}

// ChatMessage represents a single message in the history
type ChatMessage struct {
	Role  string   `json:"role"` // "user" or "model"
	Parts []string `json:"parts"`
}

// ChatRequest represents the payload from the frontend
type ChatRequest struct {
	SessionID string        `json:"session_id" binding:"required"`
	Message   string        `json:"message" binding:"required"`
	History   []ChatMessage `json:"history"`
}

// ChatResponse represents the response back to the frontend
type ChatResponse struct {
	Reply   string       `json:"reply"`
	Actions []ToolAction `json:"actions"`
}

// searchCatalogTool executes the local catalog database query
func searchCatalogTool(query string) (string, error) {
	likeQuery := "%" + query + "%"
	rows, err := db.DB.Query(
		`SELECT id, name, COALESCE(description, ''), price_paise, inventory, COALESCE(category, ''), compatibility 
		 FROM products 
		 WHERE name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1 OR compatibility @> ARRAY[$2]`,
		likeQuery, query,
	)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	type ProductItem struct {
		ID            string         `json:"id"`
		Name          string         `json:"name"`
		Description   string         `json:"description"`
		PricePaise    int64          `json:"price_paise"`
		StockStatus   string         `json:"stock_status"`
		Category      string         `json:"category"`
		Compatibility pq.StringArray `json:"compatibility"`
	}

	products := []ProductItem{}
	for rows.Next() {
		var p ProductItem
		var inventory int
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.PricePaise, &inventory, &p.Category, &p.Compatibility)
		if err != nil {
			return "", err
		}

		p.StockStatus = "in_stock"
		if inventory <= 0 {
			p.StockStatus = "out_of_stock"
		}

		products = append(products, p)
	}

	bytes, err := json.Marshal(products)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// addToCartTool adds a product to the guest cart database
func addToCartTool(sessionID, productID string, quantity float64) (string, error) {
	qty := int(quantity)
	if qty <= 0 {
		return `{"error": "Quantity must be greater than 0"}`, nil
	}

	// 1. Check product stock
	var name string
	var inventory int
	err := db.DB.QueryRow("SELECT name, inventory FROM products WHERE id = $1", productID).Scan(&name, &inventory)
	if err == sql.ErrNoRows {
		return `{"error": "Product not found"}`, nil
	} else if err != nil {
		return "", err
	}

	if qty > inventory {
		return fmt.Sprintf(`{"error": "Only %d units of %s are available in stock"}`, inventory, name), nil
	}

	// 2. Begin transaction
	tx, err := db.DB.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	// 3. Find or Create Cart
	var cartID string
	err = tx.QueryRow("SELECT id FROM carts WHERE session_id = $1", sessionID).Scan(&cartID)
	if err == sql.ErrNoRows {
		err = tx.QueryRow("INSERT INTO carts (session_id) VALUES ($1) RETURNING id", sessionID).Scan(&cartID)
		if err != nil {
			return "", err
		}
	} else if err != nil {
		return "", err
	}

	// 4. Upsert cart item (increment quantity if already exists)
	_, err = tx.Exec(
		`INSERT INTO cart_items (cart_id, product_id, quantity) 
		 VALUES ($1, $2, $3) 
		 ON CONFLICT (cart_id, product_id) 
		 DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
		cartID, productID, qty,
	)
	if err != nil {
		return "", err
	}

	if err := tx.Commit(); err != nil {
		return "", err
	}

	return fmt.Sprintf(`{"success": true, "message": "Successfully added %d unit(s) of %s to the cart"}`, qty, name), nil
}

// showCartTool fetches the customer's cart status
func showCartTool(sessionID string) (string, error) {
	var cartID string
	err := db.DB.QueryRow("SELECT id FROM carts WHERE session_id = $1", sessionID).Scan(&cartID)
	if err == sql.ErrNoRows {
		return `{"cart_id": "", "items": [], "total_items": 0, "total_price_paise": 0}`, nil
	} else if err != nil {
		return "", err
	}

	rows, err := db.DB.Query(
		`SELECT ci.product_id, p.name, p.price_paise, ci.quantity 
		 FROM cart_items ci
		 JOIN products p ON ci.product_id = p.id
		 WHERE ci.cart_id = $1`,
		cartID,
	)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	type CartItem struct {
		ProductID  string `json:"product_id"`
		Name       string `json:"name"`
		PricePaise int64  `json:"price_paise"`
		Quantity   int    `json:"quantity"`
	}

	items := []CartItem{}
	var grandTotal int64
	var count int

	for rows.Next() {
		var item CartItem
		err := rows.Scan(&item.ProductID, &item.Name, &item.PricePaise, &item.Quantity)
		if err != nil {
			return "", err
		}
		grandTotal += item.PricePaise * int64(item.Quantity)
		count += item.Quantity
		items = append(items, item)
	}

	response := map[string]interface{}{
		"cart_id":           cartID,
		"items":             items,
		"total_items":       count,
		"total_price_paise": grandTotal,
	}

	bytes, _ := json.Marshal(response)
	return string(bytes), nil
}

// ProcessAgentMessage handles AI reasoning, tool selections, and responses via Gemini
func ProcessAgentMessage(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	client, err := genai.NewClient(ctx, option.WithAPIKey(config.AppConfig.GeminiAPIKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-3.6-flash")

	// Set system prompt parameters
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text(`You are the AI Buyer Assistant for TechNest Accessories, a premium electronics accessories store.
Your goal is to help customers search the catalog, list items, manage their cart, and proceed to checkout.

RULES:
1. You can ONLY recommend products that exist in the catalog. Use the "search_catalog" tool to search for products.
2. For pricing, stock status, or descriptions, rely ONLY on the data returned by the tools.
3. NEVER make up products, prices, or mock ID values. If no items match, politely inform the user.
4. All cart operations (adding, showing) MUST be done through the allowed tools.
5. You CANNOT complete payments or checkouts directly. If the user wants to buy or checkout, call the "request_checkout" tool, explain that checkout is ready, and instruct them to click the "Proceed to Buy" button on their screen.
6. Keep your answers concise, helpful, and shopping-focused. Do not engage in non-shopping conversations.`),
		},
	}

	// Declare tools
	model.Tools = []*genai.Tool{
		{
			FunctionDeclarations: []*genai.FunctionDeclaration{
				{
					Name:        "search_catalog",
					Description: "Search for electronics accessories in the TechNest product catalog by keyword, name, or category.",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
						Properties: map[string]*genai.Schema{
							"query": {
								Type:        genai.TypeString,
								Description: "The search keyword (e.g. 'headphones', 'cable', 'charger', 'audio').",
							},
						},
						Required: []string{"query"},
					},
				},
				{
					Name:        "add_to_cart",
					Description: "Add a product from the catalog to the guest shopping cart.",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
						Properties: map[string]*genai.Schema{
							"product_id": {
								Type:        genai.TypeString,
								Description: "The exact UUID of the product to add.",
							},
							"quantity": {
								Type:        genai.TypeInteger,
								Description: "The quantity of the product to add (minimum 1).",
							},
						},
						Required: []string{"product_id", "quantity"},
					},
				},
				{
					Name:        "show_cart",
					Description: "View the customer's current shopping cart items, total quantities, and checkout subtotals.",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
					},
				},
				{
					Name:        "request_checkout",
					Description: "Trigger the checkout flow and prepare the order for payment authorization.",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
					},
				},
			},
		},
	}

	// 1. Build chat session structure from request history
	cs := model.StartChat()
	for _, msg := range req.History {
		role := "user"
		if msg.Role == "model" {
			role = "model"
		}
		parts := make([]genai.Part, len(msg.Parts))
		for i, p := range msg.Parts {
			parts[i] = genai.Text(p)
		}
		cs.History = append(cs.History, &genai.Content{
			Role:  role,
			Parts: parts,
		})
	}

	// 2. Send the message to Gemini
	resp, err := cs.SendMessage(ctx, genai.Text(req.Message))
	if err != nil {
		return nil, fmt.Errorf("gemini API error: %w", err)
	}

	actions := []ToolAction{}

	// 3. Process Function Call loops (if the model chooses to call tools)
	for {
		part := resp.Candidates[0].Content.Parts[0]
		fun, ok := part.(genai.FunctionCall)
		if !ok {
			// No function call, regular text reply generated
			break
		}

		var result string
		var toolErr error
		var args interface{}

		switch fun.Name {
		case "search_catalog":
			query := fun.Args["query"].(string)
			args = map[string]string{"query": query}
			result, toolErr = searchCatalogTool(query)

		case "add_to_cart":
			prodID := fun.Args["product_id"].(string)
			qty := fun.Args["quantity"].(float64)
			args = map[string]interface{}{"product_id": prodID, "quantity": qty}
			result, toolErr = addToCartTool(req.SessionID, prodID, qty)

		case "show_cart":
			args = map[string]string{}
			result, toolErr = showCartTool(req.SessionID)

		case "request_checkout":
			args = map[string]string{}
			result = `{"success": true, "message": "Checkout is initialized. Please click the 'Proceed to Buy' button in your cart drawer to complete the order."}`

		default:
			toolErr = fmt.Errorf("unknown tool name: %s", fun.Name)
		}

		if toolErr != nil {
			log.Printf("Error executing tool %s: %v", fun.Name, toolErr)
			result = fmt.Sprintf(`{"error": "%s"}`, toolErr.Error())
		}

		actions = append(actions, ToolAction{
			ToolName: fun.Name,
			Args:     args,
			Result:   result,
		})

		// Send function response back to Gemini to continue conversational generation
		resp, err = cs.SendMessage(ctx, genai.FunctionResponse{
			Name:     fun.Name,
			Response: map[string]interface{}{"result": result},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to send tool result back to Gemini: %w", err)
		}
	}

	// 4. Return final text reply
	var reply string
	if len(resp.Candidates) > 0 && resp.Candidates[0].Content != nil {
		for _, part := range resp.Candidates[0].Content.Parts {
			if txt, ok := part.(genai.Text); ok {
				reply += string(txt)
			}
		}
	}

	return &ChatResponse{
		Reply:   reply,
		Actions: actions,
	}, nil
}
