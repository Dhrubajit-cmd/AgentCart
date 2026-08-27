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
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        {/* Drawer Panel */}
        <div className="w-screen max-w-md bg-white flex flex-col shadow-xl relative border-l border-slate-200">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="text-blue-600">🛒</span> My Shopping Cart
              </h2>
              {cart?.session_id && (
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                  ID: {cart.session_id.substring(0, 12)}...
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cart List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {isEmpty ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">🛒</span>
                </div>
                <p className="text-slate-800 font-bold mb-1">Your Cart is Empty</p>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Browse products and add items to your cart, or interact with our AI Buyer to find the perfect gear.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.product_id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 hover:shadow-sm transition duration-200"
                >
                  {/* Item Image */}
                  <div className="w-16 h-16 rounded bg-slate-50 border border-slate-100 shrink-0 flex items-center justify-center p-1">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-grow min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 truncate leading-tight mb-0.5">
                        {item.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                        {item.category}
                      </span>
                    </div>

                    {/* Quantity selectors */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                        disabled={isUpdating}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 font-bold rounded flex items-center justify-center border border-slate-200/60 text-xs transition cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs text-slate-800 font-bold font-mono px-1">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                        disabled={isUpdating}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 font-bold rounded flex items-center justify-center border border-slate-200/60 text-xs transition cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Price & Delete Action */}
                  <div className="flex flex-col justify-between items-end shrink-0">
                    <span className="text-sm font-bold text-slate-950 font-mono">
                      {formatPrice(item.subtotal_paise)}
                    </span>
                    
                    {/* Explicit Trash Remove Button */}
                    <button
                      onClick={() => onUpdateQuantity(item.product_id, 0)}
                      disabled={isUpdating}
                      title="Remove item"
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer flex items-center gap-1 group"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="text-[10px] font-bold group-hover:underline">Remove</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer summary */}
          {!isEmpty && (
            <div className="p-5 border-t border-slate-200 bg-white space-y-4 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Total Items</span>
                <span className="font-bold text-slate-800">{cart?.total_items}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-slate-900">Grand Total</span>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-blue-600 font-mono">
                    {formatPrice(cart?.total_price_paise || 0)}
                  </span>
                  <p className="text-[9px] text-green-600 font-medium">Inclusive of all taxes</p>
                </div>
              </div>
              <button
                onClick={onCheckout}
                disabled={isUpdating}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-lg shadow transition duration-200 flex items-center justify-center gap-2 cursor-pointer border border-orange-600/10 text-sm"
              >
                Proceed to Buy ➜
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
