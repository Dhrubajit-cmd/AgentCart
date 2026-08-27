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
      setIsCartOpen(true); // Open drawer on addition for rich user feedback
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-900">
      
      {/* Top Banner Alert */}
      <div className="bg-sky-950/70 border-b border-sky-500/25 px-4 py-2 text-center text-xs font-semibold text-sky-300 backdrop-blur-md flex items-center justify-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
        </span>
        Test Environment Active - Payments simulate standard sandbox testing only.
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/10">
              <span className="text-xl font-bold text-slate-950">A</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white">
                AgentCart
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                TechNest Accessories Store
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Catalog Raw manifest (agent compatibility) */}
            <a
              href={`${API_URL}/api/m/${STORE_SLUG}/.well-known/agent-commerce.json`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-sky-400 bg-slate-900/60 border border-slate-800 px-3 py-2 rounded-xl transition duration-300 font-mono"
            >
              /.well-known/agent-commerce.json
            </a>

            {/* Cart Trigger Badge */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-slate-900 border border-slate-850 hover:border-sky-500/30 p-2.5 rounded-xl transition duration-300 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">🛒</span>
              {cart && cart.total_items > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 bg-sky-500 text-slate-950 text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md">
                  {cart.total_items}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex gap-8">
        
        {/* Products Section */}
        <section className="flex-1">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
              Discover Accessories
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Explore TechNest's handpicked, compatible premium add-ons. You can select products manually or use our AI conversational assistant to build your traveler cart.
            </p>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="bg-slate-900/40 border border-slate-850 rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-12 text-center text-slate-400">
              <span className="text-4xl block mb-4">📭</span>
              <p className="font-semibold">No products found in the catalog</p>
              <p className="text-xs text-slate-500 mt-1">Please seed the catalog via backend helper.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* AI Buyer Chat Panel Sidebar Placeholder (Built in Phase 3) */}
        <aside className="w-80 shrink-0 hidden xl:flex flex-col bg-slate-900/40 border border-slate-850 rounded-2xl p-6 h-[calc(100vh-12rem)] sticky top-28 items-center justify-center text-center">
          <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xl rounded-full flex items-center justify-center mb-4">
            🤖
          </div>
          <h3 className="text-white font-bold mb-1">AI Buyer Assistant</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">
            In Phase 3, you will be able to search the store, add items, and review compatible cross-sells directly in natural language chat.
          </p>
          <div className="w-full mt-6 border-t border-slate-800/80 pt-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-600 block mb-2">Allowed Tools</span>
            <div className="flex flex-wrap gap-1 justify-center">
              {['search_catalog', 'add_to_cart', 'show_cart', 'request_checkout'].map((tool) => (
                <code key={tool} className="text-[9px] bg-slate-950 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                  {tool}()
                </code>
              ))}
            </div>
          </div>
        </aside>

      </main>

      {/* Cart Drawer Modal */}
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
