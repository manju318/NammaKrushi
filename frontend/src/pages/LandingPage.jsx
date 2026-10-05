import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  Store,
  CloudSun,
  ShieldCheck,
  Bot,
  FileText,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  Users
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-forest-600 flex items-center justify-center text-white shadow-md shadow-forest-600/30">
              <Sprout className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-forest-900">
              ESY<span className="text-forest-600">KRUSHI</span>
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-forest-600 transition">Features</a>
            <a href="#how-it-works" className="hover:text-forest-600 transition">How It Works</a>
            <a href="#marketplace" className="hover:text-forest-600 transition">Marketplace</a>
            <a href="#ml-model" className="hover:text-forest-600 transition">AI Technology</a>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-forest-600 px-3 py-2 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-white bg-forest-600 hover:bg-forest-700 px-4 py-2 rounded-xl shadow-md shadow-forest-600/25 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-gradient-to-b from-forest-50/60 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-forest-100/80 border border-forest-200 text-forest-800 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-4 h-4 text-forest-600" />
            <span>AI-Driven AgriTech SaaS Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight sm:leading-tight">
            Smart Farming. Better Decisions.{' '}
            <span className="text-forest-600 underline decoration-harvest-400 decoration-wavy decoration-2">
              Better Markets.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            AI-powered crop planning, digital farm management, and a direct farmer-to-buyer marketplace — eliminating middlemen and maximizing farm profitability.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-xl text-white bg-forest-600 hover:bg-forest-700 shadow-lg shadow-forest-600/30 transition transform hover:-translate-y-0.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/marketplace"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-xl text-forest-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition"
            >
              <Store className="mr-2 w-5 h-5 text-forest-600" />
              <span>Explore Marketplace</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <div className="text-center border-r border-slate-100 last:border-r-0">
              <div className="text-2xl sm:text-3xl font-bold text-forest-700">99.5%</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Model Accuracy</div>
            </div>
            <div className="text-center border-r border-slate-100 last:border-r-0">
              <div className="text-2xl sm:text-3xl font-bold text-forest-700">22 Crops</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Multi-Class ML Scope</div>
            </div>
            <div className="text-center border-r border-slate-100 last:border-r-0">
              <div className="text-2xl sm:text-3xl font-bold text-forest-700">0%</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Intermediary Commission</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-forest-700">100%</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Verified Seller KYC</div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars Section */}
      <section id="features" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-forest-600 uppercase tracking-widest">Why EsyKrushi?</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900">
              End-to-End Precision Agriculture Platform
            </p>
            <p className="mt-4 text-slate-600">
              Bridging scientific soil diagnostics with equitable digital direct trade.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-600 flex items-center justify-center mb-4">
                <Sprout className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Crop Recommendation</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Trained Random Forest Classifier evaluates NPK, pH, and live weather conditions to predict the top 3 optimal crops with probabilistic confidence and agronomic reasoning.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-harvest-100 text-harvest-700 flex items-center justify-center mb-4">
                <CloudSun className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Live Weather & Advisories</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                7-day precipitation probabilities, wind speed, and evapotranspiration data automatically adjust irrigation schedules to protect investments from climate shocks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-600 flex items-center justify-center mb-4">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Direct Farmer Marketplace</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Sell harvest directly to verified wholesalers and retailers. Eliminate middleman commissions and receive secure payments with server-side validation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-600 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Contextual AI Assistant</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Grounded conversational advisor that injects current farm climate, crop stage, and soil parameters into every answer with RAG citations from extension manuals.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-600 flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Farm Lifecycle Suite</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Manage crop stages, schedule priority tasks on a dynamic calendar, maintain digital timeline journals, and track inventory with low-stock warnings.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-harvest-100 text-harvest-700 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Seasonal AI PDF Reports</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Automated end-of-season analytics evaluating expenses, task completions, and pest incidents, downloadable as professional ReportLab PDF reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-forest-600 uppercase tracking-widest">User Journey</h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">How EsyKrushi Works</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-forest-600 text-white font-bold flex items-center justify-center mx-auto mb-4 text-sm">1</div>
              <h4 className="font-bold text-slate-900 text-base mb-2">Soil & Location Input</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Enter soil test values or auto-fetch regional climate and rainfall forecasts.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-forest-600 text-white font-bold flex items-center justify-center mx-auto mb-4 text-sm">2</div>
              <h4 className="font-bold text-slate-900 text-base mb-2">ML Crop Ranking</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Random Forest classifier outputs top 3 suitable crops with explainable rationale.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-forest-600 text-white font-bold flex items-center justify-center mx-auto mb-4 text-sm">3</div>
              <h4 className="font-bold text-slate-900 text-base mb-2">Farm Management</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Track growth stages, log field journals, manage expenses, and consult AI advisor.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-forest-600 text-white font-bold flex items-center justify-center mx-auto mb-4 text-sm">4</div>
              <h4 className="font-bold text-slate-900 text-base mb-2">Direct Trade & Payout</h4>
              <p className="text-xs text-slate-600 leading-relaxed">List harvest in direct marketplace, get verified seller badge, and fulfill orders.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-600 flex items-center justify-center text-white">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              ESY<span className="text-forest-400">KRUSHI</span>
            </span>
          </div>

          <p className="text-xs text-center md:text-left text-slate-500">
            ESYKRUSHI: AI-Powered Farm Management & Direct Marketplace Platform.  
            Final Year Engineering Capstone Project. VTU / Academic Specification Compliant.
          </p>

          <div className="flex items-center space-x-4 text-xs">
            <Link to="/login" className="hover:text-white transition">Sign In</Link>
            <Link to="/register" className="hover:text-white transition">Register</Link>
            <Link to="/marketplace" className="hover:text-white transition">Marketplace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
