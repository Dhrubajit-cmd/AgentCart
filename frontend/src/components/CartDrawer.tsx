import React from 'react';
import { formatPrice } from './ProductCard';

export interface CartItem {
  product_id: string;
  name: string;
  price_paise: number;
  quantity: number;
  subtotal_paise: number;
  image_url: string;
  category: string;
  compatibility: string[];
}

export interface CartData {
  cart_id: string;
  session_id: string;
  items: CartItem[];
  total_items: number;
  total_price_paise: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartData | null;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  isUpdating: boolean;
  onCheckout: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  isUpdating,
  onCheckout,
}) => {
  if (!isOpen) return null;

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        {/* Drawer Panel */}
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-850 flex flex-col shadow-2xl relative">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🛒</span> Shopping Cart
              </h2>
              {cart?.session_id && (
                <span className="text-[10px] text-slate-500 font-mono block mt-1">
                  Session: {cart.session_id.substring(0, 8)}...
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>

          {/* Cart List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isEmpty ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <span className="text-5xl mb-4">🛍️</span>
                <p className="text-slate-400 font-semibold mb-1">Your cart is empty</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Discover products in the TechNest catalog or ask the AI assistant to recommend items.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.product_id}
                  className="bg-slate-850 border border-slate-800/80 rounded-xl p-4 flex gap-4 hover:border-slate-700/50 transition relative overflow-hidden"
                >
                  {/* Item Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 border border-slate-850 shrink-0">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate mb-1">
                      {item.name}
                    </h4>
                    <span className="text-xs text-sky-400 font-semibold">
                      {formatPrice(item.price_paise)}
                    </span>

                    {/* Quantity selectors */}
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                        disabled={isUpdating}
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-300 font-bold rounded-md flex items-center justify-center border border-slate-700/40 text-xs transition"
                      >
                        -
                      </button>
                      <span className="text-sm text-white font-semibold font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                        disabled={isUpdating}
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-300 font-bold rounded-md flex items-center justify-center border border-slate-700/40 text-xs transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Actions & Subtotal */}
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <button
                      onClick={() => onUpdateQuantity(item.product_id, 0)}
                      disabled={isUpdating}
                      className="text-xs text-rose-400/80 hover:text-rose-400 hover:underline transition"
                    >
                      Remove
                    </button>
                    <span className="text-sm font-bold text-slate-300 font-mono">
                      {formatPrice(item.subtotal_paise)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer summary */}
          {!isEmpty && (
            <div className="p-6 border-t border-slate-800 bg-slate-950/40 space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Total Items</span>
                <span className="font-semibold text-white">{cart?.total_items}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-white">Estimated Total</span>
                <span className="text-xl font-extrabold text-sky-400 font-mono">
                  {formatPrice(cart?.total_price_paise || 0)}
                </span>
              </div>
              <button
                onClick={onCheckout}
                disabled={isUpdating}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 transition duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                Proceed to Checkout ➜
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
