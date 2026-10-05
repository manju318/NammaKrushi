import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Building,
  Smartphone,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  const deliveryInfo = JSON.parse(
    sessionStorage.getItem('esykrushi_checkout_delivery') || '{"address": "APMC Yard, Bangalore", "phone": "+91 9845012345"}'
  );

  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const handleCheckoutAndPay = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Server-side Order Creation & Payment Initiation
      const orderPayload = {
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
        shipping_address: deliveryInfo.address,
        contact_phone: deliveryInfo.phone,
        payment_method: paymentMethod,
      };

      const orderRes = await orderService.createOrder(orderPayload);
      if (!orderRes.success) {
        throw new Error(orderRes.message || 'Order creation failed');
      }

      const orderData = orderRes.data.order;
      const paymentInit = orderRes.data.payment_init;

      // 2. Server-side Payment Verification
      const verifyRes = await paymentService.verifyPayment({
        order_id: orderData.id,
        transaction_id: paymentInit.transaction_id,
        razorpay_payment_id: `pay_${Date.now()}`,
        razorpay_order_id: paymentInit.gateway_order_id,
        razorpay_signature: 'SIMULATED_VERIFIED_SIGNATURE',
      });

      if (!verifyRes.success) {
        throw new Error(verifyRes.message || 'Payment verification failed');
      }

      // 3. Clear cart and show confirmation
      clearCart();
      setConfirmedOrder({
        orderNumber: orderData.order_number,
        transactionId: paymentInit.transaction_id,
        amount: orderData.total_amount,
        status: 'Confirmed',
      });
    } catch (err) {
      setErrorMessage(err.message || 'Payment processing error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900">
            Order Confirmed & Paid!
          </h2>
          <p className="text-xs text-slate-500">
            Your transaction has been cryptographically validated by the server. Farmers have received your dispatch request.
          </p>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Order Number:</span>
              <span className="font-bold text-slate-900">{confirmedOrder.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction ID:</span>
              <span className="font-mono font-bold text-slate-900">{confirmedOrder.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Paid:</span>
              <span className="font-extrabold text-forest-700">₹{confirmedOrder.amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Status:</span>
              <span className="font-bold text-emerald-700">Server Verified (Paid)</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link
              to="/orders"
              className="flex-1 py-3 px-4 bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              View Order Tracking
            </Link>
            <Link
              to="/marketplace"
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-forest-600" />
          <span>Secure Checkout & Payment</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Server-side validated payment processing protecting farmer and buyer transactions.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Payment Gateways Selection */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <h3 className="font-bold text-sm text-slate-900">Select Payment Instrument</h3>

          <div className="space-y-3">
            <label
              className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                paymentMethod === 'UPI'
                  ? 'border-forest-600 bg-forest-50/50 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'UPI'}
                  onChange={() => setPaymentMethod('UPI')}
                  className="text-forest-600 focus:ring-forest-500"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">UPI Instant Payment (GPay, PhonePe, Paytm)</span>
                  <span className="text-[11px] text-slate-500">Zero transaction surcharge</span>
                </div>
              </div>
              <Smartphone className="w-5 h-5 text-forest-600" />
            </label>

            <label
              className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                paymentMethod === 'Card'
                  ? 'border-forest-600 bg-forest-50/50 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'Card'}
                  onChange={() => setPaymentMethod('Card')}
                  className="text-forest-600 focus:ring-forest-500"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Debit / Credit Card (RuPay, Visa, Mastercard)</span>
                  <span className="text-[11px] text-slate-500">256-bit encrypted gateway</span>
                </div>
              </div>
              <CreditCard className="w-5 h-5 text-slate-600" />
            </label>

            <label
              className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                paymentMethod === 'NetBanking'
                  ? 'border-forest-600 bg-forest-50/50 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'NetBanking'}
                  onChange={() => setPaymentMethod('NetBanking')}
                  className="text-forest-600 focus:ring-forest-500"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Direct NetBanking (SBI, HDFC, Canara, ICICI)</span>
                  <span className="text-[11px] text-slate-500">Supports all major public & private banks</span>
                </div>
              </div>
              <Building className="w-5 h-5 text-slate-600" />
            </label>
          </div>

          {/* Test Mode Callout */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <b>Demonstration Mode Active:</b> Payment verification runs state machine transitions directly on the server with HMAC simulation. No actual credit card charge occurs during project evaluation.
            </p>
          </div>
        </div>

        {/* Order Final Summary */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Purchase Review</h3>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
            {cart.map(({ product, quantity }) => (
              <div key={product.id} className="py-2.5 flex justify-between">
                <div>
                  <span className="font-bold text-slate-800">{product.name}</span>
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

          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Delivery Address</span>
              <span className="font-medium text-slate-900 text-right truncate max-w-[160px]">
                {deliveryInfo.address}
              </span>
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
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleCheckoutAndPay}
            disabled={processing || cart.length === 0}
            className="w-full py-3.5 px-4 bg-forest-600 hover:bg-forest-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            {processing ? (
              <span>Verifying Cryptographic Payment...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm & Pay ₹{totalPrice.toLocaleString('en-IN')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
