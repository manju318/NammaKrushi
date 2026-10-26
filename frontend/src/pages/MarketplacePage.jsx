import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { marketplaceService } from '../services/marketplaceService';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import RequestToFarmerModal from '../components/RequestToFarmerModal';
import {
  Store,
  Search,
  Filter,
  CheckCircle2,
  ShoppingCart,
  Plus,
  MapPin,
  Calendar,
  X,
  AlertCircle,
  Send
} from 'lucide-react';

export default function MarketplacePage() {
  const { addToCart } = useCart();
  const { user, isFarmer } = useAuth();
  const { t } = useLanguage();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [addedNotice, setAddedNotice] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [requestProduct, setRequestProduct] = useState(null);

  // New product form (for farmers)
  const [name, setName] = useState('');
  const [prodCategory, setProdCategory] = useState('Vegetables');
  const [price, setPrice] = useState('45');
  const [unit, setUnit] = useState('kg');
  const [quantity, setQuantity] = useState('100');
  const [description, setDescription] = useState('');
  const [farmLocation, setFarmLocation] = useState(user?.farmer_profile?.district || 'Mandya, Karnataka');

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await marketplaceService.getProducts({
        category: category !== 'All' ? category : undefined,
        search: search.trim() || undefined,
        sort_by: sortBy,
      });
      if (res.success) {
        setProducts(res.data.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [category, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProducts();
  };

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    setAddedNotice(`Added "${product.name}" to cart!`);
    setTimeout(() => setAddedNotice(null), 3000);
  };

  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const payload = {
        name,
        category: prodCategory,
        price_per_unit: parseFloat(price) || 0,
        unit,
        available_quantity: parseFloat(quantity) || 0,
        description,
        farm_location: farmLocation,
      };
      const res = await marketplaceService.createProduct(payload);
      if (res.success) {
        setModalOpen(false);
        setName('');
        setDescription('');
        setAddedNotice(`Successfully published "${payload.name}" to marketplace!`);
        setTimeout(() => setAddedNotice(null), 4000);
        loadProducts();
      }
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to publish listing. Please verify inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Seller Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Store className="w-7 h-7 text-forest-600" />
            <span>{t('marketplaceHeading', 'Direct Farmer-to-Buyer Marketplace')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('marketplaceSub', 'Zero intermediaries. Buy fresh produce straight from verified Indian farmers with server-verified payments.')}
          </p>
        </div>

        {isFarmer && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs rounded-xl shadow-xs transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>List My Harvest</span>
          </button>
        )}
      </div>

      {/* Added Toast */}
      {addedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <span className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {addedNotice}
          </span>
          <Link to="/cart" className="font-bold underline hover:text-emerald-950">
            View Cart & Checkout →
          </Link>
        </div>
      )}

      {/* Search and Category Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchProduce', 'Search grains, pulses, fruits, vegetables...')}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-forest-500"
            >
              <option value="newest">Newest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {['All', 'Grains', 'Pulses', 'Fruits', 'Vegetables', 'Spices', 'Oilseeds'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                category === cat ? 'bg-forest-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Catalog Grid */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-500">Loading produce catalog...</div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No produce listings found</h3>
          <p className="text-xs text-slate-500 mt-1">Try a different category filter or keyword.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Product Image */}
                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img
                    src={p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs text-slate-800">
                    {p.category}
                  </div>

                  {/* Verified Seller Badge */}
                  {p.is_verified_seller && (
                    <div className="absolute top-3 right-3 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified Seller
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 sm:p-5 space-y-2">
                  <h3 className="font-extrabold text-sm text-slate-900 line-clamp-1">{p.name}</h3>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{p.farm_location || 'Karnataka'}</span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {p.description || 'Naturally cultivated, harvested fresh from farm.'}
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Available: <b>{p.available_quantity} {p.unit}</b></span>
                    <span className="text-[11px] text-slate-400">Harvest: {p.harvest_date}</span>
                  </div>
                </div>
              </div>

              {/* Price & Purchase Bar */}
              <div className="p-4 sm:p-5 pt-0">
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-black text-slate-900">₹{p.price_per_unit}</span>
                    <span className="text-[11px] text-slate-400 font-medium">/{p.unit}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRequestProduct(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px] rounded-xl transition shadow-2xs"
                      title="Direct Purchase Request to this Farmer"
                    >
                      <Send className="w-3 h-3 text-amber-600" />
                      <span>{t('request', 'Request')}</span>
                    </button>
                    <button
                      onClick={() => handleAddToCart(p)}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{t('addToCart', 'Add')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List Product Modal (Farmers) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">List Produce for Sale</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700">Produce Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Organic Sona Masoori Rice, Tender Corn"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Category</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Grains">Grains</option>
                    <option value="Pulses">Pulses</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Spices">Spices</option>
                    <option value="Oilseeds">Oilseeds</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="kg">kg</option>
                    <option value="quintal">quintal</option>
                    <option value="crate">crate</option>
                    <option value="ton">ton</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Price per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Available Quantity</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Farm Location</label>
                <input
                  type="text"
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Variety, organic cultivation method, freshness guarantee..."
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-forest-600 hover:bg-forest-700 rounded-xl"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product-Specific Buyer Request to Farmer Modal */}
      {requestProduct && (
        <RequestToFarmerModal
          product={requestProduct}
          onClose={() => setRequestProduct(null)}
          onSuccess={(req) => {
            setAddedNotice(`Purchase request ${req.request_number} sent to farmer ${requestProduct.seller_name}!`);
            setTimeout(() => setAddedNotice(null), 4000);
          }}
        />
      )}
    </div>
  );
}
