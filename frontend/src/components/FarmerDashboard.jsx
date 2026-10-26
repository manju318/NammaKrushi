import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { marketplaceService } from '../services/marketplaceService';
import { paymentService } from '../services/paymentService';
import { orderService } from '../services/orderService';
import { farmService } from '../services/farmService';
import { callService } from '../services/callService';
import { requestService } from '../services/requestService';
import VideoCallModal from './VideoCallModal';
import {
  Sprout,
  Store,
  Plus,
  ShieldCheck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Video,
  Upload,
  CreditCard,
  QrCode,
  DollarSign,
  TrendingUp,
  Boxes,
  PieChart,
  ShoppingBag,
  Eye,
  Camera,
  Navigation,
  Loader2,
  Calendar,
  Building,
  Phone,
  Send,
  MessageSquare,
  Check,
  X,
  FileCheck,
  RefreshCw
} from 'lucide-react';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [destination, setDestination] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [activeCallSession, setActiveCallSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);

  // New Produce Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Vegetables');
  const [formPrice, setFormPrice] = useState('');
  const [formUnit, setFormUnit] = useState('kg');
  const [formQty, setFormQty] = useState('');
  const [formQuality, setFormQuality] = useState('Grade A - Premium');
  const [formDelivery, setFormDelivery] = useState('Farm Pickup, Mandi Transport');
  const [formHarvestDate, setFormHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [uploadedMedia, setUploadedMedia] = useState(null);
  const [browserCoords, setBrowserCoords] = useState(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [formMsg, setFormMsg] = useState(null);

  // Payment Destination Form State
  const [destType, setDestType] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [holderName, setHolderName] = useState(user?.full_name || '');
  const [savingDest, setSavingDest] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, ordRes, destRes, sugRes, callRes] = await Promise.allSettled([
        marketplaceService.getProducts({ my_products: true }),
        orderService.getOrders(),
        paymentService.getDestination(),
        marketplaceService.getFarmerSuggestions(),
        callService.getIncomingCalls(),
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value.success) {
        setProducts(prodRes.value.data.products || []);
      }
      if (ordRes.status === 'fulfilled' && ordRes.value.success) {
        setOrders(ordRes.value.data.orders || []);
      }
      if (destRes.status === 'fulfilled' && destRes.value.success) {
        setDestination(destRes.value.data.destination);
        if (destRes.value.data.destination) {
          setDestType(destRes.value.data.destination.destination_type || 'upi');
          setUpiId(destRes.value.data.destination.upi_id || '');
          setBankName(destRes.value.data.destination.bank_name || 'State Bank of India');
        }
      }
      if (sugRes.status === 'fulfilled' && sugRes.value.success) {
        setSuggestions(sugRes.value.data);
      }
      if (callRes.status === 'fulfilled' && callRes.value.success) {
        setIncomingCalls(callRes.value.data.calls || []);
      }
    } catch (e) {
      console.error('Farmer Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll for incoming live calls every 5 seconds
    const interval = setInterval(async () => {
      try {
        const cRes = await callService.getIncomingCalls();
        if (cRes.success) setIncomingCalls(cRes.data.calls || []);
      } catch (e) {
        // quiet error
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle Media File Selection & EXIF extraction
  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setUploadingMedia(true);
    setFormMsg(null);
    try {
      const res = await marketplaceService.uploadMedia(file);
      if (res.success) {
        setUploadedMedia(res.data);
      }
    } catch (err) {
      setFormMsg(err.message || 'Media upload failed');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Browser Geolocation capture fallback
  const handleCaptureDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBrowserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capture_timestamp: new Date().toISOString(),
        });
        setCapturingGps(false);
      },
      (err) => {
        setCapturingGps(false);
        alert(`Location access denied or unavailable: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Submit Product Listing
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSubmittingProduct(true);
    setFormMsg(null);

    try {
      const payload = {
        name: formName,
        category: formCategory,
        price_per_unit: parseFloat(formPrice),
        unit: formUnit,
        available_quantity: parseFloat(formQty),
        crop_quality: formQuality,
        delivery_options: formDelivery,
        harvest_date: formHarvestDate,
        description: formDescription,
        image_url: uploadedMedia?.media_url || null,
        media_hash: uploadedMedia?.media_hash || null,
        browser_location: browserCoords,
      };

      const res = await marketplaceService.createProduct(payload);
      if (res.success) {
        setShowAddModal(false);
        // Reset form
        setFormName('');
        setFormPrice('');
        setFormQty('');
        setFormDescription('');
        setUploadedMedia(null);
        setBrowserCoords(null);
        loadData();
      }
    } catch (err) {
      setFormMsg(err.message || 'Failed to submit product');
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Save Payment Destination
  const handleSaveDestination = async (e) => {
    e.preventDefault();
    setSavingDest(true);
    try {
      const res = await paymentService.registerDestination({
        destination_type: destType,
        upi_id: upiId,
        account_number: accountNumber,
        ifsc_code: ifscCode,
        account_holder_name: holderName,
        bank_name: bankName,
      });
      if (res.success) {
        setShowDestModal(false);
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Failed to register destination');
    } finally {
      setSavingDest(false);
    }
  };

  // Accept incoming video call
  const handleAcceptCall = async (session) => {
    try {
      await callService.respondToCall(session.session_id, 'accept');
      setActiveCallSession(session);
      setIncomingCalls((prev) => prev.filter((c) => c.session_id !== session.session_id));
    } catch (e) {
      console.error(e);
    }
  };

  // Decline incoming video call
  const handleDeclineCall = async (session) => {
    try {
      await callService.respondToCall(session.session_id, 'decline');
      setIncomingCalls((prev) => prev.filter((c) => c.session_id !== session.session_id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Incoming Video Call Banner Alert */}
      {incomingCalls.length > 0 && (
        <div className="bg-gradient-to-r from-forest-800 to-forest-900 border-2 border-harvest-400 text-white p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-harvest-400 text-forest-950 flex items-center justify-center font-bold">
              <Video className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base">Incoming Live Crop Inspection Call!</span>
                <span className="bg-harvest-400 text-forest-950 font-bold text-[10px] px-2 py-0.5 rounded-full">WebRTC</span>
              </div>
              <p className="text-xs text-forest-200">
                Buyer <strong>{incomingCalls[0].buyer_name}</strong> wants to inspect your <strong>{incomingCalls[0].product_name}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleAcceptCall(incomingCalls[0])}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
            >
              <Video className="w-4 h-4" /> Accept Call
            </button>
            <button
              onClick={() => handleDeclineCall(incomingCalls[0])}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Farmer Welcome & Identity Verification Card */}
      <div className="bg-gradient-to-r from-forest-800 via-forest-700 to-forest-900 rounded-3xl text-white p-6 sm:p-8 shadow-xl shadow-forest-900/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="bg-harvest-400 text-forest-950 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Farmer Command Center
              </span>
              {user?.is_verified_seller ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold px-3 py-0.5 rounded-full">
                  <ShieldCheck className="w-4 h-4" /> Bhoomi RTC Verified Seller
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold px-3 py-0.5 rounded-full">
                  <AlertTriangle className="w-4 h-4" /> Verification: {user?.verification_status || 'Pending'}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Namaskara, {user?.full_name}!
            </h1>
            <p className="text-xs sm:text-sm text-forest-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-harvest-300" />
              <span>
                {user?.farmer_profile?.taluk || 'Pandavapura'}, {user?.farmer_profile?.district || 'Mandya'}, {user?.farmer_profile?.state || 'Karnataka'} • {user?.farmer_profile?.total_acreage || 5.5} Acres ({user?.farmer_profile?.soil_type || 'Red Loam'})
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 rounded-2xl bg-harvest-400 hover:bg-harvest-500 text-forest-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-harvest-400/20 transition active:scale-95"
            >
              <Plus className="w-5 h-5" /> List Produce with GPS
            </button>
            <button
              onClick={() => setShowDestModal(true)}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition"
            >
              <CreditCard className="w-4 h-4 text-harvest-300" />
              <span>{destination?.is_verified ? 'Payment Destination ✓' : 'Setup UPI / Bank'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Destination Status Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-forest-50 text-forest-700 border border-forest-100 flex items-center justify-center font-bold">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Direct Farmer Payout Destination</span>
              {destination?.is_verified ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                  Verified Destination
                </span>
              ) : destination ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full">
                  Under Review ({destination.verification_status})
                </span>
              ) : (
                <span className="text-[10px] bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {destination?.destination_type === 'upi' ? (
                <>
                  UPI VPA: <strong className="text-slate-800 font-mono">{destination.upi_id}</strong>
                </>
              ) : destination ? (
                <>
                  Bank: <strong className="text-slate-800">{destination.bank_name}</strong> (A/C: {destination.account_number_masked})
                </>
              ) : (
                'Add your verified UPI ID or Bank account so buyers can pay directly into your account.'
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDestModal(true)}
          className="text-xs font-bold text-forest-700 hover:text-forest-800 underline self-start md:self-auto"
        >
          {destination ? 'Update Details' : 'Configure Now →'}
        </button>
      </div>

      {/* Grid: Produce Listings with Moderation Badges */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-forest-600" />
              <span>My Agricultural Produce Listings ({products.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin-approved items are publicly visible to buyers. Unapproved items remain strictly private.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="self-start sm:self-auto px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Add Produce
          </button>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <Sprout className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">You haven't listed any farm produce yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-forest-600 text-white text-xs font-bold rounded-xl"
            >
              List First Harvest
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-slate-200 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Store className="w-10 h-10" />
                      </div>
                    )}

                    {/* Moderation Status Pill */}
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className={`text-[11px] font-extrabold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 ${
                          p.approval_status === 'Approved'
                            ? 'bg-emerald-600 text-white'
                            : p.approval_status === 'Rejected'
                            ? 'bg-red-600 text-white'
                            : p.approval_status === 'Suspended'
                            ? 'bg-slate-800 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {p.approval_status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                        {p.approval_status === 'Rejected' && <XCircle className="w-3 h-3" />}
                        {p.approval_status === 'Pending Review' && <Clock className="w-3 h-3" />}
                        <span>{p.approval_status}</span>
                      </span>
                    </div>

                    {/* GPS Tag */}
                    {p.location_evidence && (
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="text-[10px] bg-slate-900/80 backdrop-blur-md text-white font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-harvest-300" />
                          <span>
                            {p.location_evidence.source === 'exif'
                              ? 'EXIF GPS Embedded'
                              : p.location_evidence.source === 'browser_device'
                              ? 'Device Geolocation'
                              : 'Location Declared'}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                      <span className="text-xs font-extrabold text-forest-700 whitespace-nowrap">
                        ₹{p.price_per_unit}/{p.unit}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>

                    <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                      <div>
                        Available: <strong>{p.available_quantity} {p.unit}</strong> • Quality: <strong>{p.crop_quality}</strong>
                      </div>
                      <div>
                        Harvest Date: <strong>{p.harvest_date}</strong>
                      </div>
                    </div>

                    {/* Rejection notice if present */}
                    {p.rejection_reason && (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] space-y-1">
                        <span className="font-bold flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-600" /> Admin Feedback:
                        </span>
                        <p>{p.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Status: <strong className="text-slate-700">{p.is_approved ? 'Public on Market' : 'Private'}</strong>
                  </span>
                  <Link
                    to="/marketplace"
                    className="text-forest-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming Orders & Fulfillment Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-forest-600" />
              <span>Incoming Buyer Orders ({orders.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified customer delivery addresses and payment references for direct dispatch.
            </p>
          </div>
          <Link to="/orders" className="text-xs font-bold text-forest-700 hover:underline">
            All Orders →
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No orders received yet. Active listings will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Buyer</th>
                  <th className="py-3 px-4">Delivery Address</th>
                  <th className="py-3 px-4">Items Ordered</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{o.order_number}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{o.buyer_name}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{o.shipping_address}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {o.items?.map((i) => `${i.product_name} (${i.quantity})`).join(', ')}
                    </td>
                    <td className="py-3 px-4 font-bold text-forest-700">₹{o.total_amount?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          o.payment?.payment_status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.payment?.payment_status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Personalized Crop Selling Suggestions & Market Trends */}
      {suggestions && (
        <div className="bg-gradient-to-r from-forest-900 to-forest-800 text-white rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-forest-700/60 pb-3">
            <div>
              <span className="text-[10px] font-bold text-harvest-300 uppercase tracking-wider block">
                Agri-Market Intelligence ({suggestions.district} APMC)
              </span>
              <h2 className="text-xl font-extrabold mt-0.5 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-harvest-300" />
                <span>Recommended Mandi Selling Prices & Demand</span>
              </h2>
            </div>
            <span className="text-xs text-forest-200">
              {suggestions.data_source}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.market_benchmarks?.slice(0, 6).map((b, idx) => (
              <div key={idx} className="bg-white/10 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{b.crop}</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      b.demand_level === 'Very High'
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-harvest-300 text-slate-950'
                    }`}
                  >
                    {b.demand_level} Demand
                  </span>
                </div>
                <div className="text-xs text-forest-200">
                  Mandi Benchmark: <strong className="text-white">₹{b.modal_mandi_price}/{b.unit}</strong> ({b.mandi_price_range})
                </div>
                <div className="text-xs bg-harvest-400/20 border border-harvest-400/30 text-harvest-300 p-2 rounded-xl">
                  Recommended Direct Price: <strong className="text-white font-bold">₹{b.recommended_direct_price}/{b.unit}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: List Produce with GPS Evidence */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">List Produce with GPS Evidence</h3>
                <p className="text-xs text-slate-500">
                  Upload authentic media captured on your farm. EXIF coordinates will be extracted automatically.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {formMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {formMsg}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Produce Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Mandya Rice"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-forest-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-forest-500"
                  >
                    <option value="Vegetables">Vegetables</option>
                    <option value="Grains">Grains</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Pulses">Pulses</option>
                    <option value="Spices">Spices</option>
                    <option value="Oilseeds">Oilseeds</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="e.g. 50"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-forest-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unit *</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="kg">kg</option>
                    <option value="quintal">quintal</option>
                    <option value="crate">crate</option>
                    <option value="ton">ton</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Available Qty *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 200"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-forest-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quality Grade</label>
                  <select
                    value={formQuality}
                    onChange={(e) => setFormQuality(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="Grade A - Premium">Grade A - Premium</option>
                    <option value="Grade B - Standard">Grade B - Standard</option>
                    <option value="Organic Certified">Organic Certified</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harvest Date</label>
                  <input
                    type="date"
                    value={formHarvestDate}
                    onChange={(e) => setFormHarvestDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Delivery Options</label>
                <input
                  type="text"
                  value={formDelivery}
                  onChange={(e) => setFormDelivery(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  placeholder="e.g. Farm Pickup, Mandi Transport"
                />
              </div>

              {/* Media File Upload & GPS Extraction Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="font-bold text-slate-900 block flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-forest-600" /> Original Farm Photograph or Video
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  onChange={handleMediaUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-forest-600 file:text-white hover:file:bg-forest-700 cursor-pointer"
                />

                {uploadingMedia && (
                  <p className="text-xs text-forest-700 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading and inspecting EXIF GPS tags...
                  </p>
                )}

                {uploadedMedia && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-mono text-[11px]">
                        SHA-256 Hash: {uploadedMedia.media_hash?.slice(0, 16)}...
                      </span>
                    </div>

                    {uploadedMedia.exif_metadata?.has_embedded_gps ? (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <strong>Embedded EXIF GPS Verified:</strong>{' '}
                          {uploadedMedia.exif_metadata.latitude}°, {uploadedMedia.exif_metadata.longitude}°
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-2">
                        <div className="flex items-center gap-2 font-medium">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>No embedded EXIF GPS found in image metadata.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCaptureDeviceLocation}
                          disabled={capturingGps}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5"
                        >
                          {capturingGps ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                          Capture Device Geolocation
                        </button>
                        {browserCoords && (
                          <p className="text-[11px] text-slate-700">
                            Device coordinates captured: {browserCoords.latitude.toFixed(4)}°, {browserCoords.longitude.toFixed(4)}° (±{Math.round(browserCoords.accuracy)}m)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Naturally grown produce details..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="px-6 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-xl font-bold flex items-center gap-2"
                >
                  {submittingProduct && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Submit for Admin Approval</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Setup Payment Destination */}
      {showDestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Configure Farmer Payment Destination</h3>
                <p className="text-xs text-slate-500">
                  Provide your official UPI ID or Bank account for direct settlements.
                </p>
              </div>
              <button onClick={() => setShowDestModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveDestination} className="space-y-4 text-xs">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="destType"
                    checked={destType === 'upi'}
                    onChange={() => setDestType('upi')}
                  />
                  <span>UPI Payment (Recommended)</span>
                </label>
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="destType"
                    checked={destType === 'bank_account'}
                    onChange={() => setDestType('bank_account')}
                  />
                  <span>Bank Account</span>
                </label>
              </div>

              {destType === 'upi' ? (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Farmer UPI ID (VPA) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ramesh.gowda@okaxis"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Direct-to-farmer QR will be generated using this official VPA.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Account Number *</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter Bank Account Number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">IFSC Code (11 Chars) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SBIN0001234"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  required
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDestModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDest}
                  className="px-6 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-xl font-bold"
                >
                  {savingDest ? 'Saving...' : 'Save & Submit for KYC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live WebRTC Video Call Modal */}
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
