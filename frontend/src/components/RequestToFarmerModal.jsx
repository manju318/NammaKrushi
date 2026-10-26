import React, { useState, useEffect } from 'react';
import { requestService } from '../services/requestService';
import { mandiService } from '../services/mandiService';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Send,
  X,
  MapPin,
  Building,
  DollarSign,
  Boxes,
  Phone,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sprout
} from 'lucide-react';

export default function RequestToFarmerModal({ product, onClose, onSuccess }) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [quantity, setQuantity] = useState('10');
  const [proposedPrice, setProposedPrice] = useState(product?.price_per_unit ? String(product.price_per_unit) : '');
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.buyer_profile?.delivery_address || 'APMC Yard, Yeshwanthpur, Bengaluru'
  );
  const [contactPhone, setContactPhone] = useState(user?.phone || '9876543210');
  const [selectedMandi, setSelectedMandi] = useState('Yeshwanthpur APMC Yard');
  const [customMandi, setCustomMandi] = useState('');
  const [buyerNotes, setBuyerNotes] = useState('');

  const [mandis, setMandis] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Load APMC Mandis
  useEffect(() => {
    const fetchMandis = async () => {
      try {
        const res = await mandiService.getMandis();
        if (res.success) {
          setMandis(res.data.mandis || []);
        }
      } catch (err) {
        console.error('Failed to load mandis:', err);
      }
    };
    fetchMandis();
  }, []);

  const numQty = parseFloat(quantity) || 0;
  const numPrice = parseFloat(proposedPrice) || 0;
  const totalAmount = Math.round(numQty * numPrice);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (numQty <= 0) {
      setErrorMsg(t('invalidQuantity', 'Please enter a valid positive quantity.'));
      return;
    }

    if (product?.available_quantity && numQty > product.available_quantity) {
      setErrorMsg(
        t('exceedsStock', `Requested quantity cannot exceed available stock (${product.available_quantity} ${product.unit}).`)
      );
      return;
    }

    if (numPrice <= 0) {
      setErrorMsg(t('invalidPrice', 'Proposed unit price must be greater than zero.'));
      return;
    }

    if (!deliveryAddress.trim()) {
      setErrorMsg(t('missingDelivery', 'Delivery destination address is required.'));
      return;
    }

    const chosenMandiName = selectedMandi === 'Other' ? customMandi : selectedMandi;
    const chosenMandiObj = mandis.find((m) => m.name === chosenMandiName);

    setSubmitting(true);
    try {
      const payload = {
        product_id: product.id,
        quantity: numQty,
        proposed_unit_price: numPrice,
        delivery_address: deliveryAddress.trim(),
        mandi_name: chosenMandiName || 'Farm Direct Pickup',
        mandi_address: chosenMandiObj?.address || deliveryAddress.trim(),
        mandi_district: chosenMandiObj?.district || product.seller_district || 'Bengaluru',
        buyer_phone: contactPhone.trim(),
        buyer_notes: buyerNotes.trim(),
      };

      const res = await requestService.createRequest(payload);
      if (res.success) {
        setSuccessMsg(t('requestSuccess', `Request ${res.data.request.request_number} sent to farmer ${product.seller_name}!`));
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data.request);
          if (onClose) onClose();
        }, 1500);
      }
    } catch (err) {
      setErrorMsg(err.message || t('requestFailed', 'Failed to submit purchase request. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-forest-50 text-forest-700 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {t('requestToFarmer', 'Request to Farmer')}
              </h2>
              <p className="text-xs text-slate-500">
                {t('directBargainSub', 'Direct negotiation with the authentic producer')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product & Seller Snapshot */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 flex items-center justify-center">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Sprout className="w-7 h-7 text-forest-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-sm text-slate-900 truncate">{product.name}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>🌾 <b>{product.seller_name || 'Authentic Farmer'}</b></span>
              {product.is_verified_seller && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
              <span>Mandi Base: <b>₹{product.price_per_unit}/{product.unit}</b></span>
              <span>Available: <b>{product.available_quantity} {product.unit}</b></span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Quantity & Proposed Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-forest-600" />
                <span>{t('requestedQuantity', 'Quantity')} ({product.unit}):</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                max={product.available_quantity || 10000}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-forest-600" />
                <span>{t('proposedUnitPrice', 'Proposed Unit Price')} (₹/{product.unit}):</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
            </div>
          </div>

          {/* Calculated Total Card */}
          <div className="p-3 bg-forest-50 border border-forest-100 rounded-2xl flex items-center justify-between">
            <span className="font-bold text-slate-700">{t('totalOfferValue', 'Total Offer Value')}:</span>
            <span className="text-base font-black text-forest-800">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>

          {/* Preferred Mandi / Market Yard */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-forest-600" />
              <span>{t('preferredMandi', 'Preferred APMC Mandi / Delivery Destination')}:</span>
            </label>
            <select
              value={selectedMandi}
              onChange={(e) => setSelectedMandi(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-forest-500"
            >
              {mandis.map((m) => (
                <option key={m.id} value={m.name}>
                  📍 {m.name} ({m.district}, {m.state})
                </option>
              ))}
              <option value="Direct Farm Pickup">🚜 Direct Farm Pickup (At Farmer's Declared Location)</option>
              <option value="Other">Custom Delivery Location...</option>
            </select>
          </div>

          {selectedMandi === 'Other' && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {t('customMandiName', 'Specify Mandi / Destination Yard Name')}:
              </label>
              <input
                type="text"
                required
                value={customMandi}
                onChange={(e) => setCustomMandi(e.target.value)}
                placeholder="e.g. APMC Sub-Yard, Hassan"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
            </div>
          )}

          {/* Delivery Address */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-forest-600" />
              <span>{t('deliveryAddress', 'Your Delivery / Unloading Address')}:</span>
            </label>
            <input
              type="text"
              required
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Shop/Warehouse address, Street, City, PIN"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-forest-600" />
              <span>{t('contactPhone', 'Buyer Verified Contact Phone')}:</span>
            </label>
            <input
              type="tel"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91 9845012345"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>

          {/* Notes / Special Instructions */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-forest-600" />
              <span>{t('notesToFarmer', 'Message / Packaging / Quality Notes for Farmer')}:</span>
            </label>
            <textarea
              rows={2}
              value={buyerNotes}
              onChange={(e) => setBuyerNotes(e.target.value)}
              placeholder="e.g. Need harvest graded and packed in 25kg crates. Can pick up directly on Thursday."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold shadow-md flex items-center gap-2 transition disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('submitting', 'Sending Request...')}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t('sendRequest', 'Send Request to Farmer')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
