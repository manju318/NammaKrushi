import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { weatherService } from '../services/weatherService';
import { farmService } from '../services/farmService';
import {
  Sprout,
  LayoutDashboard,
  CloudSun,
  CalendarDays,
  BookOpen,
  Boxes,
  PieChart,
  Bot,
  Store,
  ShoppingBag,
  FileText,
  ShieldCheck,
  Settings,
  Bell,
  ShoppingCart,
  Menu,
  X,
  LogOut,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Award
} from 'lucide-react';

export default function MainLayout() {
  const { user, logout, isFarmer, isAdmin, isVerifiedSeller } = useAuth();
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [liveWeather, setLiveWeather] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Fetch live weather mini chip
    const fetchWeather = async () => {
      try {
        const res = await weatherService.getCurrent();
        if (res.success) setLiveWeather(res.data);
      } catch (e) {
        console.error("Live weather badge error:", e);
      }
    };
    fetchWeather();

    // Fetch notifications if logged in
    const fetchNotifs = async () => {
      if (user) {
        try {
          const res = await farmService.getNotifications();
          if (res.success) setNotifications(res.data.notifications || []);
        } catch (e) {
          console.error("Notifications fetch error:", e);
        }
      }
    };
    fetchNotifs();
  }, [user]);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Crop Planner & ML', path: '/crop-planner', icon: Sprout },
    { label: 'Weather Forecast', path: '/weather', icon: CloudSun },
    { label: 'Farm Calendar', path: '/calendar', icon: CalendarDays },
    { label: 'Farm Journal', path: '/journal', icon: BookOpen },
    { label: 'Inventory', path: '/inventory', icon: Boxes },
    { label: 'Expenses', path: '/expenses', icon: PieChart },
    { label: 'AI Assistant', path: '/assistant', icon: Bot },
    { label: 'Marketplace', path: '/marketplace', icon: Store },
    { label: 'Orders', path: '/orders', icon: ShoppingBag },
    { label: 'Seasonal Reports', path: '/reports', icon: FileText },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Admin Portal', path: '/admin', icon: ShieldCheck });
  }

  navItems.push({ label: 'Settings', path: '/settings', icon: Settings });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await farmService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Brand & Mobile Toggle */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link to="/dashboard" className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-forest-600 flex items-center justify-center text-white shadow-md shadow-forest-600/30">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-forest-900 block leading-tight">
                  ESY<span className="text-forest-600">KRUSHI</span>
                </span>
                <span className="text-[10px] font-medium tracking-wide text-forest-700/80 uppercase block">
                  AI Farm & Marketplace
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header Badges */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Live Weather Widget Chip */}
            {liveWeather && (
              <Link
                to="/weather"
                className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-medium hover:bg-forest-100 transition shadow-sm"
              >
                <CloudSun className="w-4 h-4 text-forest-600" />
                <span>{liveWeather.location?.split(',')[0]}</span>
                <span className="font-semibold">{Math.round(liveWeather.temperature)}°C</span>
                <span className="text-slate-400">|</span>
                <span className="text-forest-700">{liveWeather.condition}</span>
              </Link>
            )}

            {/* Marketplace Cart Button */}
            <Link
              to="/cart"
              className="relative p-2 rounded-full text-slate-600 hover:text-forest-700 hover:bg-slate-100 transition"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-harvest-500 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 rounded-full text-slate-600 hover:text-forest-700 hover:bg-slate-100 transition"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                    <span className="font-semibold text-sm text-slate-800">Alerts & Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-forest-600 hover:text-forest-700 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No new notifications</p>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div key={n.id} className={`p-3 text-xs hover:bg-slate-50 transition ${!n.is_read ? 'bg-forest-50/50' : ''}`}>
                          <div className="flex items-start justify-between">
                            <span className="font-semibold text-slate-800">{n.title}</span>
                            <span className="text-[10px] text-slate-400">
                              {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="pt-2 px-4 border-t border-slate-100 text-center">
                    <button
                      onClick={() => { setNotifDropdownOpen(false); navigate('/calendar'); }}
                      className="text-xs text-forest-600 font-medium hover:underline"
                    >
                      View Farm Tasks & Calendar →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-slate-100 transition"
              >
                <div className="w-8 h-8 rounded-full bg-forest-600 text-white flex items-center justify-center font-bold text-xs">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:block text-left text-xs pr-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    {user?.full_name?.split(' ')[0]}
                    {isVerifiedSeller && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-forest-600 inline" title="Verified Seller" />
                    )}
                  </div>
                  <div className="text-slate-400 capitalize">{user?.role || 'Guest'}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-800">{user?.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    {isVerifiedSeller && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 font-medium border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Seller
                      </span>
                    )}
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Profile & Verification</span>
                  </Link>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Outlet */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col justify-between`}
        >
          <div className="p-4 space-y-1 overflow-y-auto">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Farm Management
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-forest-600 text-white shadow-sm shadow-forest-600/20'
                      : 'text-slate-600 hover:text-forest-700 hover:bg-forest-50/70'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-forest-600'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Sidebar Footer Badge */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/70">
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-xs">
              <div className="flex items-center space-x-2 text-forest-800 font-semibold mb-1">
                <Award className="w-4 h-4 text-harvest-500" />
                <span>Final Year Project</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                AI/ML Crop Engine • PostgreSQL • RAG Assistant • Direct APMC Marketplace
              </p>
            </div>
          </div>
        </aside>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
