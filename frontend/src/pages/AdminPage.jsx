import React, { useState, useEffect } from 'react';
import { adminService } from '../services/aiService';
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  XCircle,
  BarChart3,
  Store,
  CreditCard,
  Sprout,
  AlertTriangle,
  FileCheck,
  ShoppingBag
} from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [mlMetrics, setMlMetrics] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sellers');

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, sellerRes, userRes] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getSellers(),
        adminService.getUsers(),
      ]);

      if (dashRes.success) {
        setStats(dashRes.data.stats);
        setMlMetrics(dashRes.data.ml_metrics);
      }
      if (sellerRes.success) setSellers(sellerRes.data.sellers || []);
      if (userRes.success) setUsers(userRes.data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerifySeller = async (sellerId, status) => {
    try {
      const res = await adminService.verifySeller(
        sellerId,
        status,
        status === 'Verified' ? 'Approved by Admin Review' : 'Rejected due to incomplete land RTC records'
      );
      if (res.success) {
        setSellers((prev) =>
          prev.map((s) => (s.id === sellerId ? { ...s, verification_status: status } : s))
        );
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-forest-600" />
          <span>Admin Moderation & ML Governance Portal</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review seller verification KYC, inspect live Random Forest model metrics, and monitor platform transaction volumes.
        </p>
      </div>

      {/* Admin KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Registered Users</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total_users}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {stats.farmers_count} Farmers • {stats.buyers_count} Buyers
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Verified Sellers</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.verified_sellers_count}</div>
            <div className="text-[11px] text-amber-600 mt-0.5 font-medium">
              {stats.pending_verifications} Applications Pending
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Active Listings</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.active_products}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Direct Farm Products</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Platform Volume (Paid)</span>
            <div className="text-2xl font-bold text-forest-700 mt-1">
              ₹{stats.platform_volume_rs?.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{stats.total_orders} Total Orders</div>
          </div>
        </div>
      )}

      {/* ML Model Performance & Viva Demonstration Card */}
      {mlMetrics && (
        <div className="bg-gradient-to-r from-forest-800 to-forest-900 rounded-3xl text-white p-6 sm:p-7 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-forest-700/60">
            <div>
              <span className="text-[11px] font-bold text-harvest-300 uppercase tracking-wider block">
                Academic ML Model Performance Audit
              </span>
              <h2 className="text-xl font-extrabold mt-0.5">
                {mlMetrics.model_type} ({mlMetrics.n_estimators} Trees)
              </h2>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
              Real Test Accuracy: {mlMetrics.accuracy}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/10 p-3 rounded-2xl">
              <span className="text-forest-200 text-[11px]">Weighted Precision</span>
              <div className="text-lg font-bold">{mlMetrics.precision}%</div>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl">
              <span className="text-forest-200 text-[11px]">Weighted Recall</span>
              <div className="text-lg font-bold">{mlMetrics.recall}%</div>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl">
              <span className="text-forest-200 text-[11px]">F1-Score</span>
              <div className="text-lg font-bold">{mlMetrics.f1_score}%</div>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl">
              <span className="text-forest-200 text-[11px]">Test / Train Samples</span>
              <div className="text-lg font-bold">{mlMetrics.test_samples} / {mlMetrics.train_samples}</div>
            </div>
          </div>

          {/* Feature Importance MDI */}
          {mlMetrics.feature_importance && (
            <div className="pt-2">
              <span className="text-[11px] font-bold text-forest-200 uppercase tracking-wider block mb-2">
                Relative Feature Importance (Mean Decrease in Impurity - MDI)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-center text-xs">
                {Object.entries(mlMetrics.feature_importance).map(([feat, imp]) => (
                  <div key={feat} className="bg-white/10 p-2 rounded-xl border border-white/10">
                    <span className="text-forest-200 uppercase text-[10px] font-bold block">{feat}</span>
                    <span className="font-extrabold text-sm">{Math.round(imp * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('sellers')}
          className={`pb-3 transition ${
            activeTab === 'sellers'
              ? 'border-b-2 border-forest-600 text-forest-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Verified Seller KYC Applications ({sellers.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 transition ${
            activeTab === 'users'
              ? 'border-b-2 border-forest-600 text-forest-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All Users Directory ({users.length})
        </button>
      </div>

      {/* Tab 1: Seller Verification */}
      {activeTab === 'sellers' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Seller Verification & KYC Queue</h3>
            <span className="text-xs text-slate-400">Award 'Verified Seller' Badge to protect marketplace buyers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Farmer Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Proof Type</th>
                  <th className="py-3 px-4">Document / Proof #</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900">
                      {s.farmer_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{s.farmer_email}</td>
                    <td className="py-3.5 px-4 text-slate-700">{s.id_proof_type}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                      {s.id_proof_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.verification_status === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.verification_status === 'Rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.verification_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {s.verification_status !== 'Verified' && (
                        <button
                          onClick={() => handleVerifySeller(s.id, 'Verified')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-2xs"
                        >
                          Approve KYC
                        </button>
                      )}
                      {s.verification_status !== 'Rejected' && (
                        <button
                          onClick={() => handleVerifySeller(s.id, 'Rejected')}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow-2xs"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 sm:px-6">User ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 sm:px-6 font-mono text-slate-500">#{u.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{u.full_name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-700 font-semibold">Active</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
