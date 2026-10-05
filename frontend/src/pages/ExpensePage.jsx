import React, { useState, useEffect } from 'react';
import { farmService } from '../services/farmService';
import {
  CreditCard,
  Plus,
  Trash2,
  X,
  PieChart as PieChartIcon,
  TrendingDown,
  Coins,
  Calendar
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#2b7352', '#dfac0f', '#3a9067', '#c1860a', '#715444', '#8ec9ab', '#e07a5f', '#3d405b'];

export default function ExpensePage() {
  const [expenses, setExpenses] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [catBreakdown, setCatBreakdown] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [category, setCategory] = useState('Seeds');
  const [amount, setAmount] = useState('2500');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [cropId, setCropId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [eRes, fRes] = await Promise.all([
        farmService.getExpenses(),
        farmService.getFarmDetails(),
      ]);
      if (eRes.success) {
        setExpenses(eRes.data.expenses || []);
        setTotalSpent(eRes.data.total_spent || 0);
        setCatBreakdown(eRes.data.category_breakdown || []);
        setMonthlyTrend(eRes.data.monthly_trend || []);
      }
      if (fRes.success && fRes.data.farms?.[0]) {
        setCrops(fRes.data.farms[0].crops || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        category,
        amount: parseFloat(amount) || 0,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        notes,
        crop_id: cropId ? parseInt(cropId) : null,
      };
      const res = await farmService.createExpense(payload);
      if (res.success) {
        setModalOpen(false);
        setNotes('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await farmService.deleteExpense(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Farm Financial & Expense Accounting
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Categorical expenditure audits, monthly cash flow tracking, and input cost diagnostics for seasonal budgeting.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white font-bold text-xs rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Log Farm Expense</span>
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Cumulative Expenditure</span>
          <div className="text-3xl font-black text-slate-900 mt-1">₹{totalSpent.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Recorded across all plots</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Top Cost Driver</span>
          <div className="text-xl font-bold text-forest-700 mt-1 truncate">
            {catBreakdown.length > 0
              ? [...catBreakdown].sort((a, b) => b.value - a.value)[0]?.name
              : 'None'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Highest expense category</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Entries Logged</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{expenses.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Audited financial transactions</span>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Breakdown (Pie) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-forest-600" />
            <span>Category Spending Distribution</span>
          </h3>
          <div className="h-64">
            {catBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {catBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No expense data available.
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend (Bar) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <Coins className="w-4 h-4 text-forest-600" />
            <span>Monthly Cash Outflow (₹)</span>
          </h3>
          <div className="h-64">
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                  <Bar dataKey="amount" fill="#2b7352" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Log expenditures to view monthly cash outflow.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Recent Expenditure Transactions</h3>
          <span className="text-xs text-slate-500 font-medium">{expenses.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Date</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Associated Crop</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Notes</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-700">
                    {e.expense_date}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {e.category}
                  </td>
                  <td className="py-3.5 px-4 text-forest-700 font-medium">
                    {e.crop_name}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {e.payment_method}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                    {e.notes || '-'}
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    ₹{e.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Log Farm Expense</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Seeds">Seeds</option>
                    <option value="Fertilizer">Fertilizer</option>
                    <option value="Labor">Labor</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Irrigation">Irrigation</option>
                    <option value="Transport">Transport</option>
                    <option value="Pesticides">Pesticides</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Amount (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Payment Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit">Credit / Loan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Associated Crop (Optional)</label>
                <select
                  value={cropId}
                  onChange={(e) => setCropId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">General Farm Operations</option>
                  {crops.map((c) => (
                    <option key={c.id} value={c.id}>{c.crop_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Notes / Payee</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 6 weeding workers, certified seed bag"
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
