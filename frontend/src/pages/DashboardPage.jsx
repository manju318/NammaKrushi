import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { farmService } from '../services/farmService';
import { weatherService } from '../services/weatherService';
import {
  CloudSun,
  Sprout,
  CalendarDays,
  CreditCard,
  Boxes,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Droplets,
  Wind,
  CheckCircle2,
  Clock,
  AlertCircle
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

const COLORS = ['#2b7352', '#dfac0f', '#3a9067', '#c1860a', '#715444', '#8ec9ab'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [farmData, setFarmData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [expenses, setExpenses] = useState(null);
  const [inventory, setInventory] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [wRes, fRes, tRes, eRes, iRes] = await Promise.allSettled([
          weatherService.getCurrent(),
          farmService.getFarmDetails(),
          farmService.getTasks(),
          farmService.getExpenses(),
          farmService.getInventory(),
        ]);

        if (wRes.status === 'fulfilled' && wRes.value.success) setWeather(wRes.value.data);
        if (fRes.status === 'fulfilled' && fRes.value.success) setFarmData(fRes.value.data);
        if (tRes.status === 'fulfilled' && tRes.value.success) setTasks(tRes.value.data.tasks || []);
        if (eRes.status === 'fulfilled' && eRes.value.success) setExpenses(eRes.value.data);
        if (iRes.status === 'fulfilled' && iRes.value.success) setInventory(iRes.value.data);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const crops = farmData?.farms?.[0]?.crops || [];
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const lowStockCount = inventory?.low_stock_items_count || 0;
  const totalSpent = expenses?.total_spent || 0;

  // AI Insight Synthesis based on weather
  const getAIInsight = () => {
    if (!weather) return "Loading farm agro-meteorological insight...";
    if (weather.rain_probability > 30) {
      return `Precipitation probability is elevated (${weather.rain_probability}%) in ${weather.location?.split(',')[0]}. Postpone foliar nutrient sprays and open field irrigation for your standing plots.`;
    }
    return `Optimal clear weather conditions (${Math.round(weather.temperature)}°C, ${Math.round(weather.humidity)}% humidity) for field cultivation, tractor tillage, and produce drying.`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-forest-800 via-forest-700 to-forest-900 text-white p-6 sm:p-8 shadow-xl shadow-forest-900/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-forest-600/50 backdrop-blur-xs text-forest-200 text-xs font-semibold mb-3 border border-forest-500/30">
              <Sprout className="w-3.5 h-3.5 text-harvest-400" />
              <span>{farmData?.profile?.district || 'Karnataka'}, India • Season: Kharif</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Farmer'} 👋
            </h1>
            <p className="mt-2 text-forest-100 text-sm leading-relaxed">
              Your farm operations are performing steadily. Review your weather conditions, scheduled crop tasks, and market demands below.
            </p>
          </div>

          {/* Live Mini Weather Summary in Hero */}
          {weather && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 flex items-center gap-4 min-w-[240px]">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-harvest-300">
                <CloudSun className="w-8 h-8" />
              </div>
              <div>
                <div className="text-3xl font-extrabold leading-none">{Math.round(weather.temperature)}°C</div>
                <div className="text-xs text-forest-200 mt-1 capitalize font-medium">{weather.condition}</div>
                <div className="text-[11px] text-forest-300 mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3" /> {weather.humidity}%</span>
                  <span>•</span>
                  <span>Rain: {weather.rain_probability}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Decorative background leaf illustration glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-forest-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* AI Farm Insight Banner */}
      <div className="rounded-2xl bg-harvest-50 border border-harvest-200 p-4 sm:p-5 flex items-start space-x-3.5 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-harvest-400/20 text-harvest-800 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5 text-harvest-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-harvest-900">
              AI Agricultural Insight
            </h2>
            <Link to="/assistant" className="text-xs font-semibold text-harvest-800 hover:underline flex items-center">
              Consult Advisor <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
          <p className="mt-1 text-sm text-harvest-950 font-medium leading-relaxed">
            {getAIInsight()}
          </p>
        </div>
      </div>

      {/* Farm Overview Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Active Crops</span>
            <div className="w-8 h-8 rounded-lg bg-forest-50 text-forest-600 flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{crops.length}</div>
          <div className="text-[11px] text-forest-700 mt-1 font-medium truncate">
            {crops.map(c => c.crop_name).join(', ') || 'No active crops'}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Upcoming Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{pendingTasks.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Pending execution</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">₹{totalSpent.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Recorded this season</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Inventory Alert</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{lowStockCount}</div>
          <div className={`text-[11px] mt-1 font-medium ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>
            {lowStockCount > 0 ? 'Items below threshold' : 'Stock levels normal'}
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Marketplace</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">Active</div>
          <div className="text-[11px] text-forest-700 mt-1 font-medium">Direct B2B Orders Open</div>
        </div>
      </div>

      {/* Middle Grid: Active Crop Progress & Upcoming Tasks */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Crops Stage Tracker */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sprout className="w-5 h-5 text-forest-600" />
              <span>Current Crop Plots</span>
            </h3>
            <Link to="/crop-planner" className="text-xs font-semibold text-forest-600 hover:underline">
              Plan New Crop →
            </Link>
          </div>

          <div className="space-y-4">
            {crops.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No active crops registered yet. Run Crop Recommendation to plan your first plot.
              </div>
            ) : (
              crops.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{c.crop_name}</span>
                      <span className="text-xs text-slate-500 ml-2">({c.variety || 'Hybrid'})</span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-forest-100 text-forest-800">
                      {c.acreage} Acres
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Stage: <b className="text-forest-700 font-semibold">{c.current_stage}</b></span>
                    <span>Sown: {c.sowing_date}</span>
                  </div>

                  {/* Visual Progress Bar based on stage */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mt-1">
                    <div
                      className="bg-forest-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width:
                          c.current_stage.includes('Sowing') ? '15%' :
                          c.current_stage.includes('Vegetative') ? '40%' :
                          c.current_stage.includes('Flowering') ? '70%' :
                          c.current_stage.includes('Harvest') ? '95%' : '50%'
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority Scheduled Tasks */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-forest-600" />
              <span>Upcoming Tasks</span>
            </h3>
            <Link to="/calendar" className="text-xs font-semibold text-forest-600 hover:underline">
              View Calendar →
            </Link>
          </div>

          <div className="space-y-3">
            {pendingTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                All scheduled tasks completed! Great job.
              </div>
            ) : (
              pendingTasks.slice(0, 4).map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 truncate pr-2">{t.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      t.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                      t.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="text-slate-500 flex items-center justify-between">
                    <span>{t.category}</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" /> Due {t.due_date}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Expenses by Category (Pie Chart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">Expenses by Category</h3>
          <div className="h-64">
            {expenses?.category_breakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenses.category_breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenses.category_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No expense data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Monthly Spending Trend (Bar Chart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">Monthly Expenditure Trend</h3>
          <div className="h-64">
            {expenses?.monthly_trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenses.monthly_trend}>
                  <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip formatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                  <Bar dataKey="amount" fill="#2b7352" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Log expenses to see monthly expenditure trends.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
