import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { marketplaceService } from '../services/marketplaceService';
import { orderService } from '../services/orderService';
import { callService } from '../services/callService';
import VideoCallModal from './VideoCallModal';
import {
  Store,
  Search,
  Filter,
  CheckCircle2,
  ShoppingCart,
  MapPin,
  Calendar,
  Video,
  ShieldCheck,
  AlertTriangle,
  Clock,
  TrendingDown,
  Navigation,
  Eye,
  ShoppingBag,
  Sparkles,
  Loader2,
  DollarSign,
  AlertCircle
} from 'lucide-react';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [district, setDistrict] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  // Modals & Details
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeCallSession, setActiveCallSession] = useState(null);
  const [requestingCall, setRequestingCall] = useState(false);
  const [cartNotice, setCartNotice] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, recRes, ordRes] = await Promise.allSettled([
        marketplaceService.getProducts({
          category: category !== 'All' ? category : undefined,
          search: search.trim() || undefined,
          district: district.trim() || undefined,
          max_price: maxBudget ? parseFloat(maxBudget) : undefined,
          sort_by: sortBy,
        }),
        marketplaceService.getBuyerRecommendations({
          budget: maxBudget ? parseFloat(maxBudget) : undefined,
        }),
        orderService.getOrders(),
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value.success) {
        setProducts(prodRes.value.data.products || []);
      }
      if (recRes.status === 'fulfilled' && recRes.value.success) {
        setRecommendations(recRes.value.data.recommendations || []);
      }
      if (ordRes.status === 'fulfilled' && ordRes.value.success) {
        setOrders(ordRes.value.data.orders || []);
      }
    } catch (e) {
      console.error('Buyer Dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [category, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleAddToCart = (product, qty = 1) => {
    addToCart(product, qty);
    setCartNotice(`Added ${qty} ${product.unit} of "${product.name}" to your cart!`);
    setTimeout(() => setCartNotice(null), 3000);
  };

  // Request Live Video Call
  const handleRequestCall = async (product) => {
    setRequestingCall(true);
    try {
      const res = await callService.requestCall(product.id);
      if (res.success) {
        setActiveCallSession(res.data.session);
      }
    } catch (err) {
      alert(err.message || 'Could not request video call');
    } finally {
      setRequestingCall(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notice */}
      {cartNotice && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{cartNotice}</span>
        </div>
      )}

      {/* Buyer Welcome & Discovery Hero */}
      <div className="bg-gradient-to-r from-forest-900 via-forest-800 to-forest-950 rounded-3xl text-white p-6 sm:p-8 shadow-xl">
        <div className="max-w-2xl space-y-3">
          <span className="bg-harvest-400 text-forest-950 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            Verified Direct Agriculture Marketplace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Fresh Produce Direct from Verified Farmers
          </h1>
          <p className="text-xs sm:text-sm text-forest-200">
            Source high-grade crops with authentic GPS field evidence and pre-purchase WebRTC video crop inspection.
          </p>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search crop, tomato, rice, spices, district..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white text-slate-900 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-harvest-400"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-harvest-400 hover:bg-harvest-500 text-forest-950 font-bold text-xs"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Search & Multi-Filter Control Strip */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Vegetables', 'Grains', 'Fruits', 'Pulses', 'Spices'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
                category === cat
                  ? 'bg-forest-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="District (e.g. Mandya)"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            onBlur={loadData}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs w-36"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium"
          >
            <option value="newest">Newest Harvest</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="freshness">Freshest First</option>
          </select>
        </div>
      </div>

      {/* Approved Products Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-forest-600" />
            <span>Available Farm Harvests ({products.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">100% Admin Moderated & Approved</span>
        </div>

        {loading ? (
          <div className="text-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-forest-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading verified produce catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
            <Store className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-sm text-slate-800">No matching produce currently available</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your category filter, district, or budget range to view other listings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Store className="w-12 h-12" />
                      </div>
                    )}

                    {/* Verified Seller Badge */}
                    {p.is_verified_seller && (
                      <span className="absolute top-2.5 left-2.5 bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <ShieldCheck className="w-3 h-3" /> Bhoomi Verified
                      </span>
                    )}

                    {/* GPS Tag */}
                    {p.location_evidence && (
                      <span className="absolute bottom-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-white font-medium text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Navigation className="w-2.5 h-2.5 text-harvest-300" />
                        <span>
                          {p.location_evidence.source === 'exif'
                            ? 'EXIF GPS'
                            : p.location_evidence.source === 'browser_device'
                            ? 'Device GPS'
                            : 'Declared'}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-forest-700 transition">
                        {p.name}
                      </h3>
                    </div>

                    <div className="flex items-baseline gap-1 text-forest-800">
                      <span className="text-xl font-extrabold">₹{p.price_per_unit}</span>
                      <span className="text-xs text-slate-500 font-medium">/{p.unit}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3 h-3 text-forest-600 shrink-0" />
                        <span className="truncate">{p.farm_location}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                        <span>Farmer: <strong>{p.seller_name}</strong></span>
                        <span className="text-slate-400">Stock: {p.available_quantity} {p.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProduct(p)}
                    className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Inspect
                  </button>
                  <button
                    onClick={() => handleAddToCart(p, 1)}
                    className="px-3.5 py-2 rounded-xl bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Smart Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-forest-50 via-slate-50 to-harvest-50 rounded-3xl border border-forest-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-forest-700 uppercase tracking-wider block">
                Tailored for Your Location & Budget
              </span>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                <Sparkles className="w-4 h-4 text-harvest-500" />
                <span>Recommended Harvests & Verified Origins</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.slice(0, 3).map((rec, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <span className="font-bold text-xs text-slate-900 block">{rec.product.name}</span>
                  <span className="text-[11px] text-forest-700 font-extrabold">
                    ₹{rec.product.price_per_unit}/{rec.product.unit}
                  </span>
                  <div className="text-[10px] text-slate-500">
                    Freshness Index: <strong>{rec.freshness_score}%</strong> • {rec.product.farm_location?.split(',')[0]}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(rec.product)}
                  className="px-3 py-1.5 bg-forest-50 hover:bg-forest-100 text-forest-700 font-bold text-xs rounded-xl"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Inspect Produce & GPS Evidence with Video Call Request */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedProduct.name}</h3>
                <span className="text-xs text-slate-500">
                  Seller: <strong>{selectedProduct.seller_name}</strong> • Farm: {selectedProduct.farm_location}
                </span>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 font-bold hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Media View */}
            <div className="relative h-60 rounded-2xl bg-slate-950 overflow-hidden">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <Store className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Layered GPS Evidence Breakdown Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-forest-600" /> GPS Location Evidence Audit
              </span>

              {selectedProduct.location_evidence ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block">Coordinates</span>
                    <strong className="text-slate-800">
                      {selectedProduct.location_evidence.latitude?.toFixed(4)}°, {selectedProduct.location_evidence.longitude?.toFixed(4)}°
                    </strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block">Location Source</span>
                    <strong className="text-slate-800">
                      {selectedProduct.location_evidence.source === 'exif'
                        ? 'EXIF Embedded'
                        : selectedProduct.location_evidence.source === 'browser_device'
                        ? 'Device Geolocation'
                        : 'Declared Address'}
                    </strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block">Distance to Farm</span>
                    <strong className="text-slate-800">
                      {selectedProduct.location_evidence.distance_to_farm_km !== null
                        ? `${selectedProduct.location_evidence.distance_to_farm_km} km`
                        : 'On Declared Farm'}
                    </strong>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">Declared farm origin verified by administrator review.</p>
              )}

              {/* OpenStreetMap link */}
              {selectedProduct.location_evidence?.latitude && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${selectedProduct.location_evidence.latitude}&mlon=${selectedProduct.location_evidence.longitude}#map=14/${selectedProduct.location_evidence.latitude}/${selectedProduct.location_evidence.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-[11px] font-bold text-forest-700 hover:underline pt-1"
                >
                  View Coordinates on OpenStreetMap ↗
                </a>
              )}
            </div>

            {/* Produce Specs & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div>
                <div className="text-xl font-extrabold text-forest-800">
                  ₹{selectedProduct.price_per_unit} <span className="text-xs text-slate-500 font-normal">per {selectedProduct.unit}</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Available: {selectedProduct.available_quantity} {selectedProduct.unit} • Quality: {selectedProduct.crop_quality}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRequestCall(selectedProduct)}
                  disabled={requestingCall}
                  className="px-4 py-2.5 rounded-xl bg-forest-50 hover:bg-forest-100 border border-forest-200 text-forest-800 font-bold text-xs flex items-center gap-2 transition"
                >
                  {requestingCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  <span>Inspect Live (Video Call)</span>
                </button>
                <button
                  onClick={() => {
                    handleAddToCart(selectedProduct, 1);
                    setSelectedProduct(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <ShoppingCart className="w-4 h-4" /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WebRTC Video Call Inspection Modal */}
      {activeCallSession && (
        <VideoCallModal
          session={activeCallSession}
          currentUser={user}
          onClose={() => setActiveCallSession(null)}
        />
      )}
    </div>
  );
}
