package models

import (
	"time"

	"github.com/lib/pq"
)

// User represents a merchant system user
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

// Merchant represents a shop instance
type Merchant struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

// Product represents a catalog item
type Product struct {
	ID            string         `json:"id"`
	MerchantID    string         `json:"merchant_id"`
	Name          string         `json:"name"`
	Description   string         `json:"description"`
	PricePaise    int64          `json:"price_paise"`
	Inventory     int            `json:"inventory"`
	ImageURL      string         `json:"image_url"`
	Category      string         `json:"category"`
	Compatibility pq.StringArray `json:"compatibility"`
	CreatedAt     time.Time      `json:"created_at"`
}

// CrossSellRule represents merchant growth triggers
type CrossSellRule struct {
	ID                   string    `json:"id"`
	MerchantID           string    `json:"merchant_id"`
	ProductID            string    `json:"product_id"`
	RecommendedProductID string    `json:"recommended_product_id"`
	Reason               string    `json:"reason"`
	CreatedAt            time.Time `json:"created_at"`
}

// Cart represents a guest shopping cart session
type Cart struct {
	ID        string    `json:"id"`
	SessionID string    `json:"session_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CartItem represents an item linked to a cart
type CartItem struct {
	ID        string    `json:"id"`
	CartID    string    `json:"cart_id"`
	ProductID string    `json:"product_id"`
	Quantity  int       `json:"quantity"`
	CreatedAt time.Time `json:"created_at"`
}

// Order represents a created purchase transaction
type Order struct {
	ID               string    `json:"id"`
	MerchantID       string    `json:"merchant_id"`
	SessionID        string    `json:"session_id"`
	CustomerName     string    `json:"customer_name"`
	CustomerEmail    string    `json:"customer_email"`
	TotalPricePaise  int64     `json:"total_price_paise"`
	Status           string    `json:"status"` // created, paid, failed
	RazorpayOrderID  string    `json:"razorpay_order_id"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// OrderItem represents a snapshot of a product inside an order
type OrderItem struct {
	ID         string `json:"id"`
	OrderID    string `json:"order_id"`
	ProductID  string `json:"product_id"`
	Quantity   int    `json:"quantity"`
	PricePaise int64  `json:"price_paise"`
}

// Payment represents a payment receipt signature verification state
type Payment struct {
	ID                string    `json:"id"`
	OrderID           string    `json:"order_id"`
	RazorpayPaymentID string    `json:"razorpay_payment_id"`
	RazorpaySignature string    `json:"razorpay_signature"`
	AmountPaise       int64     `json:"amount_paise"`
	Status            string    `json:"status"`
	Method            string    `json:"method"`
	CreatedAt         time.Time `json:"created_at"`
}

// WebhookReceipt represents processed webhook IDs to avoid duplication
type WebhookReceipt struct {
	ID               string    `json:"id"`
	RazorpayEventID  string    `json:"razorpay_event_id"`
	Payload          string    `json:"payload"` // raw json payload
	ProcessedAt      time.Time `json:"processed_at"`
}

// AuditEvent represents a trace in the system for payments & agents
type AuditEvent struct {
	ID             string    `json:"id"`
	TraceID        string    `json:"trace_id"`
	Timestamp      time.Time `json:"timestamp"`
	Actor          string    `json:"actor"` // customer, ai_buyer, growth_agent, policy_engine, system
	EventType      string    `json:"event_type"`
	InputSummary   string    `json:"input_summary"`
	DecisionReason string    `json:"decision_reason"`
	PolicyVersion  string    `json:"policy_version"`
	Outcome        string    `json:"outcome"` // allowed, denied, failed, completed
	CartID         *string   `json:"cart_id,omitempty"`
	OrderID        *string   `json:"order_id,omitempty"`
	PaymentID      *string   `json:"payment_id,omitempty"`
}
