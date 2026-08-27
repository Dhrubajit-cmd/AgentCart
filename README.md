# AgentCart 🛒

AgentCart is an AI-native, single-merchant e-commerce platform built as a high-performance Go/Gin and React/TypeScript modular monolith. 

It is designed for the **Razorpay Buildathon Track 01 (AI Growth & Agentic Commerce)**. It features a conversational customer-facing AI Buyer, a growth cross-sell agent, server-side secure cart recalculations, and an append-only audit trail dashboard.

---

## 🛠️ Tech Stack
- **Frontend**: React (v19), Vite, TypeScript, Tailwind CSS (v4)
- **Backend**: Go (v1.22+), Gin Web Framework
- **Database**: Supabase PostgreSQL
- **Payments**: Razorpay Standard Checkout (Test Mode Sandbox)
- **AI Engine**: Google Gemini API (AI Studio Free Tier)

---

## 🚀 Implemented Capabilities (Phases 1, 2 & 3 Completed)

### 1. Merchant Foundation & Seeded Catalog
* Secure password hashing (bcrypt) and JWT session token generation for merchant admin tasks.
* Full product CRUD operations in the database pool.
* Preloaded TechNest seed catalog consisting of 8 electronics accessories.
* Public AI-readable endpoints (`/api/m/:slug/catalog` and `/.well-known/agent-commerce.json`) containing structured, machine-interpretable product details and compatibility trees.

### 2. Customer Storefront & Guest Cart
* Modern, high-trust light-mode storefront UI styled in a Flipkart/Amazon-inspired layout.
* Guest checkout sessions tracked via lightweight local storage session IDs.
* **Server-side Recalculated Cart**: The client sends only the `product_id` and `quantity`. The Go backend queries master prices directly from the database to compute all subtotals and totals, completely eliminating client-side price-tampering exploits.
* Smooth Cart Drawer containing item quantity controls and an explicit "Remove" (trash-bin) action.

### 3. Conversational AI Buyer Assistant
* Integrated Google Gemini SDK in Go using function calling tools.
* Exposes conversational chat panel directly on the customer storefront.
* Limits AI reasoning capabilities to 4 predefined tools: `search_catalog`, `add_to_cart`, `show_cart`, and `request_checkout` with strict backend validations.
* Features transparent, user-friendly live tool execution logs directly in the chat panel.

---

## 📂 Project Structure
```text
AgentCart/
├── backend/
│   ├── cmd/api/main.go                 # Monolith Server Entrypoint
│   ├── db_schema.sql                   # Database Table Migrations Script
│   └── internal/
│       ├── config/                     # Environment Variable Configuration
│       ├── db/                         # PostgreSQL Connection Pool Client
│       ├── models/                     # Shared DB Schema Structs
│       ├── auth/                       # Merchant Register/Login Handlers
│       ├── merchant/                   # Profile & Product Catalog CRUD
│       ├── catalog/                    # Public Storefront Catalog Manifests
│       ├── cart/                       # Recalculated Cart Operations
│       └── middleware/                 # CORS & JWT Auth Middleware
└── frontend/
    └── src/
        ├── components/                 # Storefront & CartDrawer Components
        ├── pages/                      # Storefront Page Views
        └── App.tsx                     # React Router Entrypoint
```

---

## ⚙️ Setup & Local Installation

### 1. Database Migration
1. Go to your **Supabase Project** dashboard.
2. Open the **SQL Editor** tab on the left navigation bar.
3. Paste the contents of `backend/db_schema.sql` into a new query sheet.
4. Click **Run** to provision the 11 database tables, constraints, and indexes.

### 2. Configuration Setup

#### Backend Env Configuration
Create a `.env` file inside the `backend/` directory:
```bash
cp backend/.env.example backend/.env
```
Fill out the variables inside `backend/.env`:
```env
PORT=8080
DATABASE_URL=postgresql://postgres:URL_ENCODED_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
JWT_SECRET=your_jwt_signing_key
GEMINI_API_KEY=your_gemini_api_key
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```
*(Note: If your database password contains special characters like `@` or `!`, ensure they are URL percent-encoded. For example, `@` becomes `%40` and `!` becomes `%21`.)*

#### Frontend Env Configuration
Create a `.env` file inside the `frontend/` directory:
```bash
cp frontend/.env.example frontend/.env
```
Fill out the variables inside `frontend/.env`:
```env
VITE_API_URL=http://localhost:8080
VITE_RAZORPAY_KEY_ID=your_test_key_id
```

### 3. Launch Backend Server
From the root directory:
```bash
cd backend
go run cmd/api/main.go
```
The server will boot up and listen on port `8080`. You should see `Database connection successfully established` in the logs.

### 4. Launch Frontend App
Open a new terminal tab, navigate to the `frontend` folder, and start the development server:
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Requirement |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Sign up a new merchant admin | Public |
| **POST** | `/api/auth/login` | Login to retrieve JWT session token | Public |
| **GET** | `/api/m/:slug/catalog` | Fetch public store catalog | Public |
| **GET** | `/api/cart` | Retrieve guest cart and totals | Public (needs `?session_id=...`) |
| **POST** | `/api/cart/items` | Add, update, or remove cart items | Public |
| **GET** | `/api/merchant/profile` | Retrieve store profile | Bearer Token Required |
| **POST** | `/api/merchant/onboarding` | Edit store name/description | Bearer Token Required |
| **GET** | `/api/merchant/products` | List all merchant items | Bearer Token Required |
| **POST** | `/api/merchant/products` | Create a new catalog item | Bearer Token Required |
| **PUT** | `/api/merchant/products/:id` | Update product details | Bearer Token Required |
| **DELETE**| `/api/merchant/products/:id` | Delete product from catalog | Bearer Token Required |
| **POST** | `/api/merchant/products/seed` | Seed default catalog items | Bearer Token Required |
