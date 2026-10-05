import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import {
  ShoppingCart,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Store,
  Plus,
  Minus
} from 'lucide-react';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState(
    user?.buyer_profile?.delivery_address || 'APMC Yard, Yeshwanthpur, Bengaluru - 560022'
  );
  const [phone, setPhone] = useState(user?.phone || '+91 9845012345');

  const handleProceed = () => {
    // Save delivery info in sessionStorage for checkout
    sessionStorage.setItem('esykrushi_checkout_delivery', JSON.stringify({ address, phone }));
    navigate('/checkout');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <ShoppingCart className="w-7 h-7 text-forest-600" />
          <span>Shopping Cart</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your selected farm produce before placing your direct verified purchase order.
        </p>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-xs">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">Your cart is empty</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">Explore the direct farmer marketplace to procure fresh crops.</p>
          <Link
            to="/marketplace"
            className="inline-flex items-center px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Store className="w-4 h-4 mr-2" />
            <span>Browse Produce Catalog</span>
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Items List */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
            {cart.map(({ product, quantity }) => (
              <div key={product.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
                    alt={product.name}
                    className="w-16 h-16 rounded-2xl object-cover bg-slate-100 shrink-0"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{product.name}</h4>
                    <span className="text-xs text-slate-500 block">
                      Sold by: {product.seller_name} ({product.farm_location})
                    </span>
                    <span className="text-xs font-bold text-forest-700 mt-1 block">
                      ₹{product.price_per_unit} / {product.unit}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Quantity adjustment */}
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-bold text-slate-800">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right min-w-[70px]">
                    <span className="font-extrabold text-sm text-slate-900 block">
                      ₹{(quantity * product.price_per_unit).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout Summary Card */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900">Order Summary</h3>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Total Items</span>
                <span className="font-bold text-slate-800">{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span>Produce Subtotal</span>
                <span className="font-bold text-slate-800">₹{totalPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-forest-700">
                <span>Middleman Commission</span>
                <span className="font-bold">₹0 (Direct Trade)</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-extrabold text-slate-900">
                <span>Grand Total</span>
                <span className="text-forest-700">₹{totalPrice.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Delivery Destination
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
            </div>

            <button
              onClick={handleProceed}
              disabled={!address.trim() || !phone.trim()}
              className="w-full py-3.5 px-4 bg-forest-600 hover:bg-forest-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Proceed to Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
