import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import type { Product } from '../components/ProductCard';
import CartDrawer from '../components/CartDrawer';
import type { CartData } from '../components/CartDrawer';

// Set backend URL (supports fallback to local or dynamic env)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const STORE_SLUG = 'technest';

const Storefront: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartData | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUpdatingCart, setIsUpdatingCart] = useState(false);
  const [activeAddingId, setActiveAddingId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  // 1. Initialize session ID on mount
  useEffect(() => {
    let storedSessionId = localStorage.getItem('agentcart_session_id');
    if (!storedSessionId) {
      storedSessionId = 'guest_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      localStorage.setItem('agentcart_session_id', storedSessionId);
    }
    setSessionId(storedSessionId);
  }, []);

  // 2. Fetch catalog products
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoadingProducts(true);
        const res = await fetch(`${API_URL}/api/m/${STORE_SLUG}/catalog`);
        if (!res.ok) throw new Error('Failed to load store catalog');
        const data = await res.json();
        setProducts(data.catalog || []);
      } catch (err) {
        console.error('Error fetching catalog:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchCatalog();
  }, []);

  // 3. Fetch guest cart
  const fetchCart = async (session: string) => {
    if (!session) return;
    try {
      const res = await fetch(`${API_URL}/api/cart?session_id=${session}`);
      if (!res.ok) throw new Error('Failed to fetch cart');
      const data = await res.json();
      setCart(data);
    } catch (err) {
      console.error('Error fetching cart:', err);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchCart(sessionId);
    }
  }, [sessionId]);

  // 4. Add product to cart
  const handleAddToCart = async (productId: string) => {
    if (!sessionId) return;
    try {
      setActiveAddingId(productId);
      
      // Calculate new quantity: check if product already in cart
      const existingItem = cart?.items.find((item) => item.product_id === productId);
      const newQty = existingItem ? existingItem.quantity + 1 : 1;

      const res = await fetch(`${API_URL}/api/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          product_id: productId,
          quantity: newQty,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update cart');
      }

      await fetchCart(sessionId);
      setIsCartOpen(true); // Open drawer on addition
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add item to cart');
    } finally {
      setActiveAddingId(null);
    }
  };

  // 5. Update item quantity in cart drawer
  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    if (!sessionId) return;
    try {
      setIsUpdatingCart(true);
      const res = await fetch(`${API_URL}/api/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          product_id: productId,
          quantity,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update item quantity');
      }

      await fetchCart(sessionId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to modify cart');
    } finally {
      setIsUpdatingCart(false);
    }
  };

  // 6. Checkout handler (placeholder for Phase 5 Razorpay standard checkout)
  const handleCheckout = () => {
    alert('Checkout triggered! Payment setup will be completed in Phase 5.');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-blue-200 selection:text-blue-900">
      
      {/* Sandbox Alert Banner */}
      <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-center text-xs font-bold shadow-inner flex items-center justify-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
        </span>
        Sandbox Mode — Powered by Razorpay Standard Checkout in Test Mode.
      </div>

      {/* Primary Header */}
      <header className="sticky top-0 z-40 bg-blue-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-white text-blue-600 rounded-lg flex items-center justify-center font-black text-lg shadow-sm">
              AC
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black tracking-tight leading-none">AgentCart</h1>
                <span className="bg-yellow-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase leading-none">
                  MVP
                </span>
              </div>
              <p className="text-[10px] text-blue-100 font-medium mt-0.5">
                TechNest Accessories Portal
              </p>
            </div>
          </div>

          {/* Search Bar / Public Endpoint Link */}
          <div className="hidden sm:flex flex-1 max-w-md relative">
            <a
              href={`${API_URL}/api/m/${STORE_SLUG}/.well-known/agent-commerce.json`}
              target="_blank"
              rel="noreferrer"
              className="w-full text-center text-xs text-blue-200 hover:text-white bg-blue-700/50 hover:bg-blue-700/80 border border-blue-500/30 px-4 py-2 rounded-lg transition duration-200 font-mono flex items-center justify-center gap-1.5"
            >
              <span>🔗</span> Manifest: /.well-known/agent-commerce.json
            </a>
          </div>

          {/* Cart Icon */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg border border-blue-500/20 transition duration-200 flex items-center gap-2 cursor-pointer font-bold text-sm shadow-sm"
            >
              <span>🛒</span> Cart
              {cart && cart.total_items > 0 ? (
                <span className="bg-yellow-400 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-blue-600">
                  {cart.total_items}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col xl:flex-row gap-6">
        
        {/* Products List */}
        <section className="flex-grow">
          {/* Section title */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Top Accessories & Pairings
            </h2>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              Explore TechNest's electronics accessories. Select pairs manually or chat with our AI agent to purchase items matching your budget.
            </p>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl h-72 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 shadow-sm">
              <span className="text-4xl block mb-3">📦</span>
              <p className="font-semibold text-slate-700">Store catalog is empty</p>
              <p className="text-xs text-slate-500 mt-0.5">Please seed products using the merchant seed helper.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  isAdding={activeAddingId === product.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Floating AI Buyer Chat Placeholder (Flipkart inspired sidebar) */}
        <aside className="w-full xl:w-72 shrink-0 flex flex-col bg-white border border-slate-200 rounded-xl p-5 shadow-sm self-start xl:sticky xl:top-24">
          <div className="w-10 h-10 bg-blue-50 border border-blue-100 text-blue-600 text-lg rounded-xl flex items-center justify-center mb-3">
            🤖
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Conversational AI Buyer</h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            In Phase 3, you will be able to search the store, add items, and review compatible cross-sells directly in natural language chat.
          </p>
          <div className="border-t border-slate-100 pt-3">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-2">Available Actions:</span>
            <div className="flex flex-wrap gap-1">
              {['search_catalog', 'add_to_cart', 'show_cart', 'request_checkout'].map((tool) => (
                <span key={tool} className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/50">
                  {tool}()
                </span>
              ))}
            </div>
          </div>
        </aside>

      </main>

      {/* Cart Drawer Overlay */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        isUpdating={isUpdatingCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

export default Storefront;
