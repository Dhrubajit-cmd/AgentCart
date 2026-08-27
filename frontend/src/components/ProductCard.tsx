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
    <div className="relative group bg-white border border-slate-200/80 hover:border-blue-500 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-lg overflow-hidden">
      <div className="relative z-10 flex flex-col h-full">
        {/* Image Container */}
        <div className="w-full h-48 rounded-lg overflow-hidden mb-4 bg-slate-50 border border-slate-100 relative flex items-center justify-center">
          <img
            src={product.image_url}
            alt={product.name}
            className="max-h-full max-w-full object-contain transform group-hover:scale-102 transition-transform duration-300"
          />
          <span className="absolute top-2.5 left-2.5 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-slate-200">
            {product.category}
          </span>
          {!inStock && (
            <span className="absolute inset-0 bg-white/90 flex items-center justify-center text-rose-600 font-extrabold tracking-wider text-sm">
              OUT OF STOCK
            </span>
          )}
        </div>

        {/* Title & Desc */}
        <h3 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>
        
        <p className="text-xs text-slate-500 line-clamp-3 mb-4 leading-relaxed flex-grow">
          {product.description}
        </p>

        {/* Compatibility badging */}
        {product.compatibility && product.compatibility.length > 0 && (
          <div className="mb-4 pt-3 border-t border-slate-100">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
              Compatible with:
            </span>
            <div className="flex flex-wrap gap-1">
              {product.compatibility.map((item, idx) => (
                <span
                  key={idx}
                  className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium border border-blue-100/50"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
        <div className="flex flex-col">
          <span className="text-base font-extrabold text-slate-900">
            {formatPrice(product.price_paise)}
          </span>
          <span className="text-[10px] text-green-600 font-medium">Free Delivery</span>
        </div>
        
        <button
          onClick={() => onAddToCart(product.id)}
          disabled={!inStock || isAdding}
          className={`px-4 py-2 rounded font-bold text-xs transition-all duration-200 flex items-center gap-1.5 shadow-sm ${
            inStock
              ? isAdding
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-yellow-400 hover:bg-yellow-500 text-slate-900 hover:shadow active:scale-98 cursor-pointer border border-yellow-500/20'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
        >
          {isAdding ? (
            <svg
              className="animate-spin h-3.5 w-3.5 text-slate-400"
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
          {isAdding ? 'Adding...' : inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
