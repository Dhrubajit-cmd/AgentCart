import React from 'react';

export interface Product {
  id: string;
  name: string;
  description: string;
  price_paise: number;
  stock_status: string;
  image_url: string;
  category: string;
  compatibility: string[];
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  isAdding: boolean;
}

export const formatPrice = (paise: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100);
};

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, isAdding }) => {
  const inStock = product.stock_status === 'in_stock';

  return (
    <div className="relative group bg-slate-800/60 backdrop-blur-md border border-slate-700/60 hover:border-sky-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_30px_rgba(14,165,233,0.15)] overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute -inset-px bg-gradient-to-r from-sky-500/10 to-indigo-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500" />

      <div className="relative z-10">
        {/* Image Container */}
        <div className="w-full h-48 rounded-xl overflow-hidden mb-4 bg-slate-900 border border-slate-700/40 relative">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          />
          <span className="absolute top-3 left-3 bg-sky-500/90 backdrop-blur-sm text-slate-900 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {product.category}
          </span>
          {!inStock && (
            <span className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center text-rose-400 font-bold tracking-wide">
              OUT OF STOCK
            </span>
          )}
        </div>

        {/* Title & Desc */}
        <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-sky-400 transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-slate-400 line-clamp-3 mb-4 leading-relaxed">
          {product.description}
        </p>

        {/* Compatibility badging */}
        {product.compatibility && product.compatibility.length > 0 && (
          <div className="mb-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
              Best Paired With:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.compatibility.map((item, idx) => (
                <span
                  key={idx}
                  className="text-[10px] bg-slate-900 text-sky-300/80 border border-sky-500/10 px-2 py-0.5 rounded-md"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-between mt-auto pt-4 border-t border-slate-700/30">
        <span className="text-lg font-extrabold text-sky-400">
          {formatPrice(product.price_paise)}
        </span>
        <button
          onClick={() => onAddToCart(product.id)}
          disabled={!inStock || isAdding}
          className={`px-4 py-2.5 rounded-xl font-semibold text-xs tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
            inStock
              ? isAdding
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 text-slate-950 hover:shadow-[0_0_15px_rgba(14,165,233,0.4)] cursor-pointer font-bold'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isAdding ? (
            <svg
              className="animate-spin h-3 w-3 text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : null}
          {isAdding ? 'ADDING...' : inStock ? 'ADD TO CART' : 'UNAVAILABLE'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
