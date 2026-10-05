import React, { useState, useEffect } from 'react';
import { orderService } from '../services/orderService';
import { useAuth } from '../contexts/AuthContext';
import {
  ShoppingBag,
  PackageCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  MapPin,
  ExternalLink
} from 'lucide-react';

export default function OrdersPage() {
  const { user, isFarmer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await orderService.getOrders();
        if (res.success) {
          setOrders(res.data.orders || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <ShoppingBag className="w-7 h-7 text-forest-600" />
          <span>{isFarmer ? "Received Customer Orders" : "My Order History & Tracking"}</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {isFarmer
            ? "Fulfill and track customer wholesale purchase orders for your harvested produce."
            : "Review real-time dispatch progress, delivery destinations, and payment confirmations."}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-slate-500">Loading order history...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-xs">
          <PackageCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No orders recorded yet</h3>
          <p className="text-xs text-slate-500 mt-1">Orders placed on the marketplace will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isConfirmed = order.order_status === 'Confirmed';
            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm block">
                      {order.order_number}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Placed on: {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full ${
                      isConfirmed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isConfirmed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{order.order_status}</span>
                    </span>

                    <span className="font-extrabold text-forest-700 text-sm">
                      ₹{order.total_amount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Items and Delivery */}
                <div className="p-5 grid md:grid-cols-12 gap-6 text-xs">
                  <div className="md:col-span-8 space-y-3">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                      Procured Produce Items
                    </span>
                    <div className="divide-y divide-slate-100">
                      {order.items?.map((item) => (
                        <div key={item.id} className="py-2 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900">{item.product_name}</span>
                            <span className="text-slate-400 block text-[11px]">
                              Qty: {item.quantity} × ₹{item.unit_price}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-800">
                            ₹{item.subtotal?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery & Payment Badges */}
                  <div className="md:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                      Dispatch Details
                    </span>
                    <div className="flex items-start gap-1.5 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{order.shipping_address}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Phone: <span className="font-semibold text-slate-800">{order.contact_phone}</span>
                    </div>

                    {order.payment && (
                      <div className="pt-2 border-t border-slate-200/60 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Payment Mode:</span>
                          <span className="font-bold text-slate-800">{order.payment.payment_method}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Txn Ref:</span>
                          <span className="font-mono text-slate-700">{order.payment.transaction_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Status:</span>
                          <span className="font-bold text-emerald-700">Verified ({order.payment.payment_status})</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
