import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  Smartphone,
  ShoppingBag,
  Loader2,
  QrCode,
  BadgeCheck
} from 'lucide-react';

// Dynamically load Razorpay Checkout.js SDK
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();

  const deliveryInfo = JSON.parse(
    sessionStorage.getItem('esykrushi_checkout_delivery') ||
      '{"address": "APMC Yard, Bangalore", "phone": "+91 9845012345"}'
  );

  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [razorpayReady, setRazorpayReady] = useState(false);

  // Pre-load Razorpay SDK on mount
  useEffect(() => {
    loadRazorpayScript().then((loaded) => setRazorpayReady(loaded));
  }, []);

  const handleCheckoutAndPay = useCallback(async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    setErrorMessage(null);

    try {
      // Step 1: Create order server-side, receive Razorpay gateway_order_id
      const orderPayload = {
        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        shipping_address: deliveryInfo.address,
        contact_phone: deliveryInfo.phone,
        payment_method: paymentMethod,
      };

      const orderRes = await orderService.createOrder(orderPayload);
      if (!orderRes.success) throw new Error(orderRes.message || 'Order creation failed');

      const orderData = orderRes.data.order;
      const paymentInit = orderRes.data.payment_init;

      // Detect demo/simulation mode by checking the key_id
      const isDemoMode =
        !paymentInit.key_id ||
        paymentInit.key_id === 'rzp_test_esykrushi_demo' ||
        paymentInit.key_id.includes('demo');

      if (isDemoMode) {
        // === DEMO MODE: Simulate payment for evaluation ===
        const verifyRes = await paymentService.verifyPayment({
          order_id: orderData.id,
          transaction_id: paymentInit.transaction_id,
          razorpay_payment_id: `pay_DEMO${Date.now()}`,
          razorpay_order_id: paymentInit.gateway_order_id,
          razorpay_signature: 'SIMULATED_VERIFIED_SIGNATURE',
        });

        if (!verifyRes.success) throw new Error(verifyRes.message || 'Demo payment verification failed');
        clearCart();
        setConfirmedOrder({
          orderNumber: orderData.order_number,
          transactionId: paymentInit.transaction_id,
          amount: orderData.total_amount,
          status: 'Confirmed (Demo Mode)',
          isDemoMode: true,
        });
        return;
      }

      // === LIVE MODE: Real Razorpay Checkout.js popup ===
      if (!razorpayReady || !window.Razorpay) {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error('Razorpay SDK failed to load. Check your internet connection.');
      }

      setProcessing(false); // Hand control to Razorpay dialog

      await new Promise((resolve, reject) => {
        const options = {
          key: paymentInit.key_id,
          amount: Math.round(orderData.total_amount * 100), // in paise
          currency: paymentInit.currency || 'INR',
          name: 'EsyKrushi Direct Marketplace',
          description: `Order ${orderData.order_number} — Direct Farm Purchase`,
          order_id: paymentInit.gateway_order_id,
          prefill: {
            contact: deliveryInfo.phone || '',
          },
          notes: { order_number: orderData.order_number },
          theme: { color: '#16a34a' },
          modal: {
            ondismiss: () => {
              setProcessing(false);
              setErrorMessage('Payment was cancelled. You can try again.');
              reject(new Error('cancelled'));
            },
          },
          handler: async (response) => {
            // Razorpay returns: razorpay_payment_id, razorpay_order_id, razorpay_signature
            try {
              setProcessing(true);
              const verifyRes = await paymentService.verifyPayment({
                order_id: orderData.id,
                transaction_id: paymentInit.transaction_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (!verifyRes.success)
                throw new Error(verifyRes.message || 'Server-side HMAC signature verification failed');

              clearCart();
              setConfirmedOrder({
                orderNumber: orderData.order_number,
                transactionId: response.razorpay_payment_id,
                amount: orderData.total_amount,
                status: 'Confirmed',
                isDemoMode: false,
              });
              resolve();
            } catch (verifyErr) {
              reject(verifyErr);
            } finally {
              setProcessing(false);
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => {
          const errMsg = resp.error?.description || 'Payment failed at gateway. Please retry.';
          setErrorMessage(errMsg);
          setProcessing(false);
          reject(new Error(errMsg));
        });
        rzp.open();
      });
    } catch (err) {
      if (err.message !== 'cancelled') {
        setErrorMessage(err.message || 'Payment processing error. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  }, [cart, paymentMethod, deliveryInfo, razorpayReady, clearCart]);

  // ===== Order Confirmed Screen =====
  if (confirmedOrder) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900">Order Confirmed & Paid!</h2>
          <p className="text-xs text-slate-500">
            {confirmedOrder.isDemoMode
              ? 'Demo Mode: Transaction simulated for evaluation. No real charge occurred.'
              : 'Payment cryptographically verified by the server via HMAC-SHA256. Farmers notified.'}
          </p>

          {confirmedOrder.isDemoMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-[11px] text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span><b>Demo Mode:</b> Add your real Razorpay test key to <code className="bg-amber-100 px-1 rounded">.env</code> to enable the live checkout popup.</span>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Order Number:</span>
              <span className="font-bold text-slate-900">{confirmedOrder.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment ID:</span>
              <span className="font-mono font-bold text-slate-900 truncate max-w-[200px]">{confirmedOrder.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Paid:</span>
              <span className="font-extrabold text-forest-700">₹{confirmedOrder.amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5" />
                {confirmedOrder.status}
              </span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link to="/orders" className="flex-1 py-3 px-4 bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs rounded-xl shadow-xs transition text-center">
              View Order Tracking
            </Link>
            <Link to="/marketplace" className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition text-center">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== Checkout Form =====
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-forest-600" />
          <span>Secure Checkout — Powered by Razorpay</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Server-side HMAC-SHA256 cryptographic signature verification on every transaction.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Payment Method Selection */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <h3 className="font-bold text-sm text-slate-900">Select Payment Instrument</h3>

          <div className="space-y-3">
            {[
              { value: 'UPI', label: 'UPI (GPay, PhonePe, Paytm, BHIM)', sub: 'Instant transfer · Zero surcharge', icon: <Smartphone className="w-5 h-5 text-forest-600" /> },
              { value: 'Card', label: 'Debit / Credit Card (RuPay, Visa, Mastercard)', sub: '256-bit encrypted Razorpay gateway', icon: <CreditCard className="w-5 h-5 text-slate-600" /> },
              { value: 'NetBanking', label: 'Net Banking (SBI, HDFC, Canara, ICICI)', sub: 'All major Indian banks supported', icon: <Building className="w-5 h-5 text-slate-600" /> },
            ].map((method) => (
              <label
                key={method.value}
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                  paymentMethod === method.value
                    ? 'border-forest-600 bg-forest-50/50 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                    className="text-forest-600 focus:ring-forest-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{method.label}</span>
                    <span className="text-[11px] text-slate-500">{method.sub}</span>
                  </div>
                </div>
                {method.icon}
              </label>
            ))}
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-forest-600" />
              Razorpay PCI-DSS Secured
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-slate-600">
              <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
              HMAC-SHA256 Verified
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-slate-600">
              <QrCode className="w-3.5 h-3.5 text-slate-500" />
              UPI / Card / Net Banking
            </div>
          </div>

          {/* Integration Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <b>Live Razorpay:</b> Add your <code className="bg-amber-100 px-1 rounded">RAZORPAY_KEY_ID</code> and <code className="bg-amber-100 px-1 rounded">RAZORPAY_KEY_SECRET</code> to the backend <code>.env</code> file to activate the Razorpay payment popup. In demo mode, server-side simulation is used.
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Purchase Review</h3>

          {cart.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Your cart is empty
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-3 divide-y divide-slate-100 text-xs">
              {Object.entries(
                cart.reduce((acc, item) => {
                  const key = item.product.farmer_name || (item.product.seller ? item.product.seller.full_name : null) || 'Verified Farm Producer';
                  if (!acc[key]) acc[key] = { items: [], location: item.product.farm_location || 'Karnataka' };
                  acc[key].items.push(item);
                  return acc;
                }, {})
              ).map(([farmerName, group], idx) => (
                <div key={idx} className="pt-2.5 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-forest-800 bg-forest-50/60 px-2.5 py-1 rounded-lg border border-forest-100">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
                      Farmer: {farmerName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">{group.location}</span>
                  </div>

                  <div className="space-y-1.5 pl-1">
                    {group.items.map(({ product, quantity }) => (
                      <div key={product.id} className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-slate-800">{product.name}</span>
                          <span className="text-slate-400 block text-[10px]">
                            {quantity} {product.unit} × ₹{product.price_per_unit}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900">
                          ₹{(quantity * product.price_per_unit).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-500 pl-1 italic">
                    ↳ Direct payout routing to farmer's verified bank / UPI destination.
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Delivery Address</span>
              <span className="font-medium text-slate-900 text-right truncate max-w-[160px]">{deliveryInfo.address}</span>
            </div>
            <div className="flex justify-between">
              <span>Contact Phone</span>
              <span className="font-medium text-slate-900">{deliveryInfo.phone}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between text-base font-extrabold text-slate-900">
              <span>Total Payable</span>
              <span className="text-forest-700">₹{totalPrice.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            onClick={handleCheckoutAndPay}
            disabled={processing || cart.length === 0}
            className="w-full py-3.5 px-4 bg-forest-600 hover:bg-forest-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Pay ₹{totalPrice.toLocaleString('en-IN')} via Razorpay</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-slate-400 text-center">
            Secured by Razorpay. Server verifies every payment signature.
          </p>
        </div>
      </div>
    </div>
  );
}
